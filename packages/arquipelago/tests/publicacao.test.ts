import { afterEach, beforeEach, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  arquivoDoCanal,
  PonteiroDoCanalSchema,
  pastaDaVersao,
  VERSAO_CONTRATO_PLATAFORMA,
} from '@sistemazero/arquipelago-contracts'
import {
  type BaldeDoCliente,
  enviarPublicacao,
  prepararPublicacao,
  promoverVersao,
} from '../scripts/publicacao'

/** A publicação separada (lacunas, 01/11/2026): versões imutáveis e canais que só apontam. */
let dist: string
let balde: Map<string, Uint8Array>
const memoria = (): BaldeDoCliente => ({
  async ler(chave) {
    return balde.get(chave) ?? null
  },
  async gravar(chave, bytes) {
    balde.set(chave, bytes)
  },
})
const ler = (nome: string) => readFile(join(dist, nome)).then((b) => new Uint8Array(b))

async function build(versao: string, entrada = 'conteudo da entrada') {
  await rm(dist, { recursive: true, force: true })
  await Bun.write(join(dist, 'entrada-abc.js'), entrada)
  await Bun.write(join(dist, 'parte-def.js'), 'parte')
  await Bun.write(join(dist, 'arquivo-123.glb'), new Uint8Array([1, 2, 3]))
  await Bun.write(
    join(dist, 'manifesto.json'),
    JSON.stringify({
      versao,
      entrada: 'entrada-abc.js',
      versaoContrato: VERSAO_CONTRATO_PLATAFORMA,
      geradoEm: '2026-11-01T10:00:00.000Z',
    }),
  )
}
beforeEach(async () => {
  dist = await mkdtemp(join(tmpdir(), 'sz-arquipelago-dist-'))
  balde = new Map()
})
afterEach(async () => {
  await rm(dist, { recursive: true, force: true })
})

test('enviar grava a versão inteira e o marcador por último; repetir não grava de novo', async () => {
  await build('2026110101')
  const plano = await prepararPublicacao(dist)
  expect(plano.arquivos.map((a) => a.nome)).toEqual([
    'arquivo-123.glb',
    'entrada-abc.js',
    'parte-def.js',
  ])
  const primeira = await enviarPublicacao(plano, ler, memoria())
  expect(primeira).toEqual({ versao: '2026110101', enviados: 3, jaEstavam: 0 })
  expect([...balde.keys()].at(-1)).toBe(`${pastaDaVersao('2026110101')}completa.json`)
  // Uma nova tentativa (depois de uma queda) continua sem regravar nada.
  expect(await enviarPublicacao(plano, ler, memoria())).toEqual({
    versao: '2026110101',
    enviados: 0,
    jaEstavam: 3,
  })
})

test('a versão é imutável: outro build com o mesmo nome é recusado', async () => {
  await build('2026110101')
  await enviarPublicacao(await prepararPublicacao(dist), ler, memoria())
  await build('2026110101', 'outra entrada')
  const outro = await prepararPublicacao(dist)
  await expect(enviarPublicacao(outro, ler, memoria())).rejects.toThrow('outros arquivos')
})

test('um arquivo que muda depois do plano e um arquivo fora da régua são recusados', async () => {
  await build('2026110102')
  const plano = await prepararPublicacao(dist)
  await writeFile(join(dist, 'parte-def.js'), 'mudou')
  await expect(enviarPublicacao(plano, ler, memoria())).rejects.toThrow('mudou depois do plano')
  await writeFile(join(dist, 'segredo.env'), 'x')
  await expect(prepararPublicacao(dist)).rejects.toThrow('fora da régua')
})

test('promover só aponta para versão completa; voltar é promover a anterior', async () => {
  await build('2026110101')
  await enviarPublicacao(await prepararPublicacao(dist), ler, memoria())
  await build('2026110102', 'nova')
  const plano2 = await prepararPublicacao(dist)
  await enviarPublicacao(plano2, ler, memoria())
  const agora = new Date('2026-11-01T12:00:00.000Z')
  const p2 = await promoverVersao(memoria(), 'estavel', '2026110102', agora)
  expect(p2).toMatchObject({ formato: 2, canal: 'estavel', versao: '2026110102' })
  const lido = PonteiroDoCanalSchema.parse(
    JSON.parse(new TextDecoder().decode(balde.get(arquivoDoCanal('estavel')))),
  )
  expect(lido.entrada).toBe('entrada-abc.js')
  // Voltar uma versão: o ponteiro aponta de novo para a anterior; as duas versões continuam lá.
  await promoverVersao(memoria(), 'estavel', '2026110101', agora)
  expect(
    PonteiroDoCanalSchema.parse(
      JSON.parse(new TextDecoder().decode(balde.get(arquivoDoCanal('estavel')))),
    ).versao,
  ).toBe('2026110101')
  // Sem o marcador (envio interrompido) ou com um arquivo trocado, não promove.
  balde.delete(`${pastaDaVersao('2026110102')}completa.json`)
  await expect(promoverVersao(memoria(), 'teste', '2026110102', agora)).rejects.toThrow(
    'não está completa',
  )
  balde.set(`${pastaDaVersao('2026110101')}parte-def.js`, new TextEncoder().encode('trocado'))
  await expect(promoverVersao(memoria(), 'teste', '2026110101', agora)).rejects.toThrow(
    'ausente ou diferente',
  )
})

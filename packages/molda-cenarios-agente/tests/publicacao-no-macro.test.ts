import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// O leitor de verdade do /macro e a publicação de teste do jogo: a pasta tem de servir a eles.
import { publicacoesDoEnsaio } from '../../arquipelago/playground/publicacoes-do-ensaio'
import { cenarioPublicadoParaTeste } from '../../arquipelago/tests/fixtures/cenario-publicado'
import { levarPublicacaoAoMacro } from '../src/oficina/publicacao-no-macro'

const pastas: string[] = []
afterEach(() => {
  for (const p of pastas.splice(0)) rmSync(p, { recursive: true, force: true })
})
const pasta = () => {
  const p = mkdtempSync(join(tmpdir(), 'macro-publicacao-'))
  pastas.push(p)
  return p
}

/** O app e o armazenamento de mentira, com as mesmas respostas das rotas do jogo no BFF. */
async function servidor(opcoes: { estragar?: string } = {}) {
  const p = await cenarioPublicadoParaTeste()
  const conteudos = new Map<string, Uint8Array>()
  conteudos.set(
    p.publicacao.manifesto.digest,
    new TextEncoder().encode(JSON.stringify(p.pacote.cena)),
  )
  for (const a of p.pacote.cena.arquivos) conteudos.set(a.digest, p.pacote.arquivos.get(a.caminho)!)
  const pedidos: string[] = []
  const leitor = {
    async lerJson(caminho: string) {
      pedidos.push(caminho)
      if (caminho === 'jogo/perfis/sua-ilha') return { publicacao: p.publicacao }
      if (caminho === 'jogo/perfis/bosque') return { publicacao: null }
      const um = /^jogo\/publicacoes\/[\w-]+\/arquivos\/([a-f0-9]{64})\?como=endereco$/.exec(
        caminho,
      )
      if (um) return { url: `https://armazem.test/${um[1]}`, bytes: conteudos.get(um[1]!)!.length }
      const lote = /^jogo\/publicacoes\/[\w-]+\/arquivos\?digests=(.+)$/.exec(caminho)
      if (lote)
        return {
          arquivos: lote[1]!.split(',').map((digest) => ({
            digest,
            url: `https://armazem.test/${digest}`,
            bytes: conteudos.get(digest)!.length,
            tipoDoConteudo: 'application/octet-stream',
          })),
        }
      throw Error(`rota inesperada: ${caminho}`)
    },
    async baixarAssinado(url: string) {
      const digest = url.split('/').at(-1)!
      const bytes = conteudos.get(digest)!
      if (digest === opcoes.estragar) return bytes.slice(1)
      return bytes
    },
  }
  return { p, leitor, pedidos }
}

test('a pasta sai no formato que o /macro lê, com os mesmos bytes da publicação', async () => {
  const { p, leitor } = await servidor()
  const raiz = pasta()
  const r = await levarPublicacaoAoMacro(leitor, { ilha: 'sua-ilha', pasta: raiz })
  expect(r.publicacao.id).toBe(p.publicacao.id)
  expect(r.arquivos).toBe(new Set(p.pacote.cena.arquivos.map((a) => a.digest)).size + 1)
  expect(r.baixados).toBe(r.arquivos)

  const pedir = (caminho: string) =>
    publicacoesDoEnsaio(raiz, new Request(`http://127.0.0.1:4520${caminho}`))
  expect(await (await pedir('/api/cenarios/jogo/perfis/sua-ilha'))!.json()).toEqual({
    publicacao: p.publicacao,
  })
  const meta = (await (await pedir(
    `/api/cenarios/jogo/publicacoes/${p.publicacao.id}/arquivos/${p.publicacao.manifesto.digest}`,
  ))!.json()) as { url: string }
  const manifesto = (await publicacoesDoEnsaio(raiz, new Request(meta.url)))!
  expect(await manifesto.json()).toEqual(p.pacote.cena)
  for (const a of p.pacote.cena.arquivos) {
    const m = (await (await pedir(
      `/api/cenarios/jogo/publicacoes/${p.publicacao.id}/arquivos/${a.digest}`,
    ))!.json()) as { url: string }
    const conteudo = (await publicacoesDoEnsaio(raiz, new Request(m.url)))!
    const esperado: Uint8Array = p.pacote.arquivos.get(a.caminho)!
    expect(Array.from(new Uint8Array(await conteudo.arrayBuffer()))).toEqual(Array.from(esperado))
  }
})

test('levar de novo não baixa o que já está igual na pasta', async () => {
  const { leitor, pedidos } = await servidor()
  const raiz = pasta()
  await levarPublicacaoAoMacro(leitor, { ilha: 'sua-ilha', pasta: raiz })
  pedidos.length = 0
  const r = await levarPublicacaoAoMacro(leitor, { ilha: 'sua-ilha', pasta: raiz })
  expect(r.baixados).toBe(0)
  expect(pedidos).toEqual(['jogo/perfis/sua-ilha'])
})

test('arquivo que chega diferente do publicado para tudo e o /macro continua sem a versão', async () => {
  const base = await servidor()
  const [primeiro] = base.p.pacote.cena.arquivos
  const { leitor } = await servidor({ estragar: primeiro!.digest })
  const raiz = pasta()
  await expect(levarPublicacaoAoMacro(leitor, { ilha: 'sua-ilha', pasta: raiz })).rejects.toThrow(
    'chegou diferente do publicado',
  )
  expect(await Bun.file(join(raiz, 'perfis', 'sua-ilha.json')).exists()).toBe(false)
  const r = await publicacoesDoEnsaio(
    raiz,
    new Request('http://127.0.0.1:4520/api/cenarios/jogo/perfis/sua-ilha'),
  )
  expect(await r!.json()).toEqual({ publicacao: null })
})

test('ilha sem publicação no ar avisa em vez de criar uma pasta vazia', async () => {
  const { leitor } = await servidor()
  await expect(levarPublicacaoAoMacro(leitor, { ilha: 'bosque', pasta: pasta() })).rejects.toThrow(
    'ainda não tem publicação no ar',
  )
})

import { expect, test } from 'bun:test'
import type { CenaCompilada } from '../src/compilar/schema'
import {
  conferirPreparacaoDePublicacao,
  criarSnapshotDePublicacao,
  lerResultadoDaPublicacao,
  PERFIS_DE_ILHA,
  type PedidoDePublicacao,
  PedidoDePublicacaoSchema,
} from '../src/publicacao'
import { digestDosBytes } from '../src/v2/glb'

async function preparo() {
  const cena: CenaCompilada = {
    formato: 'molda-cena-compilada',
    versao: 1,
    nome: 'Faísca',
    unidade: 'metro',
    eixoVertical: 'y',
    fonte: { cenario: 'cenario-ensaio-0001', revisao: 3, digest: 'a'.repeat(64) },
    arquivos: [],
    entidades: [],
    nos: [],
    colisoes: [],
    aguas: [],
    caminhos: [],
    marcadores: [],
    texturas: [],
    fontes: { modelos: [], texturas: [], conjuntos: [] },
    licencas: [],
    ambiente: { hora: 12 },
  }
  const bytes = new TextEncoder().encode(JSON.stringify(cena))
  const pedido: PedidoDePublicacao = {
    operacaoId: '8c37e3b2-67c6-4bcc-bdb0-913053d4849f',
    perfil: { tipo: 'arquipelago-v2', ilha: 'sua-ilha' },
    versaoEsperada: 0,
    fonte: { ...cena.fonte },
    manifesto: { digest: await digestDosBytes(bytes), bytes: bytes.length },
  }
  return { cena, bytes, pedido }
}

test('publicação fixa fonte, perfil e bytes exatos do manifesto, sem alterar a entrada', async () => {
  const p = await preparo(),
    antes = JSON.stringify(p.pedido)
  const snapshot = await criarSnapshotDePublicacao(p.pedido, p.bytes)
  expect(snapshot.pedido).toEqual(p.pedido)
  expect(snapshot.cena).toEqual(p.cena)
  expect(snapshot.recursos).toEqual([
    {
      ...p.pedido.manifesto,
      mime: 'application/vnd.sistemazero.cena-compilada+json',
      papel: 'manifesto',
    },
  ])
  expect(snapshot.digestDaOperacao).toMatch(/^[a-f0-9]{64}$/)
  expect(JSON.stringify(p.pedido)).toBe(antes)
  expect((await criarSnapshotDePublicacao(p.pedido, p.bytes)).digestDaOperacao).toBe(
    snapshot.digestDaOperacao,
  )
})

test('somente os sete territórios são alvos, sem perfil genérico ou campos de autoridade', async () => {
  const { pedido } = await preparo()
  expect(PERFIS_DE_ILHA).toHaveLength(7)
  for (const ilha of PERFIS_DE_ILHA)
    expect(
      PedidoDePublicacaoSchema.safeParse({ ...pedido, perfil: { tipo: 'arquipelago-v2', ilha } })
        .success,
    ).toBe(true)
  for (const patch of [
    { perfil: { tipo: 'arquipelago-v2', ilha: 'farol' } },
    { perfil: { tipo: 'livre', ilha: 'sua-ilha' } },
    { autor: 'outra-conta' },
    { espacoId: 'alheio' },
    { versaoEsperada: -1 },
    { operacaoId: 'arbitrario' },
    { fonte: { ...pedido.fonte, revisao: 1.5 } },
  ])
    expect(PedidoDePublicacaoSchema.safeParse({ ...pedido, ...patch }).success).toBe(false)
})

test('fonte divergente, manifesto adulterado, truncado ou com bytes UTF-8 inválidos é recusado', async () => {
  const p = await preparo()
  for (const fonte of [
    { ...p.pedido.fonte, cenario: 'outro' },
    { ...p.pedido.fonte, revisao: 4 },
    { ...p.pedido.fonte, digest: 'b'.repeat(64) },
  ])
    await expect(criarSnapshotDePublicacao({ ...p.pedido, fonte }, p.bytes)).rejects.toThrow(
      /fonte/i,
    )
  await expect(criarSnapshotDePublicacao(p.pedido, p.bytes.slice(1))).rejects.toThrow(/tamanho/i)
  const adulterado = p.bytes.slice()
  adulterado[10] ^= 1
  await expect(criarSnapshotDePublicacao(p.pedido, adulterado)).rejects.toThrow(/hash/i)
  const invalido = new Uint8Array([255])
  await expect(
    criarSnapshotDePublicacao(
      {
        ...p.pedido,
        manifesto: {
          digest: await digestDosBytes(invalido),
          bytes: 1,
        },
      },
      invalido,
    ),
  ).rejects.toThrow(/UTF-8/i)
})

test('captura pedido e manifesto antes de awaits; alterações do chamador não mudam a versão', async () => {
  const p = await preparo(),
    esperado = structuredClone(p.pedido)
  const pendente = criarSnapshotDePublicacao(p.pedido, p.bytes)
  p.pedido.fonte.revisao = 10
  p.pedido.perfil.ilha = 'bosque'
  p.bytes.fill(0)
  const snapshot = await pendente
  expect(snapshot.pedido).toEqual(esperado)
  expect(snapshot.cena.fonte.revisao).toBe(3)
})

test('inventário deduplica conteúdo e recusa metadados incompatíveis para o mesmo hash', async () => {
  const p = await preparo(),
    digest = 'c'.repeat(64)
  const arquivo = {
    caminho: 'terreno/a.bin',
    digest,
    bytes: 4,
    mime: 'application/octet-stream',
    papel: 'alturas',
  }
  const montar = async (arquivos: unknown[]) => {
    const bytes = new TextEncoder().encode(JSON.stringify({ ...p.cena, arquivos }))
    return criarSnapshotDePublicacao(
      { ...p.pedido, manifesto: { digest: await digestDosBytes(bytes), bytes: bytes.length } },
      bytes,
    )
  }
  const snapshot = await montar([arquivo, { ...arquivo, caminho: 'terreno/b.bin' }])
  expect(snapshot.recursos.filter((r) => r.digest === digest)).toHaveLength(1)
  await expect(
    montar([arquivo, { ...arquivo, caminho: 'terreno/b.bin', bytes: 8 }]),
  ).rejects.toThrow(/incompatíveis/i)
})

test('resultado e repetição precisam corresponder à fonte, ao manifesto, à versão e à ilha pedida', async () => {
  const { pedido } = await preparo()
  const publicacao = {
    id: '00000000-0000-4000-8000-000000000002',
    perfil: pedido.perfil,
    versao: 1,
    fonte: pedido.fonte,
    manifesto: pedido.manifesto,
  }
  expect(lerResultadoDaPublicacao(pedido, { publicacao, repetido: false }).publicacao).toEqual(
    publicacao,
  )
  for (const patch of [
    { versao: 2 },
    { perfil: { tipo: 'arquipelago-v2', ilha: 'bosque' } },
    { fonte: { ...pedido.fonte, revisao: 4 } },
    { manifesto: { ...pedido.manifesto, digest: 'f'.repeat(64) } },
    { autorId: 'privado' },
  ])
    expect(() =>
      lerResultadoDaPublicacao(pedido, { publicacao: { ...publicacao, ...patch }, repetido: true }),
    ).toThrow()
  const base = { espacoId: '00000000-0000-4000-8000-000000000003', pedido, publicacao }
  expect(conferirPreparacaoDePublicacao(pedido, base).publicacao).toEqual(publicacao)
  expect(() =>
    conferirPreparacaoDePublicacao(pedido, { ...base, pedido: { ...pedido, versaoEsperada: 2 } }),
  ).toThrow()
})

import { expect, mock, test } from 'bun:test'
import { lerCenaCompilada } from '@sistemazero/molda-cenarios-core/compilar'
import { digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import { exemplo, glb } from '../../molda-cenarios-motor/tests/fixtures/glb-compilacao'

mock.module('server-only', () => ({}))
const { conferirPacoteDaPublicacao } = await import('../src/server/cenarios-publicacao-conteudo')

async function pacote() {
  const malha = exemplo(),
    bytes = glb(malha.j, malha.bin),
    caminho = 'modelos/piso.glb'
  const cena = lerCenaCompilada({
    formato: 'molda-cena-compilada',
    versao: 1,
    nome: 'Praça',
    unidade: 'metro',
    eixoVertical: 'y',
    fonte: { cenario: '00000000-0000-4000-8000-000000000001', revisao: 0, digest: 'a'.repeat(64) },
    arquivos: [
      {
        caminho,
        digest: await digestDosBytes(bytes),
        bytes: bytes.length,
        mime: 'model/gltf-binary',
        papel: 'modelo',
        malhas: 2,
        triangulos: 2,
        verticesMaximos: 3,
      },
    ],
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
  })
  const p = { cena, arquivos: new Map([[caminho, bytes]]) }
  const manifesto = new TextEncoder().encode(JSON.stringify(p.cena))
  const pedido = {
    operacaoId: crypto.randomUUID(),
    perfil: { tipo: 'arquipelago-v2', ilha: 'sua-ilha' },
    versaoEsperada: 0,
    fonte: p.cena.fonte,
    manifesto: { digest: await digestDosBytes(manifesto), bytes: manifesto.length },
  }
  const objetos = new Map<string, { bytes: Uint8Array; mime: string }>([
    [
      pedido.manifesto.digest,
      { bytes: manifesto, mime: 'application/vnd.sistemazero.cena-compilada+json' },
    ],
    ...p.cena.arquivos.map(
      (a) => [a.digest, { bytes: p.arquivos.get(a.caminho)!, mime: a.mime }] as const,
    ),
  ])
  const chamadas: string[] = [],
    cancelados: string[] = []
  const obter = async (digest: string) => {
    chamadas.push(digest)
    const o = objetos.get(digest)
    if (!o) return null
    return {
      contentLength: o.bytes.length,
      contentType: o.mime,
      body: new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(o.bytes)
          c.close()
        },
        cancel() {
          cancelados.push(digest)
        },
      }),
    }
  }
  return { p, pedido, manifesto, objetos, obter, chamadas, cancelados }
}

test('BFF confere manifesto e GLB reais no armazenamento antes de afirmar os arquivos', async () => {
  const b = await pacote()
  const resultado = await conferirPacoteDaPublicacao(b.pedido, b.obter)
  expect(resultado.manifesto).toEqual(b.manifesto)
  expect(resultado.conferidos).toHaveLength(b.objetos.size)
  expect(new Set(b.chamadas).size).toBe(b.chamadas.length)
  expect(resultado.conferidos.every((a) => b.objetos.has(a.digest))).toBe(true)
})

test('ausência, MIME divergente e conteúdo alterado recusam o pacote inteiro', async () => {
  for (const modo of ['ausente', 'mime', 'bytes'] as const) {
    const b = await pacote(),
      recurso = b.p.cena.arquivos[0]!
    const o = b.objetos.get(recurso.digest)!
    if (modo === 'ausente') b.objetos.delete(recurso.digest)
    if (modo === 'mime') o.mime = 'text/plain'
    if (modo === 'bytes') {
      o.bytes = o.bytes.slice()
      o.bytes[0] = o.bytes[0]! ^ 1
    }
    await expect(conferirPacoteDaPublicacao(b.pedido, b.obter)).rejects.toThrow(
      /arquivo|tipo|hash/i,
    )
  }
})

test('hash correto não aprova medidas geométricas inventadas', async () => {
  const b = await pacote(),
    recurso = b.p.cena.arquivos[0]!
  recurso.triangulos = 0
  const manifesto = new TextEncoder().encode(JSON.stringify(b.p.cena))
  const digest = await digestDosBytes(manifesto)
  b.objetos.set(digest, {
    bytes: manifesto,
    mime: 'application/vnd.sistemazero.cena-compilada+json',
  })
  await expect(
    conferirPacoteDaPublicacao(
      { ...b.pedido, manifesto: { digest, bytes: manifesto.length } },
      b.obter,
    ),
  ).rejects.toThrow(/medidas|triângulos|malha/i)
})

test('hash recalculado não aprova um arquivo com cabeçalho GLB inválido', async () => {
  const b = await pacote(),
    recurso = b.p.cena.arquivos[0]!
  const corrompido = b.objetos.get(recurso.digest)!.bytes.slice()
  corrompido[4] = 1
  recurso.digest = await digestDosBytes(corrompido)
  b.objetos.set(recurso.digest, { bytes: corrompido, mime: recurso.mime })
  const manifesto = new TextEncoder().encode(JSON.stringify(b.p.cena)),
    digest = await digestDosBytes(manifesto)
  b.objetos.set(digest, {
    bytes: manifesto,
    mime: 'application/vnd.sistemazero.cena-compilada+json',
  })
  await expect(
    conferirPacoteDaPublicacao(
      { ...b.pedido, manifesto: { digest, bytes: manifesto.length } },
      b.obter,
    ),
  ).rejects.toThrow(/GLB|glTF|versão/i)
})

test('cancelamento enquanto o armazenamento responde fecha o corpo recém-aberto', async () => {
  const b = await pacote(),
    controle = new AbortController()
  const obter = async (digest: string) => {
    const objeto = await b.obter(digest)
    controle.abort()
    return objeto
  }
  await expect(conferirPacoteDaPublicacao(b.pedido, obter, controle.signal)).rejects.toHaveProperty(
    'name',
    'AbortError',
  )
  expect(b.cancelados).toEqual([b.pedido.manifesto.digest])
})

test('stream excedente é interrompido e não produz confirmação parcial', async () => {
  const b = await pacote()
  let cancelado = false
  const obter = async () => ({
    contentLength: b.manifesto.length,
    contentType: 'application/vnd.sistemazero.cena-compilada+json',
    body: new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new Uint8Array(b.manifesto.length + 1))
      },
      cancel() {
        cancelado = true
      },
    }),
  })
  await expect(conferirPacoteDaPublicacao(b.pedido, obter)).rejects.toThrow(/tamanho/i)
  expect(cancelado).toBe(true)
})

test('cancelamento anterior não lê o armazenamento', async () => {
  const b = await pacote(),
    controle = new AbortController()
  controle.abort()
  await expect(
    conferirPacoteDaPublicacao(b.pedido, b.obter, controle.signal),
  ).rejects.toHaveProperty('name', 'AbortError')
  expect(b.chamadas).toHaveLength(0)
})

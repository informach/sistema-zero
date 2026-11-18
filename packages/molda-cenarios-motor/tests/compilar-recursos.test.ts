import { expect, test } from 'bun:test'
import {
  criarDocumentoVazio,
  digestDosBytes,
  type InstanciaDeCenario,
} from '@sistemazero/molda-cenarios-core/v2'
import { type ConteudoDaCompilacao, carregarRecursosDaCompilacao } from '../src/compilar/recursos'

function arquivo() {
  const bin = new Uint8Array(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer),
    json = {
      asset: { version: '2.0' },
      buffers: [{ byteLength: bin.length }],
      bufferViews: [{ buffer: 0, byteLength: bin.length }],
      accessors: [
        {
          bufferView: 0,
          componentType: 5126,
          count: 3,
          type: 'VEC3',
          min: [0, 0, 0],
          max: [1, 1, 0],
        },
      ],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
      nodes: [{ mesh: 0 }],
      scenes: [{ nodes: [0] }],
      scene: 0,
    },
    texto = new TextEncoder().encode(JSON.stringify(json)),
    n = Math.ceil(texto.length / 4) * 4,
    bytes = new Uint8Array(28 + n + bin.length),
    v = new DataView(bytes.buffer)
  v.setUint32(0, 0x46546c67, true)
  v.setUint32(4, 2, true)
  v.setUint32(8, bytes.length, true)
  v.setUint32(12, n, true)
  v.setUint32(16, 0x4e4f534a, true)
  bytes.fill(32, 20, 20 + n)
  bytes.set(texto, 20)
  v.setUint32(20 + n, bin.length, true)
  v.setUint32(24 + n, 0x004e4942, true)
  bytes.set(bin, 28 + n)
  return bytes
}
const objeto = (id: string, modelo: string): InstanciaDeCenario => ({
  id,
  nome: id,
  modelo,
  grupo: null,
  oculto: false,
  bloqueado: false,
  colisao: 'malha',
  apoio: { tipo: 'absoluto' },
  transformacao: {
    posicao: { x: 0, y: 0, z: 0 },
    rotacao: { x: 0, y: 0, z: 0 },
    escala: { x: 1, y: 1, z: 1 },
  },
})
const contexto = {
  equipe: false,
  bibliotecas: [{ id: 'b', nome: 'Livre', licenca: 'livre' as const }],
}
async function exemplo() {
  const d = criarDocumentoVazio('c', 'Recursos'),
    bytes = arquivo(),
    digest = await digestDosBytes(bytes)
  d.modelos = [
    { id: 'm', biblioteca: 'b', modelo: 'original', digest },
    { id: 'alias', biblioteca: 'b', modelo: 'outra-ref', digest },
    { id: 'ocioso', biblioteca: 'restrita', modelo: 'nao-usado', digest: 'b'.repeat(64) },
  ]
  d.instancias = [objeto('o', 'm'), objeto('p', 'alias')]
  return { d, bytes }
}
const naoUsar = async () => {
  throw Error('Recurso ocioso não deve ser lido')
}
test('carregamento usa portas por referência, confere conteúdo e compartilha somente dentro da execução', async () => {
  const { d, bytes } = await exemplo(),
    antes = JSON.stringify(d),
    originais = bytes.slice(),
    chamadas: string[] = []
  const portas: ConteudoDaCompilacao = {
      modelo: async (ref) => {
        chamadas.push(ref.modelo)
        return bytes.buffer
      },
      textura: naoUsar,
      terreno: naoUsar,
    },
    r = await carregarRecursosDaCompilacao(
      d,
      { cenario: d.id, revisao: 4 },
      contexto,
      portas,
      new AbortController().signal,
    )
  let descartes = 0
  const modelo = r.modelos.get('m')!
  modelo.partes[0]!.geometria.addEventListener('dispose', () => descartes++)
  expect(chamadas).toEqual(['original'])
  expect(r.modelos.get('alias')).toBe(modelo)
  expect(r.modelos.has('ocioso')).toBe(false)
  expect(JSON.stringify(d)).toBe(antes)
  expect(bytes).toEqual(originais)
  r.descartar()
  r.descartar()
  expect(descartes).toBe(1)
  expect(r.modelos.size).toBe(0)
})
test('hash trocado e falha de conteúdo não entregam um conjunto parcial', async () => {
  const { d, bytes } = await exemplo(),
    sinal = new AbortController().signal,
    fonte = { cenario: d.id, revisao: 0 },
    portas = { modelo: async () => bytes.buffer, textura: naoUsar, terreno: naoUsar }
  d.modelos[0]!.digest = 'f'.repeat(64)
  await expect(carregarRecursosDaCompilacao(d, fonte, contexto, portas, sinal)).rejects.toThrow(
    /não corresponde/,
  )
  d.modelos[0]!.digest = await digestDosBytes(bytes)
  await expect(
    carregarRecursosDaCompilacao(
      d,
      fonte,
      contexto,
      {
        ...portas,
        modelo: async () => {
          throw Error('indisponível')
        },
      },
      sinal,
    ),
  ).rejects.toThrow(/indisponível/)
  const r = await carregarRecursosDaCompilacao(d, fonte, contexto, portas, sinal)
  expect(r.modelos.size).toBe(2)
  r.descartar()
})
test('licença restrita é recusada antes de ler modelos e cancelamento após a porta impede decoder', async () => {
  const { d, bytes } = await exemplo(),
    c = new AbortController()
  let chamadas = 0
  const portas = {
    modelo: async () => {
      chamadas++
      c.abort()
      return bytes.buffer
    },
    textura: naoUsar,
    terreno: naoUsar,
  }
  await expect(
    carregarRecursosDaCompilacao(
      d,
      { cenario: d.id, revisao: 0 },
      { equipe: false, bibliotecas: [{ id: 'b', nome: 'Restrita', licenca: 'restrita' }] },
      portas,
      c.signal,
    ),
  ).rejects.toThrow(/restrit/i)
  expect(chamadas).toBe(0)
  await expect(
    carregarRecursosDaCompilacao(d, { cenario: d.id, revisao: 0 }, contexto, portas, c.signal),
  ).rejects.toHaveProperty('name', 'AbortError')
  expect(chamadas).toBe(1)
})
test('formas existentes não criam leituras de arquivo nem um segundo gerador', async () => {
  const d = criarDocumentoVazio('c', 'Rampa')
  d.formas = [{ id: 'f', nome: 'Rampa', tipo: 'rampa', largura: 2, altura: 1, comprimento: 3 }]
  d.instancias = [objeto('o', 'f')]
  const r = await carregarRecursosDaCompilacao(
    d,
    { cenario: d.id, revisao: 0 },
    { equipe: false, bibliotecas: [] },
    { modelo: naoUsar, textura: naoUsar, terreno: naoUsar },
    new AbortController().signal,
  )
  try {
    expect(r.modelos.get('f')!.caixa.max.y).toBe(1)
    expect(r.preparada.modelos).toHaveLength(0)
  } finally {
    r.descartar()
  }
})

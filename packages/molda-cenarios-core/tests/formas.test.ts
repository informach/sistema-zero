import { expect, test } from 'bun:test'
import {
  criarDocumentoVazio,
  executarLote,
  type FormaDeCenario,
  FormaDeCenarioSchema,
  inverterLote,
  malhaDaForma,
  volumeDaForma,
  volumeNoMundo,
} from '../src/v2'

const formas: FormaDeCenario[] = [
  { id: 'caixa', nome: 'Caixa', tipo: 'caixa', largura: 4, altura: 3, comprimento: 6 },
  { id: 'rampa', nome: 'Rampa', tipo: 'rampa', largura: 4, altura: 3, comprimento: 6 },
  {
    id: 'escada',
    nome: 'Escada',
    tipo: 'escada',
    largura: 4,
    altura: 3,
    comprimento: 6,
    degraus: 7,
  },
  { id: 'cilindro', nome: 'Cilindro', tipo: 'cilindro', raio: 2, altura: 3, lados: 17 },
]

test('formas são superfícies fechadas, orientadas para fora, com medidas e volumes corretos', () => {
  for (const f of formas) {
    const g = malhaDaForma(f),
      bordas = new Map<string, { quantidade: number; sentido: number }>()
    let volume = 0
    const ponto = (indice: number) => Array.from(g.posicoes.slice(indice * 3, indice * 3 + 3))
    const chave = (v: number[]) => v.map((n) => n.toFixed(5)).join(',')
    for (let i = 0; i < g.indices.length; i += 3) {
      const a = ponto(g.indices[i]!),
        b = ponto(g.indices[i + 1]!),
        c = ponto(g.indices[i + 2]!)
      volume +=
        (a[0]! * (b[1]! * c[2]! - b[2]! * c[1]!) +
          a[1]! * (b[2]! * c[0]! - b[0]! * c[2]!) +
          a[2]! * (b[0]! * c[1]! - b[1]! * c[0]!)) /
        6
      for (const [p, q] of [
        [a, b],
        [b, c],
        [c, a],
      ]) {
        const x = chave(p!),
          y = chave(q!),
          k = x < y ? `${x}|${y}` : `${y}|${x}`,
          anterior = bordas.get(k) ?? { quantidade: 0, sentido: 0 }
        bordas.set(k, {
          quantidade: anterior.quantidade + 1,
          sentido: anterior.sentido + (x < y ? 1 : -1),
        })
      }
    }
    expect([...bordas.values()].every((b) => b.quantidade === 2 && b.sentido === 0)).toBe(true)
    const esperado =
      f.tipo === 'cilindro'
        ? ((f.lados * f.raio ** 2 * Math.sin((2 * Math.PI) / f.lados)) / 2) * f.altura
        : f.largura *
          f.comprimento *
          f.altura *
          (f.tipo === 'rampa' ? 0.5 : f.tipo === 'escada' ? (f.degraus + 1) / (2 * f.degraus) : 1)
    expect(volume).toBeCloseTo(esperado, 4)
    const v = volumeDaForma(f)
    for (const [eixo, nome] of (['x', 'y', 'z'] as const).entries()) {
      const valores = Array.from(g.posicoes).filter((_, i) => i % 3 === eixo)
      expect(Math.min(...valores)).toBe(v.min[nome])
      expect(Math.max(...valores)).toBe(v.max[nome])
    }
    expect(Array.from(g.normais).every(Number.isFinite)).toBe(true)
    expect(Array.from(g.uvs).every(Number.isFinite)).toBe(true)
    expect(g.indices.length / 3).toBeLessThan(600)
  }
})

test('resoluções extremas são limitadas e não produzem faces degeneradas', () => {
  for (const f of [
    { ...formas[2]!, tipo: 'escada', largura: 128, altura: 0.1, comprimento: 0.1, degraus: 64 },
    { id: 'cil', nome: 'Cilindro', tipo: 'cilindro', raio: 0.1, altura: 128, lados: 64 },
  ] as const) {
    expect(() => malhaDaForma(f)).not.toThrow()
  }
  expect(FormaDeCenarioSchema.safeParse({ ...formas[2], degraus: 100000 }).success).toBe(false)
  expect(FormaDeCenarioSchema.safeParse({ ...formas[0], altura: 0 }).success).toBe(false)
  expect(FormaDeCenarioSchema.safeParse({ ...formas[0], largura: NaN }).success).toBe(false)
})

test('definições autorais não exigem biblioteca e participam dos volumes, bloqueios e undo', () => {
  const antes = criarDocumentoVazio('c', 'Rascunho'),
    f = formas[2]!
  const comandos = [
    { tipo: 'forma.definir', forma: f },
    {
      tipo: 'instancia.criar',
      instancia: {
        id: 'o',
        nome: 'Escada',
        modelo: f.id,
        grupo: null,
        bloqueado: false,
        oculto: false,
        colisao: 'malha',
        apoio: { tipo: 'terreno', deslocamento: 0, inclinar: false, referencia: 'volume' },
        transformacao: {
          posicao: { x: 2, y: 0, z: 4 },
          rotacao: { x: 0, y: 0, z: 0 },
          escala: { x: 1, y: 1, z: 1 },
        },
      },
    },
  ] as const
  const depois = executarLote(
    { documento: antes, revisao: 0 },
    { revisaoEsperada: 0, comandos },
  ).documento
  expect(depois.modelos).toHaveLength(0)
  expect(volumeNoMundo(depois, depois.instancias[0]!).min.y).toBe(0)
  const volta = executarLote(
    { documento: depois, revisao: 1 },
    { revisaoEsperada: 1, comandos: inverterLote(antes, depois) },
  ).documento
  expect(volta).toEqual(antes)
  const fechado = executarLote(
    { documento: depois, revisao: 1 },
    {
      revisaoEsperada: 1,
      comandos: [{ tipo: 'instancia.atualizar', id: 'o', alteracoes: { bloqueado: true } }],
    },
  ).documento
  expect(() =>
    executarLote(
      { documento: fechado, revisao: 2 },
      { revisaoEsperada: 2, comandos: [{ tipo: 'forma.definir', forma: { ...f, altura: 5 } }] },
    ),
  ).toThrow('bloqueado')
  const mudou = executarLote(
    { documento: depois, revisao: 1 },
    {
      revisaoEsperada: 1,
      comandos: [
        { tipo: 'forma.definir', forma: { ...f, altura: 5 } },
        { tipo: 'instancia.atualizar', id: 'o', alteracoes: { bloqueado: true } },
      ],
    },
  ).documento
  expect(
    executarLote(
      { documento: mudou, revisao: 2 },
      { revisaoEsperada: 2, comandos: inverterLote(depois, mudou) },
    ).documento,
  ).toEqual(depois)
  fechado.grupos = [{ id: 'g', nome: 'Grupo', grupo: null, bloqueado: true, oculto: false }]
  fechado.instancias[0]!.grupo = 'g'
  const restaurado = structuredClone(fechado)
  restaurado.formas![0]!.altura = 5
  expect(
    executarLote(
      { documento: restaurado, revisao: 5 },
      { revisaoEsperada: 5, comandos: inverterLote(fechado, restaurado) },
    ).documento,
  ).toEqual(fechado)
})

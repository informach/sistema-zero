import { expect, test } from 'bun:test'
import {
  alteracoesDoGesto,
  apoioNaSuperficie,
  criarDocumentoVazio,
  EncaixeDeComposicaoSchema,
  encaixarNaGrade,
  executarLote,
  girarObjetosNaVertical,
  inverterLote,
  levarObjetosAoAndar,
  posicaoNoMundo,
  volumeNoMundo,
} from '../src/v2'

function cena() {
  const d = criarDocumentoVazio('c', 'Encaixes')
  d.modelos = [
    {
      id: 'm',
      biblioteca: 'b',
      modelo: 'm',
      digest: 'a'.repeat(64),
      volume: { min: { x: -1, y: -0.5, z: -1 }, max: { x: 1, y: 1, z: 1 } },
    },
  ]
  d.instancias = ['ponte', 'banco'].map((id, i) => ({
    id,
    nome: id,
    modelo: 'm',
    grupo: null,
    bloqueado: false,
    oculto: false,
    colisao: 'caixa',
    apoio: { tipo: 'absoluto' },
    transformacao: {
      posicao: { x: i ? 0 : 2, y: i ? 0 : 3, z: i ? 0 : 4 },
      rotacao: { x: 0, y: i ? 0 : Math.PI / 2, z: 0 },
      escala: { x: 1, y: i ? 1 : 2, z: 1 },
    },
  }))
  return d
}

test('grade considera origem modular, valores negativos e recusa preferências inválidas', () => {
  expect(encaixarNaGrade(1.2, 0.5, 0.25)).toBe(1.25)
  expect(encaixarNaGrade(-1.1, 0.5, 0.25)).toBe(-1.25)
  expect(encaixarNaGrade(1.2, null, 10)).toBe(1.2)
  expect(() => encaixarNaGrade(2, 0)).toThrow('Grade')
  expect(EncaixeDeComposicaoSchema.parse({ grade: 2, angulo: 90 }).origem).toEqual({
    x: 0,
    y: 0,
    z: 0,
  })
  for (const grade of [0, Infinity, NaN, -1, 101])
    expect(EncaixeDeComposicaoSchema.safeParse({ grade, angulo: 90 }).success).toBe(false)
  expect(
    EncaixeDeComposicaoSchema.safeParse({ grade: 1, angulo: 90, andar: { altura: 3, nivel: 0.5 } })
      .success,
  ).toBe(false)
})

test('contato local acompanha posição, giro, escala e espelho do suporte, sem alterar o documento', () => {
  const d = cena(),
    banco = d.instancias[1]!
  banco.apoio = apoioNaSuperficie(d, 'ponte', { x: 2, y: 5, z: 3 })
  expect(posicaoNoMundo(d, banco)).toEqual({ x: 2, y: 5.5, z: 3 })
  const anterior = structuredClone(d)
  const ponte = d.instancias[0]!
  ponte.transformacao.posicao.x += 4
  ponte.transformacao.posicao.y += 3
  expect(posicaoNoMundo(d, banco)).toEqual({ x: 6, y: 8.5, z: 3 })
  ponte.espelho = { x: true, y: false, z: false }
  const p = posicaoNoMundo(d, banco)
  expect(p.x).toBeCloseTo(6)
  expect(p.y).toBeCloseTo(8.5)
  expect(p.z).toBeCloseTo(5)
  expect(anterior.instancias[0]!.transformacao.posicao.x).toBe(2)
  const t = {
    ...structuredClone(banco.transformacao),
    posicao: { x: p.x + 2, y: p.y + 1, z: p.z - 3 },
  }
  Object.assign(banco, alteracoesDoGesto(d, banco, t))
  expect(posicaoNoMundo(d, banco).x).toBeCloseTo(t.posicao.x)
  expect(posicaoNoMundo(d, banco).y).toBeCloseTo(t.posicao.y)
  expect(posicaoNoMundo(d, banco).z).toBeCloseTo(t.posicao.z)
  expect(banco.apoio.tipo).toBe('objeto')
})

test('giro de 90° e andar preservam proporções, usam a base do volume e podem ser desfeitos', () => {
  const d = cena(),
    o = d.instancias[1]!
  o.transformacao.rotacao = { x: 0.3, y: 0.4, z: -0.2 }
  const girado = executarLote(
    { documento: d, revisao: 0 },
    { revisaoEsperada: 0, comandos: girarObjetosNaVertical(d, ['banco'], Math.PI / 2) },
  ).documento
  expect(girado.instancias[1]!.transformacao.rotacao).not.toEqual(o.transformacao.rotacao)
  const comandos = levarObjetosAoAndar(girado, ['banco'], 7)
  const depois = executarLote(
    { documento: girado, revisao: 1 },
    { revisaoEsperada: 1, comandos },
  ).documento
  expect(depois.instancias[1]!.transformacao.rotacao).toEqual(
    girado.instancias[1]!.transformacao.rotacao,
  )
  expect(volumeNoMundo(depois, depois.instancias[1]!).min.y).toBeCloseTo(7)
  expect(depois.instancias[1]!.transformacao.escala).toEqual(o.transformacao.escala)
  expect(
    executarLote(
      { documento: depois, revisao: 1 },
      { revisaoEsperada: 1, comandos: inverterLote(d, depois) },
    ).documento,
  ).toEqual(d)
  d.instancias[1]!.bloqueado = true
  expect(() =>
    executarLote({ documento: d, revisao: 0 }, { revisaoEsperada: 0, comandos }),
  ).toThrow('bloqueado')
})

test('apoios legados mantêm posição resolvida; ciclos e suporte ausente falham explicitamente', () => {
  const d = cena(),
    o = d.instancias[1]!
  o.apoio = { tipo: 'objeto', objeto: 'ponte', deslocamento: 5 }
  expect(posicaoNoMundo(d, o)).toEqual(o.transformacao.posicao)
  o.apoio = { ...o.apoio, contato: { x: 0, y: 0, z: 0 } }
  d.instancias[0]!.apoio = {
    tipo: 'objeto',
    objeto: 'banco',
    deslocamento: 0,
    contato: { x: 0, y: 0, z: 0 },
  }
  expect(() => posicaoNoMundo(d, o)).toThrow('Ciclo')
  d.instancias = [o]
  expect(() => posicaoNoMundo(d, o)).toThrow('ausente')
})

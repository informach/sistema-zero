import { expect, test } from 'bun:test'
import {
  alinharObjetos,
  alteracoesDoGesto,
  type ComandoDeCenario,
  criarDocumentoVazio,
  type DocumentoDeCenario,
  distribuirObjetos,
  espelharObjetos,
  executarLote,
  inverterLote,
  posicaoNoMundo,
  referenciarModelo,
  repetirObjetos,
  sortearTransformacoes,
  trocarModeloDosObjetos,
  volumeNoMundo,
} from '../src/v2'

test('espelho alterna cada eixo sem alterar posição, apoio ou volume; desfazer é exato', () => {
  const d = exemplo(),
    antes = structuredClone(d)
  d.instancias[0]!.transformacao.rotacao = { x: 0.6, y: -0.8, z: 0.4 }
  const depois = aplicar(d, espelharObjetos(d, ['b-0'], 'x'))
  expect(depois.instancias[0]!.espelho).toEqual({ x: true, y: false, z: false })
  expect(volumeNoMundo(depois, depois.instancias[0]!)).toEqual(volumeNoMundo(d, d.instancias[0]!))
  expect(depois.instancias[0]!.transformacao).toEqual(d.instancias[0]!.transformacao)
  expect(depois.instancias[0]!.apoio).toEqual(d.instancias[0]!.apoio)
  const duas = aplicar(depois, espelharObjetos(depois, ['b-0'], 'x'))
  expect(duas.instancias[0]!.espelho).toEqual({ x: false, y: false, z: false })
  expect(aplicar(depois, inverterLote(d, depois))).toEqual(d)
  expect(d.instancias.slice(1)).toEqual(antes.instancias.slice(1))
  d.instancias[1]!.bloqueado = true
  const fechado = structuredClone(d)
  expect(() => aplicar(d, espelharObjetos(d, ['b-0', 'b-1'], 'y'))).toThrow('bloqueado')
  expect(d).toEqual(fechado)
})

test('troca conserva base visual, proporções, espelho e vínculos com pivôs e apoios distintos', () => {
  for (const apoio of [
    { tipo: 'terreno', deslocamento: 2, inclinar: false, referencia: 'volume' },
    { tipo: 'terreno', deslocamento: 2, inclinar: false, referencia: 'pivo' },
    { tipo: 'absoluto' },
    { tipo: 'objeto', objeto: 'b-1', deslocamento: 1 },
    { tipo: 'agua', agua: 'lago', local: { x: 1, z: 1 }, deslocamento: 2, giro: 0.3, escala: 2 },
  ] as const) {
    const d = exemplo(),
      o = d.instancias[0]!
    o.apoio = apoio
    o.espelho = { x: true, y: false, z: false }
    o.transformacao = {
      posicao: { x: 3, y: 8, z: 4 },
      rotacao: { x: 0.6, y: 0.4, z: -0.7 },
      escala: { x: 2, y: 3, z: 1 },
    }
    d.aguas = [
      {
        id: 'lago',
        nome: 'Lago',
        grupo: null,
        bloqueado: false,
        oculto: false,
        tipo: 'lago',
        modelo: null,
        centro: { x: 0, z: 0 },
        giro: 0,
        escala: 2,
        nivel: 0,
        profundidade: 2,
        contorno: [
          { x: -2, z: -2 },
          { x: 2, z: -2 },
          { x: 0, z: 2 },
        ],
        recorte: [],
      },
    ]
    const lago = d.aguas[0]!
    if (lago.tipo !== 'lago') throw new Error('Lago esperado')
    lago.recorte = lago.contorno
    const antes = structuredClone(d),
      base = volumeNoMundo(d, o).min.y
    const novo = {
      ...d.modelos[0]!,
      volume: { min: { x: -3, y: -4, z: 0 }, max: { x: 1, y: -1, z: 2 } },
    }
    const depois = aplicar(d, trocarModeloDosObjetos(d, ['b-0'], novo))
    const n = depois.instancias[0]!
    expect(volumeNoMundo(depois, n).min.y).toBeCloseTo(base, 9)
    expect(n.transformacao.posicao.x).toBe(3)
    expect(n.transformacao.posicao.z).toBe(4)
    expect(n.transformacao.rotacao).toEqual(o.transformacao.rotacao)
    expect(n.transformacao.escala).toEqual(o.transformacao.escala)
    expect(n.espelho).toEqual(o.espelho)
    expect(n.apoio.tipo).toBe(apoio.tipo)
    expect(depois.instancias[1]).toEqual(d.instancias[1])
    expect(depois.modelos.find((m) => m.id === 'banco')).toEqual(d.modelos[0])
    expect(aplicar(depois, inverterLote(d, depois))).toEqual(d)
    expect(d).toEqual(antes)
  }
})

test('troca em relevo real exige a fonte e conserva base acima dele', () => {
  const d = exemplo()
  d.base = {
    tipo: 'terreno',
    origem: { x: -32, z: -32 },
    passo: 1,
    colunas: 64,
    linhas: 64,
    min: 0,
    max: 100,
    fundo: 0,
    pecas: [],
  }
  const fonte = (x: number, z: number) => x / 10 + z / 20 + 7
  const novo = {
    ...d.modelos[0]!,
    id: 'arvore',
    modelo: 'arvore',
    volume: { min: { x: -2, y: -2, z: -2 }, max: { x: 2, y: 6, z: 2 } },
  }
  expect(() => trocarModeloDosObjetos(d, ['b-2'], novo)).toThrow('carregado')
  const depois = aplicar(d, trocarModeloDosObjetos(d, ['b-2'], novo, fonte))
  expect(volumeNoMundo(depois, depois.instancias[2]!, fonte).min.y).toBeCloseTo(
    volumeNoMundo(d, d.instancias[2]!, fonte).min.y,
    9,
  )
})

test('referências de outra revisão ou outro volume não sobrescrevem peças fora da seleção', () => {
  const d = exemplo(),
    entrada = { ...d.modelos[0]!, digest: 'b'.repeat(64) }
  const a = referenciarModelo(d, entrada)
  expect(a.id).not.toBe('banco')
  const c = a.comandos[0]!
  if (c.tipo !== 'modelo.definir') throw new Error('Referência esperada')
  d.modelos.push(c.modelo)
  expect(referenciarModelo(d, entrada)).toEqual({ id: a.id, comandos: [] })
  const outra = referenciarModelo(d, {
    ...entrada,
    volume: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 2, z: 1 } },
  })
  expect(outra.id).not.toBe(a.id)
  d.instancias[1]!.bloqueado = true
  const antes = structuredClone(d)
  expect(() => aplicar(d, trocarModeloDosObjetos(d, ['b-0', 'b-1'], entrada))).toThrow('bloqueado')
  expect(d).toEqual(antes)
})

function exemplo(): DocumentoDeCenario {
  const d = criarDocumentoVazio('jardim', 'Jardim')
  d.modelos = [
    {
      id: 'banco',
      modelo: 'banco',
      biblioteca: 'jardim',
      digest: 'a'.repeat(64),
      volume: { min: { x: -1, y: -0.5, z: -0.5 }, max: { x: 1, y: 1, z: 0.5 } },
    },
  ]
  d.instancias = [0, 5, 12].map((x, i) => ({
    id: `b-${i}`,
    nome: `Banco ${i}`,
    modelo: 'banco',
    grupo: null,
    bloqueado: false,
    oculto: false,
    colisao: 'caixa',
    apoio: { tipo: 'terreno', deslocamento: 0, inclinar: false, referencia: 'volume' },
    transformacao: {
      posicao: { x, y: 0, z: i * 3 },
      rotacao: { x: 0, y: 0, z: 0 },
      escala: { x: i + 1, y: 1, z: 1 },
    },
  }))
  return d
}
function aplicar(d: DocumentoDeCenario, comandos: ComandoDeCenario[]) {
  return executarLote({ documento: d, revisao: 0 }, { revisaoEsperada: 0, comandos }).documento
}

test('volume usa giro, escala e pivô real; mudar a escala mantém o contato com o chão', () => {
  const d = exemplo(),
    o = d.instancias[0]!
  expect(volumeNoMundo(d, o).min.y).toBe(0)
  o.transformacao.rotacao.y = Math.PI / 2
  const v = volumeNoMundo(d, o)
  expect(v.max.x - v.min.x).toBeCloseTo(1)
  expect(v.max.z - v.min.z).toBeCloseTo(2)
  Object.assign(
    o,
    alteracoesDoGesto(d, o, {
      ...structuredClone(o.transformacao),
      posicao: posicaoNoMundo(d, o),
      escala: { x: 2, y: 3, z: 2 },
    }),
  )
  expect(posicaoNoMundo(d, o).y).toBe(1.5)
  expect(volumeNoMundo(d, o).min.y).toBeCloseTo(0)
})
test('alinhamento e vãos usam faces de volumes diferentes e podem ser desfeitos', () => {
  const d = exemplo(),
    ids = d.instancias.map((o) => o.id)
  const comandos = alinharObjetos(d, ids, 'z', 'fim'),
    depois = aplicar(d, comandos)
  const fins = depois.instancias.map((o) => volumeNoMundo(depois, o).max.z)
  expect(new Set(fins).size).toBe(1)
  expect(aplicar(depois, inverterLote(d, depois))).toEqual(d)
  const distribuido = aplicar(d, distribuirObjetos(d, ids, 'x', 'vaos'))
  const volumes = distribuido.instancias.map((o) => volumeNoMundo(distribuido, o))
  expect(volumes[1]!.min.x - volumes[0]!.max.x).toBeCloseTo(volumes[2]!.min.x - volumes[1]!.max.x)
  expect(distribuido.instancias[0]).toEqual(d.instancias[0])
  expect(distribuido.instancias[2]).toEqual(d.instancias[2])
  const fechado = structuredClone(d)
  fechado.instancias[2]!.transformacao.posicao.x = 6
  expect(() => distribuirObjetos(fechado, ids, 'x', 'vaos')).toThrow('Afaste')
})
test('repetição em fila e círculo mantém proporções e não duplica o início do círculo', () => {
  const d = exemplo(),
    ids = ['novo-1', 'novo-2', 'novo-3']
  const fila = aplicar(
    d,
    repetirObjetos(
      d,
      ['b-0'],
      { tipo: 'fila', copias: 3, deslocamento: { x: 2, y: 0, z: 1 } },
      ids,
    ),
  )
  expect(fila.instancias.slice(3).map((o) => o.transformacao.posicao.x)).toEqual([2, 4, 6])
  const circulo = aplicar(
    d,
    repetirObjetos(
      d,
      ['b-0'],
      { tipo: 'circulo', copias: 3, centro: { x: -2, z: 0 }, arco: Math.PI * 2, girar: true },
      ids,
    ),
  )
  const pontos = circulo.instancias.slice(3).map((o) => posicaoNoMundo(circulo, o))
  expect(pontos.map((p) => Math.hypot(p.x + 2, p.z))).toEqual([2, 2, 2])
  expect(pontos.every((p) => Math.hypot(p.x, p.z) > 0.1)).toBe(true)
  expect(() =>
    repetirObjetos(
      d,
      ['b-0'],
      { tipo: 'fila', copias: 501, deslocamento: { x: 1, y: 0, z: 0 } },
      [],
    ),
  ).toThrow('500')
})
test('variação tem semente, preserva proporções e não modifica entrada; cadeados continuam atômicos', () => {
  const d = exemplo(),
    original = structuredClone(d),
    ids = d.instancias.map((o) => o.id),
    opcoes = { giro: Math.PI, tamanhoMin: 0.8, tamanhoMax: 1.2 }
  const a = sortearTransformacoes(d, ids, 1234, opcoes)
  expect(a).toEqual(sortearTransformacoes(d, ids, 1234, opcoes))
  expect(a).not.toEqual(sortearTransformacoes(d, ids, 1235, opcoes))
  const resultado = aplicar(d, a)
  expect(
    resultado.instancias[2]!.transformacao.escala.x /
      resultado.instancias[2]!.transformacao.escala.y,
  ).toBeCloseTo(3)
  expect(volumeNoMundo(resultado, resultado.instancias[2]!).min.y).toBeCloseTo(0)
  expect(d).toEqual(original)
  d.instancias[1]!.bloqueado = true
  expect(() => aplicar(d, alinharObjetos(d, ids, 'z', 'inicio'))).toThrow('bloqueado')
  expect(d.instancias[0]).toEqual(original.instancias[0])
})

import { expect, test } from 'bun:test'
import {
  alinharObjetos,
  alteracoesDoGesto,
  type ComandoDeCenario,
  criarDocumentoVazio,
  type DocumentoDeCenario,
  distribuirObjetos,
  executarLote,
  inverterLote,
  posicaoNoMundo,
  repetirObjetos,
  sortearTransformacoes,
  volumeNoMundo,
} from '../src/v2'

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

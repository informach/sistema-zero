import { expect, test } from 'bun:test'
import {
  capturarConteudoDeConjunto,
  capturarFragmento,
  colarFragmento,
  comandosParaSoltarAssociacoesDeMarcadores,
  criarDocumentoVazio,
  executarLote,
  inverterLote,
  MarcadorSchema,
} from '../src/v2'

function cena() {
  const d = criarDocumentoVazio('d', 'Vínculos')
  d.formas = [{ id: 'f', nome: 'Peça', tipo: 'caixa', largura: 1, altura: 1, comprimento: 1 }]
  d.instancias = [
    {
      id: 'o',
      nome: 'Objeto',
      modelo: 'f',
      grupo: null,
      bloqueado: false,
      oculto: false,
      colisao: 'caixa',
      apoio: { tipo: 'absoluto' },
      transformacao: {
        posicao: { x: 2, y: 3, z: 4 },
        rotacao: { x: 0, y: 0, z: 0 },
        escala: { x: 1, y: 1, z: 1 },
      },
    },
  ]
  d.marcadores = [
    MarcadorSchema.parse({
      id: 'm',
      nome: 'Conversa',
      grupo: null,
      bloqueado: false,
      oculto: false,
      noChao: false,
      objeto: 'o',
      posicao: { x: 3, y: 2, z: 1 },
      giro: 0.4,
      propriedades: { fala: 'Olá', numero: 4, ativo: false },
    }),
  ]
  return d
}
test('apagar um objeto desassocia o marcador que permanece sem apagar propriedades ou pose; undo restaura o vínculo', () => {
  const d = cena(),
    antes = structuredClone(d),
    comandos = [
      ...comandosParaSoltarAssociacoesDeMarcadores(d, ['o']),
      { tipo: 'instancia.remover' as const, id: 'o' },
    ]
  const depois = executarLote(
    { documento: d, revisao: 0 },
    { revisaoEsperada: 0, comandos },
  ).documento
  expect(depois.instancias).toEqual([])
  expect(depois.marcadores).toEqual([{ ...d.marcadores[0]!, objeto: null }])
  expect(d).toEqual(antes)
  expect(
    executarLote(
      { documento: depois, revisao: 1 },
      { revisaoEsperada: 1, comandos: inverterLote(d, depois) },
    ).documento,
  ).toEqual(d)
  d.marcadores[0]!.bloqueado = true
  expect(() => comandosParaSoltarAssociacoesDeMarcadores(d, ['o'])).toThrow('Destranque')
  expect(comandosParaSoltarAssociacoesDeMarcadores(d, ['o', 'm'])).toEqual([])
})
test('marcador pode associar a raiz de conjunto e a colagem remapeia esse vínculo', () => {
  const d = cena(),
    conteudo = capturarConteudoDeConjunto(d, ['o'], 'conta')
  d.definicoesConjuntos = [
    { id: 'def', nome: 'Jardim', biblioteca: 'b', conjunto: 'j', revisao: 1, conteudo },
  ]
  d.montagens = [
    {
      id: 'raiz',
      nome: 'Jardim',
      definicao: 'def',
      grupo: null,
      oculto: false,
      bloqueado: false,
      transformacao: d.instancias[0]!.transformacao,
    },
  ]
  d.marcadores[0]!.objeto = 'raiz'
  const f = capturarFragmento(d, ['raiz', 'm'], 'conta'),
    destino = colarFragmento(criarDocumentoVazio('n', 'N'), f, 'p', f.ancora)
  expect(destino.marcadores[0]!.objeto).toBe(destino.montagens![0]!.id)
})

test('centenas de associações são soltas em um comando; trava de qualquer marcador recusa o lote inteiro', () => {
  const d = cena(),
    m = d.marcadores[0]!
  d.marcadores = Array.from({ length: 600 }, (_, i) => ({ ...m, id: `m${i}` }))
  const comandos = comandosParaSoltarAssociacoesDeMarcadores(d, ['o'])
  expect(comandos).toHaveLength(1)
  const depois = executarLote(
    { documento: d, revisao: 0 },
    { revisaoEsperada: 0, comandos },
  ).documento
  expect(depois.marcadores.every((m) => m.objeto === null)).toBe(true)
  expect(d.marcadores.every((m) => m.objeto === 'o')).toBe(true)
  d.marcadores[599]!.bloqueado = true
  expect(() =>
    executarLote({ documento: d, revisao: 0 }, { revisaoEsperada: 0, comandos }),
  ).toThrow('bloquead')
  expect(d.marcadores.every((m) => m.objeto === 'o')).toBe(true)
})

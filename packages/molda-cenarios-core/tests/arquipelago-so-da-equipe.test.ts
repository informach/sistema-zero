import { expect, test } from 'bun:test'
import {
  camposDoArquipelagoMudados,
  criarDocumentoVazio,
  type DocumentoDeCenario,
  type InstanciaDeCenario,
} from '../src/v2'

const objeto = (id: string, propriedades?: Record<string, string | number | boolean>) =>
  ({
    id,
    nome: id,
    grupo: null,
    bloqueado: false,
    oculto: false,
    modelo: 'm',
    transformacao: {
      posicao: { x: 0, y: 0, z: 0 },
      rotacao: { x: 0, y: 0, z: 0 },
      escala: { x: 1, y: 1, z: 1 },
    },
    apoio: { tipo: 'absoluto' },
    colisao: 'caixa',
    ...(propriedades ? { propriedades } : {}),
  }) as InstanciaDeCenario
const doc = (...instancias: InstanciaDeCenario[]): DocumentoDeCenario => ({
  ...criarDocumentoVazio('11111111-1111-4111-8111-111111111111', 'Ilha'),
  instancias,
})

test('criar ou mudar um campo arquipelago.* aparece; as outras propriedades não contam', () => {
  const antes = doc(objeto('a', { cor: 'azul' }), objeto('b', { 'arquipelago.fisica': 'caixa' }))
  expect(camposDoArquipelagoMudados(antes, antes)).toEqual([])
  // Mudar uma propriedade comum é livre.
  expect(
    camposDoArquipelagoMudados(
      antes,
      doc(objeto('a', { cor: 'verde' }), objeto('b', { 'arquipelago.fisica': 'caixa' })),
    ),
  ).toEqual([])
  // Criar num objeto novo e mudar num que já tinha.
  expect(
    camposDoArquipelagoMudados(
      antes,
      doc(
        objeto('a', { cor: 'azul', 'arquipelago.ator': 'iris' }),
        objeto('b', { 'arquipelago.fisica': 'tronco' }),
      ),
    ).sort(),
  ).toEqual(['a', 'b'])
})

test('tirar um campo que já existia continua valendo', () => {
  const antes = doc(objeto('b', { 'arquipelago.fisica': 'caixa', cor: 'azul' }))
  expect(camposDoArquipelagoMudados(antes, doc(objeto('b', { cor: 'azul' })))).toEqual([])
  expect(camposDoArquipelagoMudados(antes, doc())).toEqual([])
})

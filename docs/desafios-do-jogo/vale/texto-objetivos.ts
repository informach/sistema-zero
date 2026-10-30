import type { PublicoDoDesafio } from '../../../packages/arquipelago-contracts/src/desafios'
import type {
  ExecutionStep,
  FunctionCase,
} from '../../../packages/core/src/learning/project-execution'
import type { SectionJavaScriptProjectCheck } from '../../../packages/core/src/learning/section-progression'
import { VALE_TEXTO } from './texto-projetos'

const enter: ExecutionStep = { action: 'press', key: 'Enter', holdMs: 30 }
const esperar = (ms: number): ExecutionStep => ({ action: 'wait', ms })
const torre = VALE_TEXTO.torre
const funcao = (name: string, cases: FunctionCase[]) =>
  ({ type: 'functionReturns', name, cases }) as const

/** Uma nuvem de cinza como `escolherAlvo` recebe: posição, o quanto andou e a vida. */
const nuvem = (x: number, y: number, andou: number) => ({ x, y, andou, vida: 2 })
/** Perto da torre (31 de distância). */
const perto = nuvem(330, 200, 300)
/** No alcance (125 de distância) e mais adiantada. */
const adiantada = nuvem(400, 340, 700)
/** A mais adiantada de todas, fora do alcance (283 de distância). */
const longe = nuvem(600, 340, 900)

const rotulos: Record<PublicoDoDesafio, Record<string, string>> = {
  kids: {
    'primeira-onda': 'Enter chama a primeira onda com três nuvens de cinza.',
    'ondas-crescem': 'Cada onda traz uma nuvem a mais que a anterior.',
    alcance: 'A torre alcança só as nuvens até a distância do alcance, contando x e y.',
    alvo: 'A torre escolhe a nuvem mais adiantada entre as que estão no alcance.',
    protege: 'Na primeira onda, a torre desfaz pelo menos uma nuvem de cinza.',
    recomecar: 'Extra: R recomeça a partida, sem ondas, nuvens nem contagens.',
  },
  adulto: {
    'primeira-onda': 'Enter inicia a primeira onda com três inimigos.',
    'ondas-crescem': 'Cada onda tem um inimigo a mais que a anterior (numero + 2).',
    alcance: 'dentroDoAlcance usa a distância euclidiana e inclui a borda do alcance.',
    alvo: 'escolherAlvo devolve o inimigo mais avançado dentro do alcance, ou null.',
    protege: 'Na primeira onda, a torre elimina pelo menos um inimigo.',
    recomecar: 'Extra: R reinicia a partida (onda, inimigos e contadores).',
  },
}
const dicas: Record<PublicoDoDesafio, Record<string, string>> = {
  kids: {
    'primeira-onda': 'criarOnda(1) precisa devolver uma lista com três objetos.',
    'ondas-crescem': 'Use numero + 2 como o limite do laço que monta a lista.',
    alcance: 'Math.hypot(dx, dy) mede a distância. Na borda, a nuvem ainda está no alcance.',
    alvo: 'Guarde a melhor até agora e troque quando achar uma no alcance que andou mais.',
    protege: 'A torre só atira quando escolherAlvo devolve uma nuvem.',
    recomecar: 'No evento de teclado, confira evento.key igual a r.',
  },
  adulto: {
    'primeira-onda': 'criarOnda(1) deve devolver três objetos.',
    'ondas-crescem': 'O tamanho da onda é numero + 2.',
    alcance: 'Use Math.hypot e compare com <=.',
    alvo: 'Filtre pelo alcance antes de comparar andou.',
    protege: 'O laço do jogo já aplica o dano no alvo escolhido.',
    recomecar: 'Zere onda, cinzas, protegidos e vidas no evento da tecla r.',
  },
}

export function objetivosDoValeTexto(publico: PublicoDoDesafio): SectionJavaScriptProjectCheck[] {
  const texto = (id: string) => ({ label: rotulos[publico][id]!, hint: dicas[publico][id]! })
  return [
    {
      id: 'primeira-onda',
      ...texto('primeira-onda'),
      programmingLanguage: 'javascript',
      rule: {
        type: 'behavior',
        steps: [enter, esperar(300)],
        expect: { target: { kind: 'value', path: 'cinzas.length' }, compare: 'equals', value: 3 },
      },
    },
    {
      id: 'ondas-crescem',
      ...texto('ondas-crescem'),
      programmingLanguage: 'javascript',
      rule: funcao('quantasNaOnda', [
        { args: [1], expected: 3 },
        { args: [2], expected: 4 },
        { args: [5], expected: 7 },
      ]),
    },
    {
      id: 'alcance',
      ...texto('alcance'),
      programmingLanguage: 'javascript',
      rule: funcao('dentroDoAlcance', [
        { args: [torre, { x: 400, y: 300 }], expected: true },
        { args: [torre, { x: 440, y: 330 }], expected: false },
        { args: [torre, { x: 470, y: 230 }], expected: true },
        { args: [torre, { x: 340, y: 50 }], expected: false },
      ]),
    },
    {
      id: 'alvo',
      ...texto('alvo'),
      programmingLanguage: 'javascript',
      rule: funcao('escolherAlvo', [
        { args: [torre, [perto, adiantada, longe]], expected: adiantada },
        { args: [torre, [longe]], expected: null },
      ]),
    },
    {
      id: 'protege',
      ...texto('protege'),
      programmingLanguage: 'javascript',
      rule: {
        type: 'behavior',
        steps: [enter, esperar(9000)],
        expect: { target: { kind: 'value', path: 'protegidos' }, compare: 'atLeast', value: 1 },
      },
    },
    {
      id: 'recomecar',
      ...texto('recomecar'),
      optional: true,
      programmingLanguage: 'javascript',
      rule: {
        type: 'behavior',
        steps: [enter, esperar(300), { action: 'press', key: 'r', holdMs: 30 }],
        expect: { target: { kind: 'value', path: 'onda' }, compare: 'equals', value: 0 },
        checkpoints: [
          {
            afterStep: 2,
            expect: { target: { kind: 'value', path: 'onda' }, compare: 'equals', value: 1 },
          },
          {
            afterStep: 3,
            expect: {
              target: { kind: 'value', path: 'cinzas.length' },
              compare: 'equals',
              value: 0,
            },
          },
        ],
      },
    },
  ]
}

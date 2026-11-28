import { expect, test } from 'bun:test'
import { isManifestQuiz, type ManifestQuiz, validatePredictionQuiz } from '../src/learning'

type PredictionScene = NonNullable<ManifestQuiz['questions'][number]['predictionScene']>

/** As cenas de previsão que o manifesto aceita (as mesmas do members, do member-shell e do Admin). */
const SCENES = [
  'garden-touch',
  'garden-count',
  'garden-repeat',
  'lighthouse-order',
  'lighthouse-memory',
  'lighthouse-door',
  'lighthouse-retest',
  'island-view',
  'island-position',
  'island-height',
  'island-retest',
  'jardim-memory',
  'jardim-view',
  'jardim-height',
  'moedas-poucas',
  'moedas-igual',
  'moedas-volta',
  'cabana-so-chave',
  'cabana-ou',
  'cabana-ordem',
  'ponte-a-tempo',
  'ponte-atrasado',
  'ponte-de-novo',
  'simbolos-ordem',
  'simbolos-fora',
  'simbolos-recomeca',
  'escudo-protege',
  'escudo-acabou',
  'escudo-renova',
  'escudo-sem-guarda',
  'triplo-juntos',
  'triplo-leque',
  'triplo-um',
  'triplo-grupos',
  'inimigo-meio',
  'inimigo-segue',
  'inimigo-acerta',
  'inimigo-limpeza',
  'chefao-um-tiro',
  'chefao-sem-retirada',
  'chefao-sem-guarda',
  'chefao-guarda',
  'arma-trancada',
  'arma-plasma',
  'arma-reinicio',
  'arma-placar',
] as const satisfies readonly PredictionScene[]

const quiz = (predictionScene: string): unknown => ({
  kind: 'quiz',
  passingScore: 100,
  questions: [
    {
      id: 'q',
      predictionScene,
      prompt: 'O que vai acontecer?',
      choices: [
        { id: 'a', label: 'Isto.' },
        { id: 'b', label: 'Aquilo.' },
      ],
      correctChoiceIds: ['a'],
    },
  ],
})

test.each(SCENES)('o manifesto aceita a cena de previsão %s', (scene) => {
  expect(isManifestQuiz(quiz(scene))).toBe(true)
  expect(validatePredictionQuiz([{ predictionScene: scene, correctChoiceIds: ['a'] }])).toBeNull()
})

test('cena de previsão desconhecida é recusada', () => {
  expect(isManifestQuiz(quiz('escudo-quebrado'))).toBe(false)
  expect(validatePredictionQuiz([{ predictionScene: 'escudo-quebrado' }])).toBe(
    'Cena da previsão inválida',
  )
})

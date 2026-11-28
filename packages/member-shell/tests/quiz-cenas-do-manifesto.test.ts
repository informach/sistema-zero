import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { validatePredictionQuiz } from '@sistemazero/core/learning'
import { ARMA_QUIZ_SCENES } from '../src/components/quiz-arma-scene'
import { CHEFAO_QUIZ_SCENES } from '../src/components/quiz-chefao-scene'
import { ESCUDO_QUIZ_SCENES } from '../src/components/quiz-escudo-scene'
import { INIMIGO_QUIZ_SCENES } from '../src/components/quiz-inimigo-scene'
import { TRIPLO_QUIZ_SCENES } from '../src/components/quiz-triplo-scene'

/**
 * ⚠️ As cenas de previsão dos Poderes do Construtor (28/11/2026): o `prediction-quiz.tsx` escolhe o
 * componente pelo PREFIXO do id, e cada componente cai no caso de fábrica, em silêncio, com um id
 * que não conhece. Uma cena nova no manifesto sem o caso no componente mostraria à criança a
 * demonstração de outra pergunta. As cenas vêm do tipo `ManifestQuiz` do core (a lista que o
 * manifesto aceita), lidas do arquivo, porque o core não exporta a lista em tempo de execução.
 */
const fonte = readFileSync(
  resolve(import.meta.dir, '../../core/src/learning/manifest-quiz.ts'),
  'utf8',
)
const uniao = fonte.match(/predictionScene\?:\s*((?:\|\s*'[a-z0-9-]+'\s*)+)/)?.[1] ?? ''
const DO_MANIFESTO = [...uniao.matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1] ?? '')

const COMPONENTES: [string, readonly string[]][] = [
  ['escudo-', ESCUDO_QUIZ_SCENES],
  ['triplo-', TRIPLO_QUIZ_SCENES],
  ['inimigo-', INIMIGO_QUIZ_SCENES],
  ['chefao-', CHEFAO_QUIZ_SCENES],
  ['arma-', ARMA_QUIZ_SCENES],
]

describe('as cenas de previsão dos Poderes têm o caso no componente', () => {
  test('a leitura do manifesto acha as cenas, e o core aceita cada uma', () => {
    expect(DO_MANIFESTO.length).toBeGreaterThan(20)
    for (const scene of DO_MANIFESTO)
      expect(validatePredictionQuiz([{ predictionScene: scene }]), scene).toBeNull()
  })

  test.each(COMPONENTES)('%s: a lista do componente é a do manifesto', (prefixo, lista) => {
    const doManifesto = DO_MANIFESTO.filter((scene) => scene.startsWith(prefixo))
    expect(doManifesto.length).toBeGreaterThan(0)
    expect([...lista].sort()).toEqual([...doManifesto].sort())
  })
})

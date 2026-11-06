import { z } from 'zod'
import type { QuizStep } from '../../content/quiz-config'
import type { ResultadoConversa } from '../../content/resultado-conversa'
import type { QuizAnswers } from '../../lib/quiz-types'
import type { FunnelQuiz } from '../registry'
import { BRANCHES, KIDS_ENGINES } from './engine'
import { DEFAULT_HEADLINE, QUIZ_HEADLINES } from './entry'
import { buildNarrative } from './narrative'
import type { CompleteAnswers, KidsMode } from './types'

export function buildKidsResult(mode: KidsMode, answers: QuizAnswers): ResultadoConversa | null {
  const engine = KIDS_ENGINES[mode]
  if (!engine.isComplete(answers)) return null
  const a = engine.normalize(answers),
    r = buildNarrative(mode, a as CompleteAnswers)
  const { terms, invitation, ...leitura } = r.reading
  return {
    tema: a.idade === 'm9' ? 'kids-m9' : 'kids',
    titulo: r.title,
    assinatura: '',
    perfil: engine.computePerfil(answers)!,
    destino: r.href,
    blocos: [
      { tipo: 'leitura', leitura, atencao: r.attention },
      {
        tipo: 'cta',
        texto: invitation,
        termos: terms,
        rotulo: r.cta,
        href: r.href,
        nota: 'Veja como funciona, os exemplos e as condições. O botão não realiza uma compra.',
      },
    ],
    evento: {
      quiz_version: engine.version,
      revision: answers._quiz_revision,
      ramo: engine.branchOf(answers),
      perfil_principal: a.prioridade,
      adequacao: r.fit,
      destino: r.href,
    },
  }
}
export function createKidsQuiz(mode: KidsMode, legacySteps: QuizStep[]): FunnelQuiz {
  const engine = KIDS_ENGINES[mode]
  return {
    version: engine.version,
    presentation: mode === 'desafio' ? 'desafio-kids' : 'comunidade',
    steps: engine.steps,
    total: 10,
    valueSchema: Object.fromEntries(
      engine.steps.map((s) => [
        s.key,
        z
          .string()
          .max(64)
          .refine((v) => engine.validChoice(s, v)),
      ]),
    ),
    activeSteps: engine.activeSteps,
    applyAnswer: engine.applyAnswer,
    isComplete: engine.isComplete,
    computePerfil: engine.computePerfil,
    headlines: Object.fromEntries(Object.entries(QUIZ_HEADLINES).map(([id, h]) => [id, h.label])),
    defaultHeadline: DEFAULT_HEADLINE,
    legacySteps,
    branches: BRANCHES,
    branchOf: engine.branchOf,
    conversa: (answers) => buildKidsResult(mode, answers),
  }
}

import { z } from 'zod'
import type { QuizStep } from '../../content/quiz-config'
import type { ResultadoConversa } from '../../content/resultado-conversa'
import type { QuizAnswers } from '../../lib/quiz-types'
import type { FunnelQuiz } from '../registry'
import { ADULT_ENGINES } from './engine'
import { DEFAULT_HEADLINE, ENTRY } from './entry'
import { buildNarrative } from './narrative'
import type { AdultMode, CompleteAnswers } from './types'

export function buildAdultResult(mode: AdultMode, answers: QuizAnswers): ResultadoConversa | null {
  const e = ADULT_ENGINES[mode]
  if (!e.isComplete(answers)) return null
  const a = e.normalize(answers) as CompleteAnswers,
    r = buildNarrative(mode, a)
  return {
    tema: 'adulto',
    titulo: r.title,
    assinatura: '',
    perfil: e.computePerfil(answers)!,
    destino: r.href,
    blocos: [
      { tipo: 'autonomia', leitura: r },
      { tipo: 'cta', texto: r.note, rotulo: r.cta, href: r.href, nota: r.disclaimer },
    ],
    evento: {
      quiz_version: e.version,
      revision: answers._quiz_revision,
      perfil_principal: a.conquista,
      adequacao: r.flags,
      destino: r.href,
    },
  }
}
export function createAdultQuiz(mode: AdultMode, legacySteps: QuizStep[]): FunnelQuiz {
  const e = ADULT_ENGINES[mode]
  return {
    version: e.version,
    presentation: mode === 'desafio' ? 'desafio-adulto' : 'comunidade-adulto',
    steps: e.steps,
    total: 10,
    valueSchema: Object.fromEntries(
      e.steps.map((s) => [
        s.key,
        s.multiple
          ? z
              .array(z.string().max(64))
              .min(1)
              .max(s.maxSelections ?? s.opcoes.length)
              .refine((v) => e.validChoice(s, v))
          : z
              .string()
              .max(64)
              .refine((v) => e.validChoice(s, v)),
      ]),
    ),
    activeSteps: e.activeSteps,
    applyAnswer: e.applyAnswer,
    isComplete: e.isComplete,
    computePerfil: e.computePerfil,
    headlines: { [DEFAULT_HEADLINE]: ENTRY[mode].title },
    defaultHeadline: DEFAULT_HEADLINE,
    legacySteps,
    conversa: (answers) => buildAdultResult(mode, answers),
  }
}

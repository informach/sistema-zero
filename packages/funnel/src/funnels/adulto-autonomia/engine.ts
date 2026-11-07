import type { SelecaoStep } from '../../content/quiz-config'
import type { QuizAnswers, QuizAnswerValue } from '../../lib/quiz-types'
import data from './questions.json'
import type { AdultMode, AdultQuestionData, NormalizedAnswers, QuestionId } from './types'

const QUESTIONS = data as AdultQuestionData
export const VERSIONS = {
  desafio: 'desafio-autonomia-v2',
  comunidade: 'comunidade-autonomia-v2',
} as const
const LABELS: Record<QuestionId, string> = {
  interesse: 'Interesse',
  experiencia: 'Experiência',
  computador: 'Computador',
  trava: 'Dificuldade',
  ajuda: 'Reação à dificuldade',
  condicao: 'Condições para seguir',
  efeito: 'Efeito entre tentativas',
  peso: 'O que fica adiado',
  conquista: 'Conquista desejada',
  beneficio: 'Valor pessoal',
}

export function createAdultEngine(mode: AdultMode) {
  const version = VERSIONS[mode]
  const current = (a: QuizAnswers): QuizAnswers => (a._quiz_version === version ? a : {})
  const steps: SelecaoStep[] = []
  const contexts = new Map<string, SelecaoStep>()
  const ids = new Map<string, QuestionId>()
  for (const q of QUESTIONS[mode])
    for (const variant of q.variants) {
      const key = `autonomia_${q.id}${variant.key === 'base' ? '' : `_${variant.key}`}`
      const step: SelecaoStep = {
        id: steps.length,
        key,
        quizPosition: q.number,
        tipo: 'selecao',
        etapa: q.number <= 3 ? 'rotina' : q.number <= 8 ? 'trava' : 'quer',
        titulo: variant.title,
        subtitulo: variant.note,
        rotuloCurto: LABELS[q.id],
        eventName: `respondeu_${mode}_autonomia_v2_${q.id}`,
        lastStep: `${mode}_v2_${key}`,
        ...(q.multiple ? { multiple: true, maxSelections: 4, exclusive: ['nenhuma'] } : {}),
        opcoes: variant.options.map((o) => ({
          value: o.id,
          label: [o.label, o.detail].filter(Boolean).join(' '),
          ...(o.detail ? { heading: o.label } : {}),
        })),
      }
      steps.push(step)
      contexts.set(`${q.id}/${variant.key}`, step)
      ids.set(key, q.id)
    }
  const validChoice = (step: SelecaoStep, value: unknown): boolean => {
    const allowed = (v: unknown) => typeof v === 'string' && step.opcoes.some((o) => o.value === v)
    if (!step.multiple) return allowed(value)
    return (
      Array.isArray(value) &&
      value.length > 0 &&
      value.length <= (step.maxSelections ?? step.opcoes.length) &&
      value.every(allowed) &&
      new Set(value).size === value.length &&
      (!(step.exclusive ?? []).some((v) => value.includes(v)) || value.length === 1)
    )
  }
  function variantOf(id: QuestionId, a: NormalizedAnswers): string | null {
    if (['trava', 'ajuda', 'efeito', 'peso'].includes(id)) {
      if (!a.experiencia) return null
      const experience = a.experiencia === 'nunca' ? 'iniciante' : 'experiente'
      if (id === 'peso')
        return a.efeito
          ? `${experience}_${['avanco', 'tranquilo'].includes(String(a.efeito)) ? 'avanca' : 'adiado'}`
          : null
      return experience
    }
    if (id === 'beneficio') return typeof a.conquista === 'string' ? a.conquista : null
    return 'base'
  }
  function resolve(a: QuizAnswers) {
    const source = current(a),
      normalized: NormalizedAnswers = {},
      active: SelecaoStep[] = []
    for (const q of QUESTIONS[mode]) {
      const variant = variantOf(q.id, normalized),
        step = variant ? contexts.get(`${q.id}/${variant}`) : undefined
      if (!step) continue
      active.push(step)
      if (validChoice(step, source[step.key])) normalized[q.id] = source[step.key]
    }
    return { active, normalized }
  }
  const activeSteps = (a: QuizAnswers) => resolve(a).active
  const isComplete = (a: QuizAnswers) =>
    a._quiz_version === version &&
    activeSteps(a).length === 10 &&
    activeSteps(a).every((s) => validChoice(s, a[s.key]))
  function applyAnswer(a: QuizAnswers, key: string, value: QuizAnswerValue): QuizAnswers | null {
    if (typeof a._quiz_version === 'string' && a._quiz_version !== version) return null
    const base: QuizAnswers = { ...current(a), _quiz_version: version },
      active = activeSteps(base),
      index = active.findIndex((s) => s.key === key),
      step = active[index]
    if (
      !step ||
      !validChoice(step, value) ||
      active.slice(0, index).some((s) => !validChoice(s, base[s.key]))
    )
      return null
    const next: QuizAnswers = { ...base, [key]: value }
    // Contextual keys make old variants ineligible. Independent later answers remain available.
    const allowed = new Set(activeSteps(next).map((s) => s.key))
    for (const k of Object.keys(next))
      if (k !== '_quiz_version' && k !== '_quiz_revision' && !allowed.has(k)) delete next[k]
    next._quiz_revision = (typeof a._quiz_revision === 'number' ? a._quiz_revision : 0) + 1
    return next
  }
  return {
    version,
    steps,
    validChoice,
    activeSteps,
    isComplete,
    applyAnswer,
    normalize: (a: QuizAnswers) => resolve(a).normalized,
    questionId: (key: string) => ids.get(key),
    computePerfil: (a: QuizAnswers) =>
      isComplete(a) ? `autonomia-${resolve(a).normalized.conquista}` : null,
    completesQuiz: (a: QuizAnswers, key: string, value: QuizAnswerValue) => {
      const next = applyAnswer(a, key, value)
      return !!next && isComplete(next)
    },
  }
}
export const ADULT_ENGINES = {
  desafio: createAdultEngine('desafio'),
  comunidade: createAdultEngine('comunidade'),
}

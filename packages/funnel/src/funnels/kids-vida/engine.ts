import type { SelecaoStep } from '../../content/quiz-config'
import type { QuizAnswers, QuizAnswerValue } from '../../lib/quiz-types'
import { flex } from './language'
import data from './questions.json'
import type { Age, KidsMode, QuestionData, QuestionId } from './types'

const QUESTIONS: QuestionData = data as unknown as QuestionData
export const VERSIONS = { desafio: 'desafio-vida-v6', comunidade: 'comunidade-vida-v7' } as const
export const BRANCHES = {
  '9a12': 'De 9 a 12 anos',
  '13a17': 'De 13 a 17 anos',
  m9: 'Menores de 9 anos',
  adulto: '18 anos ou mais',
}
export const SKILLS: Record<string, string> = {
  planejar: 'Autonomia',
  persistir: 'Persistência',
  raciocinar: 'Resolução de problemas',
  expressar: 'Comunicação',
  rotina: 'Organização',
  explorar: 'Observar e descobrir',
}
const SCENE_SKILLS: Record<string, string> = {
  comecar: 'planejar',
  erro: 'persistir',
  modelo: 'raciocinar',
  explicar: 'expressar',
  rotina: 'rotina',
}
const AGE_VALUES: Record<string, Age> = { menos_9: 'm9', '9_12': '9a12', '13_17': '13a17' }
const AGE_OPTION: Record<string, string> = {
  m9: 'menos_9',
  '9a12': '9_12',
  '13a17': '13_17',
  adulto: '18_mais',
}
const LABELS: Record<QuestionId, string> = {
  idade: 'Idade',
  interesse: 'Interesses',
  cena: 'Situação do cotidiano',
  tentativas: 'Ajuda e tentativas',
  impacto: 'Efeito na rotina',
  alcance: 'Outras situações',
  prioridade: 'Habilidade desejada',
  beneficio: 'Conquista desejada',
  apoio: 'Apoio disponível',
  condicao: 'O que precisa conferir',
}
const ORDER = QUESTIONS.desafio['9a12'].map((q) => q.id)
export const profileLabels = Object.fromEntries(
  Object.entries(BRANCHES)
    .filter(([age]) => age !== 'adulto')
    .flatMap(([age, label]) =>
      Object.entries(SKILLS).map(([id, name]) => [`vida-${age}-${id}`, `${name} · ${label}`]),
    ),
)

export function createKidsEngine(mode: KidsMode) {
  const version = VERSIONS[mode]
  const current = (a: QuizAnswers): QuizAnswers => (a._quiz_version === version ? a : {})
  const ageOf = (a: QuizAnswers): Age | undefined => AGE_VALUES[String(current(a).idade)]
  const branchOf = (a: QuizAnswers) =>
    current(a).idade === '18_mais' ? 'adulto' : (ageOf(a) ?? null)
  const childGender = (a: QuizAnswers): 'm' | 'f' => (a.genero === 'filha' ? 'f' : 'm')
  const prefix = mode === 'desafio' ? 'desafio_v6' : 'comunidade_v7'
  const genero: SelecaoStep = {
    id: 0,
    key: 'genero',
    quizPosition: 0,
    tipo: 'selecao',
    etapa: 'rotina',
    rotuloCurto: 'Filho ou filha',
    titulo: 'Em quem você está pensando?',
    subtitulo: 'Uma criança de cada vez.',
    lastStep: `${prefix}_genero`,
    eventName: `respondeu_${prefix}_genero`,
    opcoes: [
      {
        value: 'filho',
        label: 'Responder sobre meu filho',
        image: '/img/comunidade-dos-criadores/dede-fala.webp',
      },
      {
        value: 'filha',
        label: 'Responder sobre minha filha',
        image: '/img/comunidade-dos-criadores/debinha-fala.webp',
      },
    ],
  }
  const steps: SelecaoStep[] = [genero]
  const byContext = new Map<string, SelecaoStep>()
  for (const age of Object.keys(QUESTIONS[mode]) as Age[])
    for (const group of QUESTIONS[mode][age]) {
      if (group.id === 'idade' && steps.some((s) => s.key === 'idade')) continue
      for (const variant of group.variants) {
        const common = group.id === 'idade'
        const key = common
          ? 'idade'
          : `vida_${age}_${group.id}${variant.key === 'default' ? '' : `_${variant.key}`}`
        const step: SelecaoStep = {
          id: steps.length,
          key,
          quizPosition: group.number,
          tipo: 'selecao',
          etapa: group.number <= 2 ? 'rotina' : group.number <= 6 ? 'casa' : 'desejo',
          stageLabel: variant.stage,
          titulo: variant.title,
          subtitulo: variant.note,
          rotuloCurto: LABELS[group.id],
          lastStep: `${prefix}_${key}`,
          // Variantes mutuamente exclusivas compartilham o marco da pergunta, mas têm chaves
          // distintas em respostas e snapshots. Performance conta a pergunta; Métricas mostra a variante.
          eventName: `respondeu_${prefix}_${common ? 'idade' : `${age}_${group.id}`}`,
          ...(!common ? { ramo: age } : {}),
          opcoes: variant.options.map(([value, label]) => {
            const skill =
              group.id === 'cena'
                ? SCENE_SKILLS[value]
                : group.id === 'prioridade' && value !== 'explorar'
                  ? value
                  : null
            const heading = skill ? SKILLS[skill] : undefined
            const example =
              group.id === 'prioridade' && heading
                ? `Por exemplo: ${label.charAt(0).toLowerCase()}${label.slice(1)}`
                : label
            return {
              value: common ? AGE_OPTION[value]! : value,
              label: heading ? `${heading}: ${example}` : label,
              ...(heading ? { heading } : {}),
            }
          }),
        }
        steps.push(step)
        byContext.set(common ? 'idade' : `${age}/${group.id}/${variant.key}`, step)
      }
    }
  const idade = byContext.get('idade')!
  const variantKey = (id: QuestionId, a: Record<string, string>) => {
    if (id === 'tentativas')
      return a.cena && ['vai_bem', 'nao_sei'].includes(a.cena) ? a.cena : a.cena ? 'comecar' : null
    if (id === 'impacto' || id === 'alcance') return a.cena ?? null
    if (id === 'beneficio') return a.prioridade ?? null
    return 'default'
  }
  function resolve(a: QuizAnswers) {
    const source = current(a),
      age = ageOf(a)
    const normalized: Record<string, string> = {
      genero: String(source.genero ?? ''),
      idade: age ?? '',
    }
    const active = [genero, idade]
    if (age)
      for (const id of ORDER.slice(1)) {
        const variant = variantKey(id, normalized)
        if (!variant) break
        const step = byContext.get(`${age}/${id}/${variant}`)
        if (!step) break
        active.push(step)
        if (typeof source[step.key] === 'string') normalized[id] = source[step.key] as string
      }
    return { active, normalized }
  }
  const validChoice = (step: SelecaoStep, value: unknown) =>
    typeof value === 'string' && step.opcoes.some((o) => o.value === value)
  const activeSteps = (a: QuizAnswers) => resolve(a).active
  const isComplete = (a: QuizAnswers) =>
    a._quiz_version === version &&
    !!ageOf(a) &&
    activeSteps(a).length === 11 &&
    activeSteps(a).every((s) => validChoice(s, a[s.key]))
  function applyAnswer(a: QuizAnswers, key: string, value: QuizAnswerValue): QuizAnswers | null {
    if (typeof a._quiz_version === 'string' && a._quiz_version !== version) return null
    const base: QuizAnswers = { ...current(a), _quiz_version: version }
    const active = activeSteps(base),
      index = active.findIndex((s) => s.key === key),
      step = active[index]
    if (
      !step ||
      !validChoice(step, value) ||
      active.slice(0, index).some((s) => !validChoice(s, base[s.key]))
    )
      return null
    const next: QuizAnswers = { ...base, [key]: value }
    if (key === `vida_${ageOf(base)}_cena` && base[key] !== value)
      for (const k of Object.keys(next))
        if (k.startsWith(`vida_${ageOf(base)}_tentativas_`)) delete next[k]
    // Only answers belonging to the newly selected age/scene/priority survive. Iteration also
    // removes context-dependent answers that become unreachable after their parent is removed.
    const allowed = new Set(activeSteps(next).map((s) => s.key))
    for (const k of Object.keys(next))
      if (k !== '_quiz_version' && k !== '_quiz_revision' && !allowed.has(k)) delete next[k]
    next._quiz_revision = (typeof a._quiz_revision === 'number' ? a._quiz_revision : 0) + 1
    return next
  }
  const normalize = (a: QuizAnswers) => resolve(a).normalized
  return {
    version,
    steps,
    genero,
    idade,
    branchOf,
    childGender,
    validChoice,
    activeSteps,
    isComplete,
    applyAnswer,
    normalize,
    isAdultExit: (a: QuizAnswers) => branchOf(a) === 'adulto',
    computePerfil: (a: QuizAnswers) =>
      isComplete(a) ? `vida-${ageOf(a)}-${normalize(a).prioridade}` : null,
    completesQuiz: (a: QuizAnswers, key: string, value: QuizAnswerValue) => {
      const next = applyAnswer(a, key, value)
      return !!next && isComplete(next)
    },
    stepOnScreen: (s: SelecaoStep, a: QuizAnswers): SelecaoStep => ({
      ...s,
      titulo: flex(s.titulo, normalize(a)),
      subtitulo: s.subtitulo ? flex(s.subtitulo, normalize(a)) : undefined,
      stageLabel: s.stageLabel ? flex(s.stageLabel, normalize(a)) : undefined,
      opcoes: s.opcoes.map((o) => ({ ...o, label: flex(o.label, normalize(a)) })),
    }),
  }
}
export const KIDS_ENGINES = {
  desafio: createKidsEngine('desafio'),
  comunidade: createKidsEngine('comunidade'),
}

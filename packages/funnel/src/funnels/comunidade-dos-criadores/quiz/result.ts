import type { QuizAnswers } from '../../../lib/quiz-types'
import { comunidadeOfferPath } from '../oferta'
import { RELATOS } from '../oferta/relatos'
import type { RelatoId } from '../oferta/types'
import { type CommunityDecision, type Condition, communityDecision, PROFILE_IDS } from './engine'
import { flexionar } from './genero'
import { HORAS_POR_ANO } from './questions'
import {
  A_SCENE_BRIDGE,
  APPROXIMATE_NOTE,
  COMMUNITY_OPENING,
  CONDITION_COPY,
  CREATION_SENTENCE,
  CTA_WITH_UNMET_CONDITION,
  F_GOING_WELL_WORRY,
  MIRROR_AGE,
  MIRROR_COMPUTER,
  MIRROR_CONDITIONAL,
  MIRROR_CREATION,
  MIRROR_NEED,
  MIRROR_SCENE,
  MIRROR_SCREEN_TIME,
  MIRROR_STUCK,
  MIRROR_SYNTHESIS,
  MIRROR_WISH_SCENE,
  MIRROR_WORRY,
  NEED_RELATO,
  NEED_RELATO_ALT,
  NEED_SENTENCE,
  OPENER_FROM_SYNTHESIS,
  OPENER_FROM_WISH_SCENE,
  OPENER_FROM_WORRY,
  PROFILE_COPY,
  SCHOOL_CHANGE_ADD,
  SCHOOL_CHANGE_REPLACE,
  SCHOOL_SCENE_TAIL,
  SCHOOL_THESIS,
  SCHOOL_TITLE,
  SCHOOL_VISUAL,
  SCHOOL_WEIGHT,
  SCHOOL_WHERE,
  SECONDARY_SENTENCE,
  STUCK_SENTENCE,
  THESIS_A_END,
  TITLE_A_GOOD_PART,
  TITLE_F_NUMBERS,
  WISH_SCENE_RELATO,
  WISH_SCENE_SENTENCE,
  ZAPPY_AGAIN,
  ZAPPY_FIRST,
} from './result-copy'

export interface ResultCondition {
  kind: Condition
  unmet: boolean
  title: string
  text: string
}

/** De qual resposta sai o valor de cada condição. */
const CONDITION_ANSWER: Record<Condition, string> = {
  computador: 'computador',
  formato: 'garantia',
  ferramenta: 'ferramenta',
  desenho: 'desenho',
  reforco: 'escola',
}
const CONDITIONAL_KEYS = ['ferramenta', 'desenho', 'escola'] as const

/** De onde vem a abertura de "Por que isso acontece". */
type Opener = 'cena' | 'preocupacao' | 'sintese' | 'cena_desejada'

/** "O que você contou": uma linha por resposta, nas palavras da família. */
function toldLines(answers: QuizAnswers): string[] {
  const a = (key: string) => String(answers[key] ?? '')
  const lines = [
    `${MIRROR_AGE[a('crianca')]}${MIRROR_COMPUTER[a('computador')]}`,
    `Ele passa ${MIRROR_SCREEN_TIME[a('tempo_tela')]} por dia em jogos e vídeos. Isso dá ${HORAS_POR_ANO[a('tempo_tela')]} por ano, e ${MIRROR_CREATION[a('tempo_criacao')]}.`,
  ]
  if (MIRROR_SCENE[a('cena')])
    lines.push(`A cena mais comum aí em casa: ${MIRROR_SCENE[a('cena')]}.`)
  lines.push(MIRROR_STUCK[a('quando_trava')]!)
  lines.push(
    MIRROR_WORRY[a('preocupacao')]
      ? `O que mais preocupa você: ${MIRROR_WORRY[a('preocupacao')]}.`
      : 'Nada preocupa você agora: você quer aproveitar o interesse dele.',
  )
  lines.push(`A cena que você quer ver primeiro: ${MIRROR_WISH_SCENE[a('cena_desejada')]}.`)
  lines.push(MIRROR_NEED[a('garantia')]!)
  lines.push(
    MIRROR_SYNTHESIS[a('sintese')]
      ? `O que você quer para ele: ${MIRROR_SYNTHESIS[a('sintese')]}.`
      : 'Você ainda quer conhecer as possibilidades.',
  )
  for (const key of CONDITIONAL_KEYS) {
    const line = MIRROR_CONDITIONAL[key]?.[a(key)]
    if (line) lines.push(line)
  }
  return lines
}

/**
 * "Por que isso acontece" só afirma a cena de casa quando a família a escolheu. Se o perfil veio
 * de outras respostas, abre pelo que ela disse de fato: a preocupação, a frase-síntese ou a cena
 * desejada (o perfil sempre soma ao menos uma delas).
 */
function openerOf(answers: QuizAnswers, decision: CommunityDecision): Opener {
  const p = decision.profile
  if (answers.cena === p) return 'cena'
  if (answers.preocupacao === p) return 'preocupacao'
  if (answers.sintese === p) return 'sintese'
  return 'cena_desejada'
}

function whyParagraphs(answers: QuizAnswers, decision: CommunityDecision, opener: Opener) {
  const p = decision.profile
  const copy = PROFILE_COPY[p]
  const escola = String(answers.escola)
  const first =
    opener === 'cena'
      ? copy.scene
      : opener === 'preocupacao'
        ? OPENER_FROM_WORRY(MIRROR_WORRY[p]!)
        : opener === 'sintese'
          ? OPENER_FROM_SYNTHESIS(MIRROR_SYNTHESIS[p]!)
          : OPENER_FROM_WISH_SCENE(MIRROR_WISH_SCENE[p]!)

  if (p === 'A') {
    // A calculadora (I6) entra no argumento; "Isso tem explicação." só depois da cena de casa.
    const creation = CREATION_SENTENCE[String(answers.tempo_criacao)]?.replace(
      '{horas}',
      HORAS_POR_ANO[String(answers.tempo_tela)] ?? '',
    )
    const end = answers.tempo_criacao === 'boa_parte' ? THESIS_A_END.boa_parte : THESIS_A_END.padrao
    return [
      [first, creation, opener === 'cena' ? A_SCENE_BRIDGE : ''].filter(Boolean).join(' '),
      `${copy.thesis} ${end}`,
    ]
  }
  if (p === 'F') {
    const opening =
      opener === 'cena'
        ? `${copy.scene}${SCHOOL_SCENE_TAIL[escola] ?? ''}.`
        : opener === 'preocupacao' && escola === 'vai_bem'
          ? F_GOING_WELL_WORRY
          : [first, SCHOOL_WEIGHT[escola]].filter(Boolean).join(' ')
    return [opening, SCHOOL_THESIS[escola] ?? copy.thesis]
  }
  const worry = copy.worry && answers.preocupacao === p && opener !== 'preocupacao'
  return [[first, worry ? copy.worry : ''].filter(Boolean).join(' '), copy.thesis]
}

function titleOf(answers: QuizAnswers, decision: CommunityDecision, opener: Opener): string {
  const p = decision.profile
  if (p === 'A' && answers.tempo_criacao === 'boa_parte') return TITLE_A_GOOD_PART
  if (p === 'F') {
    const escola = String(answers.escola)
    if (SCHOOL_TITLE[escola]) return SCHOOL_TITLE[escola]!
    // Contas e reforço: "aprendeu a repetir os passos" só quando a família escolheu a cena da lição.
    return opener === 'cena' ? PROFILE_COPY.F.title : TITLE_F_NUMBERS
  }
  return PROFILE_COPY[p].title
}

/** O relato do perfil e o da necessidade, nunca dois da mesma pessoa. */
function relatosOf(answers: QuizAnswers, decision: CommunityDecision): RelatoId[] {
  const p = decision.profile
  const need = String(answers.garantia)
  const first: RelatoId =
    (p === 'B' && WISH_SCENE_RELATO[String(answers.cena_desejada)]) || PROFILE_COPY[p].relato
  const samePerson = (id?: RelatoId) => !id || RELATOS[id].nome === RELATOS[first].nome
  const candidate = NEED_RELATO[need]
  const second = samePerson(candidate) ? NEED_RELATO_ALT[need] : candidate
  return second && !samePerson(second) ? [first, second] : [first]
}

export function buildCommunityResult(answers: QuizAnswers) {
  const decision = communityDecision(answers)
  if (!decision) return null
  const f = (text: string) => flexionar(text, decision.gender)
  const p = decision.profile
  const copy = PROFILE_COPY[p]
  const escola = String(answers.escola)
  const wish = String(answers.cena_desejada)
  const need = String(answers.garantia)
  const opener = openerOf(answers, decision)

  const base =
    p === 'F'
      ? (SCHOOL_CHANGE_REPLACE[escola] ??
        [copy.change, SCHOOL_CHANGE_ADD[escola]].filter(Boolean).join(' '))
      : copy.change
  // A cena desejada não se repete quando já abriu o "porquê"; o segundo perfil vem à parte e só
  // quando não é a própria cena desejada (a frase da cena já fala dele).
  const change = [
    [base, opener === 'cena_desejada' ? '' : WISH_SCENE_SENTENCE[wish]].filter(Boolean).join(' '),
    decision.secondary && decision.secondary !== wish ? SECONDARY_SENTENCE[decision.secondary] : '',
  ]
  const where = [
    `${COMMUNITY_OPENING} ${(p === 'F' && SCHOOL_WHERE[escola]) || copy.where}`,
    STUCK_SENTENCE[String(answers.quando_trava)]!.replace(
      '{zappy}',
      p === 'D' ? ZAPPY_AGAIN : ZAPPY_FIRST,
    ),
  ]

  const conditions: ResultCondition[] = [
    ...decision.unmet.map((kind) => ({ kind, unmet: true })),
    ...decision.pending.map((kind) => ({ kind, unmet: false })),
  ].flatMap(({ kind, unmet }) => {
    const text = CONDITION_COPY[kind]?.[String(answers[CONDITION_ANSWER[kind]])]
    return text ? [{ kind, unmet, title: f(text.title), text: f(text.text) }] : []
  })

  return {
    decision,
    title: f(titleOf(answers, decision, opener)),
    approximateNote: decision.state === 'perfil_aproximado' ? APPROXIMATE_NOTE : null,
    told: toldLines(answers).map(f),
    why: whyParagraphs(answers, decision, opener).map(f),
    change: change.filter(Boolean).map(f),
    where: where.map(f),
    visual: (p === 'F' && SCHOOL_VISUAL[escola]) || copy.visual,
    relatos: relatosOf(answers, decision),
    conditions,
    // "Na próxima página…" fica colado ao botão; a necessidade (N9) vem antes.
    next: [NEED_SENTENCE[need], copy.next].filter((t): t is string => Boolean(t)).map(f),
    cta: f(decision.unmet.length ? CTA_WITH_UNMET_CONDITION : copy.cta),
    offerPath: comunidadeOfferPath(PROFILE_IDS[p]),
  }
}
export type CommunityResult = NonNullable<ReturnType<typeof buildCommunityResult>>

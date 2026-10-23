// Monta o resultado em conversa do quiz adulto v1 (`ResultadoConversa`, puro e sem IO). A ordem
// dos blocos segue o `EX_ADULTO` aprovado no Canvas, para os três perfis e qualquer resposta.
import type { BlocoConversa, ResultadoConversa } from '../../../content/resultado-conversa'
import type { QuizAnswers } from '../../../lib/quiz-types'
import {
  type AdultDecision,
  type AdultProfile,
  adultDecision,
  PROFILE_IDS,
  QUIZ_VERSION,
  quizRevision,
} from './engine'
import { CALCULADORA_POR_SEMANA } from './questions'
import {
  APPROXIMATE_NOTE,
  CHANGE,
  CHANGE_HEADING,
  CODE,
  COMPUTER,
  CTA_LABEL,
  CTA_TEXT,
  CTA_UNMET_LABEL,
  calculatorSentence,
  ctaUnmetText,
  FOUNDERS,
  marca,
  NEED,
  NEEDS_HEADING,
  NO_WORRY,
  OPENING_ATTEMPT,
  OPENING_CLOSE,
  OPENING_CLOSE_NO_SCENE,
  OPENING_LEAD,
  type Opener,
  openingTime,
  PROGRAMMING,
  SECONDARY_LEAD,
  SECONDARY_TAIL,
  SIGNATURE,
  STILL_LOOKING,
  TITLE_A_GOOD_PART,
  TITLES,
  TOOL,
  UNMET_ITEM,
  VISUAL,
  WHERE_CLASSICS,
  WHERE_HEADING,
  WHERE_OPENING,
  WHERE_STUDIO,
  WHERE_TOOLBOX,
  WHY,
  WHY_HEADING,
  WHY_HEADING_A_GOOD_PART,
  WISH,
  WORRY,
} from './result-copy'

/** A página de oferta adulta, destino do botão do resultado. */
export const ADULT_OFFER_PATH = '/pro/comunidade-dos-criadores/oferta'

const join = (...partes: (string | false | null | undefined)[]): string =>
  partes.filter(Boolean).join(' ')

/**
 * A resposta que abre a carta. A frase da P5 só é afirmada quando é a do perfil; senão, abre pela
 * resposta que deu o perfil: a frase-síntese, o que incomoda ou a cena desejada (o perfil sempre
 * soma ao menos uma delas).
 */
export function openerOf(answers: QuizAnswers, profile: AdultProfile): Opener {
  if (answers.cena === profile) return 'cena'
  if (answers.sintese === profile) return 'sintese'
  if (answers.preocupacao === profile) return 'preocupacao'
  return 'cena_desejada'
}

function opening(answers: QuizAnswers, p: AdultProfile, opener: Opener): string {
  const lead = OPENING_LEAD[opener](p)
  const tempo = openingTime(lead, marca('tempo_jogo', answers.tempo_jogo))
  const tentativa = OPENING_ATTEMPT[String(answers.tentativa)]
  return join(
    `Você contou que ${lead}, ${tempo} ${tentativa}.`,
    answers.cena === 'nenhum' ? OPENING_CLOSE_NO_SCENE : OPENING_CLOSE,
  )
}

function why(answers: QuizAnswers, p: AdultProfile, opener: Opener): string {
  const tc = String(answers.tempo_criacao)
  const copy = WHY[p]
  const worry =
    answers.preocupacao === 'nenhum'
      ? NO_WORRY
      : answers.preocupacao === p && opener !== 'preocupacao'
        ? WORRY[p]
        : ''
  return join(
    calculatorSentence(
      CALCULADORA_POR_SEMANA[String(answers.tempo_jogo)] ?? '',
      marca('tempo_criacao', tc),
    ),
    copy.lead(tc),
    copy.attempt[String(answers.tentativa)],
    copy.tail(tc),
    worry,
  )
}

/**
 * O segundo perfil volta com a resposta que o somou. Fica de fora quando só a cena desejada o
 * somou: a frase da cena desejada já fala dele.
 */
function secondary(answers: QuizAnswers, decision: AdultDecision): string {
  const q = decision.secondary
  if (!q) return ''
  const source = (['cena', 'sintese', 'preocupacao'] as const).find((key) => answers[key] === q)
  return source ? join(SECONDARY_LEAD[source](q), SECONDARY_TAIL[q]) : ''
}

function needs(answers: QuizAnswers): string {
  return join(
    NEED[String(answers.garantia)],
    COMPUTER[String(answers.computador)],
    typeof answers.ferramenta === 'string' && TOOL[answers.ferramenta],
    typeof answers.codigo === 'string' && CODE[answers.codigo],
    answers.sintese === 'conhecer' && STILL_LOOKING,
  )
}

function cta(decision: AdultDecision): BlocoConversa {
  const p = decision.profile
  const itens = decision.unmet.flatMap((c) => (UNMET_ITEM[c] ? [UNMET_ITEM[c]] : []))
  return itens.length
    ? { tipo: 'cta', texto: ctaUnmetText(itens), rotulo: CTA_UNMET_LABEL, href: ADULT_OFFER_PATH }
    : { tipo: 'cta', texto: CTA_TEXT[p], rotulo: CTA_LABEL[p], href: ADULT_OFFER_PATH }
}

/** O resultado em conversa, ou null enquanto o quiz não está completo. */
export function buildAdultResult(answers: QuizAnswers): ResultadoConversa | null {
  const decision = adultDecision(answers)
  if (!decision) return null
  const p = decision.profile
  const opener = openerOf(answers, p)
  const goodPart = p === 'A' && answers.tempo_criacao === 'boa_parte'
  const wish = String(answers.cena_desejada)
  const visual = VISUAL[p]
  const segundo = secondary(answers, decision)

  const blocos: BlocoConversa[] = [
    { tipo: 'p', texto: opening(answers, p, opener) },
    { tipo: 'h', texto: goodPart ? WHY_HEADING_A_GOOD_PART : WHY_HEADING[p] },
    { tipo: 'p', texto: why(answers, p, opener) },
    { tipo: 'h', texto: CHANGE_HEADING[p] },
    { tipo: 'p', texto: join(CHANGE[p], opener !== 'cena_desejada' && WISH[wish]) },
    ...(segundo ? [{ tipo: 'p' as const, texto: segundo }] : []),
    { tipo: 'h', texto: WHERE_HEADING },
    {
      tipo: 'p',
      texto: join(
        WHERE_OPENING,
        WHERE_TOOLBOX,
        WHERE_STUDIO[p],
        WHERE_CLASSICS,
        PROGRAMMING[String(answers.programacao)],
      ),
    },
    { tipo: 'img', ...visual },
    { tipo: 'p', texto: FOUNDERS },
    { tipo: 'h', texto: NEEDS_HEADING },
    { tipo: 'p', texto: needs(answers) },
    cta(decision),
  ]

  return {
    tema: 'adulto',
    titulo: goodPart ? TITLE_A_GOOD_PART : TITLES[p],
    ...(decision.state === 'perfil_aproximado' ? { aviso: APPROXIMATE_NOTE } : {}),
    blocos,
    assinatura: SIGNATURE,
    perfil: PROFILE_IDS[p],
    destino: ADULT_OFFER_PATH,
    evento: {
      quiz_version: QUIZ_VERSION,
      revision: quizRevision(answers),
      perfil_principal: p,
      perfil_secundario: decision.secondary,
      pontos: decision.scores,
      estado: decision.state,
      adequacao: decision.adequacy,
      destino: ADULT_OFFER_PATH,
    },
  }
}

// Monta a carta de resultado do quiz adulto do Desafio, v1 (`ResultadoConversa`, puro e sem IO). A
// ordem dos blocos é a mesma para os três perfis e qualquer resposta: 4 títulos, 1 tela (o jogo do
// Farol), o parágrafo dos fundadores (sem relato) e o botão para a página adulta.
import type { BlocoConversa, ResultadoConversa } from '../../../content/resultado-conversa'
import type { QuizAnswers } from '../../../lib/quiz-types'
import {
  type DesafioAdultoDecision,
  type DesafioAdultoProfile,
  desafioAdultoDecision,
  PROFILE_IDS,
  QUIZ_VERSION,
  quizRevision,
} from './engine'
import {
  APPROXIMATE_NOTE,
  ASSINATURA,
  CENA,
  CHANGE,
  CHANGE_HEADING,
  CLOSE,
  COMPUTADOR,
  CTA_LABEL,
  CTA_NOTA,
  CTA_TEXT,
  CTA_UNMET_LABEL,
  ctaUnmetText,
  DESEJO,
  FOUNDERS,
  IMAGEM_FAROL,
  m,
  NEED,
  needsHeading,
  PROGRAMACAO,
  SINTESE,
  STILL_LOOKING,
  TEMPO,
  TEMPO_CURTO,
  TEMPO_NEED,
  TENTATIVA,
  TITLES,
  UNMET,
  WHERE,
  WHERE_HEADING,
  WHY_HEADING,
  WHY_LEAD,
  WHY_TAIL,
  WHY_TENTATIVA,
  WISH,
} from './result-copy'

/** A página de oferta adulta, destino do botão do resultado. */
export const DESAFIO_ADULTO_OFFER_PATH = '/pro/desafio-primeiro-jogo/oferta'

type Opener = 'cena' | 'sintese' | 'cena_desejada'

const join = (...partes: (string | false | null | undefined)[]): string =>
  partes.filter(Boolean).join(' ')

/** A resposta que abre a carta: a frase que parece com a pessoa quando é a do perfil; senão, a que deu o perfil. */
function opener(answers: QuizAnswers, p: DesafioAdultoProfile): Opener {
  if (answers.cena === p) return 'cena'
  if (answers.sintese === p) return 'sintese'
  return 'cena_desejada'
}

function abertura(answers: QuizAnswers, p: DesafioAdultoProfile, abre: Opener): string {
  const lead =
    abre === 'cena'
      ? m(CENA[p])
      : abre === 'sintese'
        ? `quer ${m(SINTESE[p])}`
        : `quer, daqui a um mês, ${m(DESEJO[p])}`
  const tentativa = TENTATIVA[String(answers.tentativa)]
  const tempo = TEMPO[String(answers.tempo_livre)]
  return join(`Você contou que ${lead}, ${tentativa} e ${tempo}.`, CLOSE[p])
}

/** As frases do que a pessoa disse que importa (2 a 4: garantia, tempo, computador, ainda conhecendo). */
function necessidades(answers: QuizAnswers): string[] {
  const garantia = String(answers.garantia)
  const tempo = String(answers.tempo_livre)
  return [
    NEED[garantia],
    (garantia === 'pouco_tempo' ? TEMPO_CURTO : TEMPO_NEED)[tempo],
    COMPUTADOR[String(answers.computador)],
    answers.sintese === 'conhecer' ? STILL_LOOKING : '',
  ].filter((frase): frase is string => Boolean(frase))
}

function cta(d: DesafioAdultoDecision): { bloco: BlocoConversa; href: string } {
  const destino = DESAFIO_ADULTO_OFFER_PATH
  if (!d.unmet.length)
    return {
      bloco: {
        tipo: 'cta',
        texto: CTA_TEXT,
        rotulo: CTA_LABEL[d.profile],
        href: destino,
        nota: CTA_NOTA,
      },
      href: destino,
    }
  const href = `${destino}#duvidas`
  return {
    bloco: {
      tipo: 'cta',
      texto: ctaUnmetText(d.unmet.map((c) => UNMET[c])),
      rotulo: CTA_UNMET_LABEL,
      href,
      nota: CTA_NOTA,
    },
    href,
  }
}

/** A carta do resultado, ou null enquanto o quiz não está completo. */
export function buildDesafioAdultoResult(answers: QuizAnswers): ResultadoConversa | null {
  const d = desafioAdultoDecision(answers)
  if (!d) return null
  const p = d.profile
  const abre = opener(answers, p)
  const desejo = String(answers.cena_desejada) as DesafioAdultoProfile
  const frases = necessidades(answers)
  const botao = cta(d)

  const blocos: BlocoConversa[] = [
    { tipo: 'p', texto: abertura(answers, p, abre) },
    { tipo: 'h', texto: WHY_HEADING[p] },
    {
      tipo: 'p',
      texto: join(WHY_LEAD[p], WHY_TENTATIVA[String(answers.tentativa)], WHY_TAIL[p]),
    },
    { tipo: 'h', texto: CHANGE_HEADING[p] },
    {
      tipo: 'p',
      texto: join(
        CHANGE[p],
        PROGRAMACAO[String(answers.programacao)],
        abre !== 'cena_desejada' && WISH[desejo],
      ),
    },
    { tipo: 'h', texto: WHERE_HEADING },
    { tipo: 'p', texto: WHERE },
    { tipo: 'img', ...IMAGEM_FAROL },
    { tipo: 'p', texto: FOUNDERS },
    { tipo: 'h', texto: needsHeading(frases.length) },
    { tipo: 'p', texto: join(...frases) },
    botao.bloco,
  ]

  return {
    tema: 'adulto',
    titulo: TITLES[p],
    ...(d.state === 'perfil_aproximado' ? { aviso: APPROXIMATE_NOTE } : {}),
    blocos,
    assinatura: ASSINATURA,
    perfil: PROFILE_IDS[p],
    destino: DESAFIO_ADULTO_OFFER_PATH,
    evento: {
      quiz_version: QUIZ_VERSION,
      revision: quizRevision(answers),
      perfil_principal: p,
      pontos: d.scores,
      estado: d.state,
      adequacao: d.adequacy,
      destino: botao.href,
    },
  }
}

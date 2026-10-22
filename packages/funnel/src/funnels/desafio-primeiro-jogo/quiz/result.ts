// Monta a carta de resultado do quiz Kids do Desafio, v5 (`ResultadoConversa`, puro e sem IO). A
// ordem dos blocos é a mesma nos dois ramos e em qualquer resposta: 4 títulos, 1 tela (o jogo do
// Farol), 1 relato e o botão para a página certa (9 a 17 ou criar junto).
import type { BlocoConversa, ResultadoConversa } from '../../../content/resultado-conversa'
import type { QuizAnswers } from '../../../lib/quiz-types'
import { legendaDoRelato } from '../../comunidade-dos-criadores/oferta/pagina-9a17'
import { RELATOS } from '../../comunidade-dos-criadores/oferta/relatos'
import { flexionar } from '../../comunidade-dos-criadores/quiz/genero'
import {
  type Condition,
  type Decision917,
  type DecisionM9,
  type DesafioProfile,
  desafioDecision,
  type M9Profile,
  PROFILE_IDS,
  PROFILE_IDS_M9,
  QUIZ_VERSION,
  quizRevision,
} from './engine'
import {
  APPROXIMATE_NOTE,
  ASSINATURA,
  CENA_917,
  CENA_M9,
  CHANGE_917,
  CHANGE_HEADING_917,
  CHANGE_HEADING_M9,
  CHANGE_M9,
  CHANGE_START,
  CHANGE_START_M9,
  CLOSE_917,
  CLOSE_M9,
  COMPUTADOR_917,
  COMPUTADOR_M9,
  CTA_LABEL_917,
  CTA_LABEL_M9,
  CTA_NOTA,
  CTA_TEXT_917,
  CTA_TEXT_M9,
  CTA_UNMET_LABEL,
  ctaUnmetText,
  DESEJO_917,
  DESEJO_M9,
  HELP_917,
  IMAGEM_FAROL,
  IRMAO,
  LEGENDA_917,
  LEGENDA_M9,
  LEITURA_M9,
  MARCAS_917,
  MARCAS_M9,
  m,
  NEED_917,
  NEED_M9,
  NEEDS_HEADING,
  RELATO_917,
  RELATO_M9,
  SINTESE_917,
  SINTESE_M9,
  STILL_LOOKING,
  TEMPO_NAO_SEI,
  TITLES_917,
  TITLES_M9,
  TRAVA,
  UNMET_917,
  UNMET_M9,
  WHERE_917,
  WHERE_HEADING,
  WHERE_M9,
  WHY_917,
  WHY_HEADING_917,
  WHY_HEADING_M9,
  WHY_M9,
  WHY_START,
  WISH_917,
  WISH_M9,
} from './result-copy'

/** As duas páginas de oferta Kids, destino do botão do resultado. */
export const DESAFIO_OFFER_PATHS = {
  '9a17': '/kids/desafio-primeiro-jogo/oferta',
  m9: '/kids/desafio-primeiro-jogo/oferta/criar-junto',
} as const

type Opener = 'cena' | 'sintese' | 'cena_desejada'
type DesafioBranchComCarta = keyof typeof DESAFIO_OFFER_PATHS

const join = (...partes: (string | false | null | undefined)[]): string =>
  partes.filter(Boolean).join(' ')

/** Junta itens de uma lista em português: "a", "a e b", "a, b e c". */
const lista = (itens: string[]): string =>
  itens.length > 1 ? `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}` : (itens[0] ?? '')

/** A resposta que abre a carta: a cena de casa quando é a do perfil; senão, a que deu o perfil. */
function opener(answers: QuizAnswers, prefix: '' | 'm9_', p: string): Opener {
  if (answers[`${prefix}cena`] === p) return 'cena'
  if (answers[`${prefix}sintese`] === p) return 'sintese'
  return 'cena_desejada'
}

/**
 * A seção de cada página que responde à condição não atendida: o computador nas dúvidas ("Funciona no
 * celular ou no tablet?"), o formato na aula (9 a 17) ou na sessão (menor de 9).
 */
const ANCORA: Record<DesafioBranchComCarta, Record<Condition, string>> = {
  '9a17': { computador: '#duvidas', formato: '#aula' },
  m9: { computador: '#duvidas', formato: '#sessao' },
}

function cta(
  ramo: DesafioBranchComCarta,
  unmet: Condition[],
  texto: string,
  rotulo: string,
): { bloco: BlocoConversa; href: string } {
  const destino = DESAFIO_OFFER_PATHS[ramo]
  const [primeira] = unmet
  if (!primeira)
    return { bloco: { tipo: 'cta', texto, rotulo, href: destino, nota: CTA_NOTA }, href: destino }
  const itens = unmet.map((c) => (ramo === 'm9' ? UNMET_M9 : UNMET_917)[c])
  const href = `${destino}${ANCORA[ramo][primeira]}`
  return {
    bloco: {
      tipo: 'cta',
      texto: ctaUnmetText(itens),
      rotulo: CTA_UNMET_LABEL,
      href,
      nota: CTA_NOTA,
    },
    href,
  }
}

function carta917(answers: QuizAnswers, d: Decision917): ResultadoConversa {
  const p: DesafioProfile = d.profile
  const f = (s: string) => flexionar(s, d.gender)
  const abre = opener(answers, '', p)
  const idade = MARCAS_917.idade[d.ageBand]
  const tempo =
    MARCAS_917.tempo_tela[String(answers.tempo_tela) as keyof typeof MARCAS_917.tempo_tela]
  const lead =
    abre === 'cena'
      ? `e ${m(CENA_917[p])}`
      : abre === 'sintese'
        ? `e que você quer ${m(SINTESE_917[p])}`
        : `e que gostaria de ver ${m(DESEJO_917[p])}`
  const abertura = join(
    `Você contou que ele tem ${m(idade)}, passa ${m(tempo)} em jogos e vídeos ${lead}.`,
    CLOSE_917[p],
  )
  const desejo = String(answers.cena_desejada) as DesafioProfile
  const relato = RELATO_917[p]
  const r = RELATOS[relato.id]
  const destino = DESAFIO_OFFER_PATHS['9a17']
  const botao = cta('9a17', d.unmet, CTA_TEXT_917, CTA_LABEL_917[p])

  const blocos: BlocoConversa[] = [
    { tipo: 'p', texto: abertura },
    { tipo: 'h', texto: WHY_HEADING_917[p] },
    { tipo: 'p', texto: join(WHY_START, WHY_917[p], TRAVA[String(answers.trava)]) },
    { tipo: 'h', texto: CHANGE_HEADING_917[p] },
    {
      tipo: 'p',
      texto: join(
        CHANGE_START,
        CHANGE_917[p],
        HELP_917,
        abre !== 'cena_desejada' && WISH_917[desejo],
      ),
    },
    { tipo: 'h', texto: WHERE_HEADING },
    { tipo: 'p', texto: WHERE_917 },
    { tipo: 'img', ...IMAGEM_FAROL, legenda: LEGENDA_917 },
    { tipo: 'p', texto: relato.intro },
    {
      tipo: 'relato',
      texto: r.fala,
      autor: legendaDoRelato(relato.id),
      foto: `/img/comunidade-dos-criadores/${r.retrato}`,
    },
    { tipo: 'h', texto: NEEDS_HEADING },
    {
      tipo: 'p',
      texto: join(
        NEED_917[String(answers.garantia)],
        COMPUTADOR_917[String(answers.computador)],
        answers.sintese === 'conhecer' && STILL_LOOKING,
      ),
    },
    botao.bloco,
  ]

  return {
    tema: 'kids',
    titulo: f(TITLES_917[p]),
    ...(d.state === 'perfil_aproximado' ? { aviso: APPROXIMATE_NOTE } : {}),
    blocos: blocos.map((b) => flexionarBloco(b, f)),
    assinatura: ASSINATURA,
    perfil: PROFILE_IDS[p],
    destino,
    evento: evento(answers, d, botao.href),
  }
}

function cartaM9(answers: QuizAnswers, d: DecisionM9): ResultadoConversa {
  const p: M9Profile = d.profile
  const f = (s: string) => flexionar(s, d.gender)
  const abre = opener(answers, 'm9_', p)
  const desejo = String(answers.m9_cena_desejada)
  const itens = [
    abre === 'cena'
      ? `ele ${m(CENA_M9[p])}`
      : abre === 'sintese'
        ? `você quer ${m(SINTESE_M9[p])}`
        : `você gostaria de ver ${m(DESEJO_M9[desejo] ?? DESEJO_M9[p] ?? '')}`,
    `ele ${m(MARCAS_M9.m9_leitura[String(answers.m9_leitura) as keyof typeof MARCAS_M9.m9_leitura])}`,
  ]
  const tempo =
    MARCAS_M9.m9_tempo_juntos[
      String(answers.m9_tempo_juntos) as keyof typeof MARCAS_M9.m9_tempo_juntos
    ]
  if (tempo) itens.push(`vocês conseguem sentar juntos no computador ${m(tempo)}`)
  // Cada item depois do primeiro ganha o próprio "que"; as marcas têm vírgulas e "e" por dentro.
  const abertura = join(
    `Você contou que ${lista(itens.map((t, i) => (i ? `que ${t}` : t)))}.`,
    CLOSE_M9,
  )
  const destino = DESAFIO_OFFER_PATHS.m9
  const botao = cta('m9', d.unmet, CTA_TEXT_M9, CTA_LABEL_M9[p])

  const blocos: BlocoConversa[] = [
    { tipo: 'p', texto: abertura },
    { tipo: 'h', texto: WHY_HEADING_M9[p] },
    { tipo: 'p', texto: join(WHY_M9[p], answers.m9_cena === 'irmao' && IRMAO) },
    { tipo: 'h', texto: CHANGE_HEADING_M9[p] },
    {
      tipo: 'p',
      texto: join(
        CHANGE_START_M9,
        LEITURA_M9[String(answers.m9_leitura)],
        CHANGE_M9[p],
        abre !== 'cena_desejada' && WISH_M9[desejo],
      ),
    },
    { tipo: 'h', texto: WHERE_HEADING },
    { tipo: 'p', texto: WHERE_M9 },
    { tipo: 'img', ...IMAGEM_FAROL, legenda: LEGENDA_M9 },
    { tipo: 'p', texto: RELATO_M9.intro },
    { tipo: 'relato', texto: RELATOS.AV03.fala, autor: RELATO_M9.autor, foto: RELATO_M9.foto },
    { tipo: 'h', texto: NEEDS_HEADING },
    {
      tipo: 'p',
      texto: join(
        NEED_M9[String(answers.m9_garantia)],
        COMPUTADOR_M9[String(answers.m9_computador)],
        answers.m9_tempo_juntos === 'nao_sei' && TEMPO_NAO_SEI,
        answers.m9_sintese === 'conhecer' && STILL_LOOKING,
      ),
    },
    botao.bloco,
  ]

  return {
    tema: 'kids-m9',
    titulo: f(TITLES_M9[p]),
    ...(d.state === 'perfil_aproximado' ? { aviso: APPROXIMATE_NOTE } : {}),
    blocos: blocos.map((b) => flexionarBloco(b, f)),
    assinatura: ASSINATURA,
    perfil: PROFILE_IDS_M9[p],
    destino,
    evento: evento(answers, d, botao.href),
  }
}

/** Passa o texto da família pelo gênero; os relatos ficam literais. */
function flexionarBloco(b: BlocoConversa, f: (s: string) => string): BlocoConversa {
  if (b.tipo === 'p' || b.tipo === 'h') return { ...b, texto: f(b.texto) }
  if (b.tipo === 'img') return { ...b, legenda: f(b.legenda) }
  if (b.tipo === 'cta') return { ...b, texto: f(b.texto), rotulo: f(b.rotulo) }
  return b
}

function evento(
  answers: QuizAnswers,
  d: Decision917 | DecisionM9,
  destino: string,
): Record<string, unknown> {
  return {
    quiz_version: QUIZ_VERSION,
    revision: quizRevision(answers),
    ramo: d.branch,
    perfil_principal: d.profile,
    pontos: d.scores,
    estado: d.state,
    adequacao: d.adequacy,
    destino,
  }
}

/** A carta do resultado, ou null enquanto o quiz não está completo. */
export function buildDesafioKidsResult(answers: QuizAnswers): ResultadoConversa | null {
  const d = desafioDecision(answers)
  if (!d) return null
  return d.branch === 'm9' ? cartaM9(answers, d) : carta917(answers, d)
}

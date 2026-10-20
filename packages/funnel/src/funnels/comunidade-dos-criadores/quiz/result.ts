// O resultado em conversa do quiz v6 (20/10/2026): monta a carta de cada ramo a partir das
// respostas. Puro: sem IO, sem preço. O componente `ResultadoConversa.astro` desenha.
import type { BlocoConversa, ResultadoConversa } from '../../../content/resultado-conversa'
import type { QuizAnswers } from '../../../lib/quiz-types'
import { comunidadeOfferPath } from '../oferta'
import { legendaDoRelato } from '../oferta/pagina-9a17'
import { RELATOS } from '../oferta/relatos'
import type { RelatoId } from '../oferta/types'
import { visualDe } from '../oferta/visuals'
import {
  type CommunityProfile,
  communityDecision,
  type Decision917,
  type DecisionM9,
  type M9Profile,
  PROFILE_IDS,
  PROFILE_IDS_M9,
  QUIZ_VERSION,
  quizRevision,
} from './engine'
import { flexionar } from './genero'
import {
  APPROXIMATE_NOTE,
  ASSINATURA_KIDS,
  CALCULADORA,
  CENA,
  CENA_DESEJADA,
  COMMUNITY_OPENING,
  CONDITION_SENTENCE,
  CRIACAO,
  CTA_WITH_UNMET_CONDITION,
  ESCOLA,
  IDADE,
  NEED_SENTENCE,
  NEXT_917,
  NEXT_WITH_UNMET_CONDITION,
  PERFIS_917,
  PREOCUPACAO,
  QUANDO_TRAVA,
  SCHOOL_CHANGE_ADD,
  SCHOOL_CHANGE_REPLACE,
  SCHOOL_CHANGE_TITLE,
  SCHOOL_THESIS,
  SCHOOL_TITLE,
  SCHOOL_VISUAL,
  SCHOOL_WHERE,
  SCHOOL_WHY_TITLE,
  SECONDARY_SENTENCE,
  SINTESE,
  THESIS_A_END,
  TITLE_A_GOOD_PART,
  TITLE_F_NUMBERS,
  TRAVA_SENTENCE,
  WISH_SCENE_SENTENCE,
  WORRY_SENTENCE,
} from './result-copy-9a17'
import {
  CENA_DESEJADA_M9,
  CENA_M9,
  COMPUTADOR_M9,
  FALTA,
  IMAGEM_M9,
  IRMAO_M9,
  LEITURA,
  LEITURA_SESSAO,
  NEED_M9,
  NEXT_M9,
  ONDE_LEITURA,
  ONDE_M9,
  OUVIR_E_TESTAR,
  PERFIS_M9,
  PREOCUPACAO_M9,
  RELATO_M9,
  SECONDARY_M9,
  SINTESE_M9,
  TEMPO_JUNTOS,
  TEMPO_SESSAO,
  WISH_SCENE_M9,
  WORRY_NONE,
  WORRY_OTHER,
  WORRY_SAME,
} from './result-copy-m9'

type Opener = 'cena' | 'preocupacao' | 'sintese' | 'cena_desejada'

const text = (answers: QuizAnswers, key: string) => String(answers[key] ?? '')
const juntar = (...partes: (string | false | null | undefined)[]) =>
  partes.filter((p): p is string => Boolean(p)).join(' ')
const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

/** A tela real de cada carta, com uma legenda curta (sem a pergunta do nome do curso). */
const IMAGENS_917: Record<string, { frame: string; legenda: string }> = {
  'aula-estudio': {
    frame: 'aula-estudio',
    legenda: 'A aula com o vídeo e a fala do Zappy de um lado e a atividade no Estúdio do outro',
  },
  'estudio-jardim': {
    frame: 'estudio',
    legenda: 'O Estúdio com os blocos do jardim e o jogo rodando ao lado',
  },
  estudio: {
    frame: 'estudio',
    legenda: 'O Estúdio com os blocos de um lado e o jogo rodando do outro',
  },
  integracao: {
    frame: 'integracao',
    legenda:
      'A janela Trazer do Pinta, dentro do Estúdio, com o cavaleiro desenhado pronto para o jogo',
  },
  contador: {
    frame: 'contador',
    legenda: 'O contador de achados muda quando um personagem é encontrado',
  },
  regra: {
    frame: 'regra',
    legenda:
      'O experimento do jardim: com a reação ao toque ligada, o arbusto some e o coelho aparece',
  },
}
/** O quadro da sequência que melhor mostra cada tela (a integração mostra o Trazer do Pinta). */
const QUADRO: Record<string, number> = { integracao: 1, regra: 1 }

function imagem917(id: string): BlocoConversa {
  const escolhida = IMAGENS_917[id]
  if (!escolhida) throw new Error(`Tela sem legenda no resultado: ${id}`)
  const visual = visualDe(escolhida.frame)
  const frame = visual?.frames[QUADRO[escolhida.frame] ?? 0] ?? visual?.frames[0]
  if (!frame) throw new Error(`Tela inexistente: ${escolhida.frame}`)
  return {
    tipo: 'img',
    src: `/img/comunidade-dos-criadores/${frame.file}`,
    legenda: escolhida.legenda,
    largura: frame.width,
    altura: frame.height,
  }
}

/** O relato e a frase que o apresenta ("O Daniel, pai do Rafael, viu isso acontecer em casa:"). */
function relato917(id: RelatoId): BlocoConversa[] {
  const r = RELATOS[id]
  const feminino = /^(Aluna|Mãe)/.test(r.papel)
  const responsavel = /^(Pai|Mãe)/.test(r.papel)
  const intro = `${feminino ? 'A' : 'O'} ${legendaDoRelato(id)}, ${
    responsavel ? 'viu isso acontecer em casa:' : 'contou assim:'
  }`
  return [
    { tipo: 'p', texto: intro },
    {
      tipo: 'relato',
      texto: r.fala,
      autor: legendaDoRelato(id),
      foto: `/img/comunidade-dos-criadores/${r.retrato}`,
    },
  ]
}

function opener917(answers: QuizAnswers, p: CommunityProfile): Opener {
  if (answers.cena === p) return 'cena'
  if (answers.preocupacao === p) return 'preocupacao'
  if (answers.sintese === p) return 'sintese'
  return 'cena_desejada'
}

function carta917(answers: QuizAnswers, d: Decision917): ResultadoConversa {
  const p = d.profile
  const copy = PERFIS_917[p]
  const escola = text(answers, 'escola')
  const wish = text(answers, 'cena_desejada')
  const trava = text(answers, 'quando_trava')
  const opener = opener917(answers, p)
  const f = (s: string) => flexionar(s, d.gender)

  const abertura =
    opener === 'cena'
      ? `[[${CENA[p]}]]`
      : opener === 'preocupacao'
        ? `o que mais preocupa é [[${PREOCUPACAO[p]}]]`
        : opener === 'sintese'
          ? `o que você mais quer é [[${SINTESE[p]}]]`
          : `a cena que você quer ver é [[${CENA_DESEJADA[p]}]]`
  const travou =
    trava === 'nao_reparou'
      ? 'e que você [[ainda não reparou]] no que ele faz quando algo não dá certo num jogo.'
      : `e que, quando algo não dá certo num jogo, [[${QUANDO_TRAVA[trava]}]].`
  const primeiro = `Você contou que ele tem [[${IDADE[text(answers, 'idade')]}]], que ${abertura} ${travou} ${copy.openingEnd}`

  const calculadora = `${CALCULADORA[text(answers, 'tempo_tela')]} em jogos e vídeos, e ${CRIACAO[text(answers, 'tempo_criacao')]}.`
  const preocupa =
    answers.preocupacao === p && opener !== 'preocupacao'
      ? WORRY_SENTENCE.replace('{preocupacao}', PREOCUPACAO[p] ?? '')
      : ''
  const porque =
    p === 'F'
      ? juntar(
          `Na escola, ${ESCOLA[escola]}.`,
          SCHOOL_THESIS[escola] ?? copy.thesis,
          `E o tempo de tela já está aí: ${minuscula(calculadora)}`,
          preocupa,
        )
      : p === 'A'
        ? juntar(
            calculadora,
            copy.thesis,
            answers.tempo_criacao === 'boa_parte' ? THESIS_A_END.boa_parte : THESIS_A_END.padrao,
            preocupa,
          )
        : juntar(calculadora, copy.thesis, preocupa)

  const testeFalhou = TRAVA_SENTENCE[trava]!.replace(
    '{se}',
    p === 'B' ? 'Se não fez' : 'Se não deu certo',
  )
  const muda = juntar(
    p === 'F' && SCHOOL_CHANGE_REPLACE[escola] ? SCHOOL_CHANGE_REPLACE[escola] : copy.change,
    testeFalhou,
    p === 'F' && !SCHOOL_CHANGE_REPLACE[escola] ? SCHOOL_CHANGE_ADD[escola] : '',
    opener === 'cena_desejada' ? '' : WISH_SCENE_SENTENCE[wish],
    d.secondary && d.secondary !== wish ? SECONDARY_SENTENCE[d.secondary] : '',
  )

  const condicional = [
    CONDITION_SENTENCE.ferramenta[text(answers, 'ferramenta')],
    CONDITION_SENTENCE.desenho[text(answers, 'desenho')],
    CONDITION_SENTENCE.reforco[text(answers, 'escola')],
  ]
  const precisa = juntar(
    NEED_SENTENCE[text(answers, 'garantia')],
    ...condicional,
    CONDITION_SENTENCE.computador[text(answers, 'computador')],
  )

  const titulo =
    p === 'A' && answers.tempo_criacao === 'boa_parte'
      ? TITLE_A_GOOD_PART
      : p === 'F'
        ? (SCHOOL_TITLE[escola] ?? (opener === 'cena' ? copy.title : TITLE_F_NUMBERS))
        : copy.title
  const semCondicao = d.unmet.length > 0
  const destino = comunidadeOfferPath('9a17')
  const blocos: BlocoConversa[] = [
    { tipo: 'p', texto: f(primeiro) },
    { tipo: 'h', texto: f((p === 'F' && SCHOOL_WHY_TITLE[escola]) || copy.whyTitle) },
    { tipo: 'p', texto: f(porque) },
    { tipo: 'h', texto: f((p === 'F' && SCHOOL_CHANGE_TITLE[escola]) || copy.changeTitle) },
    { tipo: 'p', texto: f(muda) },
    { tipo: 'h', texto: 'Onde isso acontece' },
    {
      tipo: 'p',
      texto: f(`${COMMUNITY_OPENING} ${(p === 'F' && SCHOOL_WHERE[escola]) || copy.where}`),
    },
    imagem917((p === 'F' && SCHOOL_VISUAL[escola]) || copy.visual),
    ...relato917(copy.relato),
    { tipo: 'h', texto: 'O que você disse que precisa' },
    { tipo: 'p', texto: f(precisa) },
    {
      tipo: 'cta',
      texto: f(semCondicao ? NEXT_WITH_UNMET_CONDITION : NEXT_917),
      rotulo: f(semCondicao ? CTA_WITH_UNMET_CONDITION : copy.cta),
      href: destino,
    },
  ]
  return {
    tema: 'kids',
    titulo: f(titulo),
    ...(d.state === 'perfil_aproximado' ? { aviso: APPROXIMATE_NOTE } : {}),
    blocos,
    assinatura: ASSINATURA_KIDS,
    perfil: PROFILE_IDS[p],
    destino,
    evento: eventoDo(answers, d, destino),
  }
}

function openerM9(answers: QuizAnswers, p: M9Profile): Opener {
  const comoPerfil = (v: unknown) => (v === 'A2' ? 'A' : v)
  if (answers.m9_cena === p) return 'cena'
  if (answers.m9_preocupacao === p) return 'preocupacao'
  if (answers.m9_sintese === p) return 'sintese'
  return comoPerfil(answers.m9_cena_desejada) === p ? 'cena_desejada' : 'sintese'
}

function cartaM9(answers: QuizAnswers, d: DecisionM9): ResultadoConversa {
  const p = d.profile
  const copy = PERFIS_M9[p]
  const leitura = text(answers, 'm9_leitura')
  const tempo = text(answers, 'm9_tempo_juntos')
  const wish = text(answers, 'm9_cena_desejada')
  const preocupacao = text(answers, 'm9_preocupacao')
  const opener = openerM9(answers, p)
  const f = (s: string) => flexionar(s, d.gender)

  const abertura =
    opener === 'cena'
      ? `[[${CENA_M9[p]}]]`
      : opener === 'preocupacao'
        ? `o que mais preocupa é [[${PREOCUPACAO_M9[p]}]]`
        : opener === 'sintese'
          ? `o que você mais quer é [[${SINTESE_M9[p]}]]`
          : `a cena que você quer ver é [[${CENA_DESEJADA_M9[wish]}]]`
  const primeiro = juntar(
    `Você contou que ele tem [[menos de 9 anos]], que [[${LEITURA[leitura]}]] e que ${abertura}.`,
    TEMPO_JUNTOS[tempo]?.texto,
    TEMPO_JUNTOS[tempo]?.fecho,
  )
  const preocupa =
    opener === 'preocupacao'
      ? ''
      : preocupacao === p
        ? WORRY_SAME.replace('{preocupacao}', PREOCUPACAO_M9[p] ?? '')
        : PREOCUPACAO_M9[preocupacao]
          ? WORRY_OTHER.replace('{preocupacao}', PREOCUPACAO_M9[preocupacao] ?? '')
          : WORRY_NONE
  const porque = juntar(copy.why.replace('{falta}', FALTA[leitura] ?? ''), preocupa)
  const wishProfile = wish === 'A2' ? 'A' : wish
  const muda = juntar(
    copy.change,
    LEITURA_SESSAO[leitura],
    OUVIR_E_TESTAR,
    opener === 'cena_desejada' ? '' : WISH_SCENE_M9[wish],
    d.secondary && d.secondary !== wishProfile ? SECONDARY_M9[d.secondary] : '',
    TEMPO_SESSAO[tempo],
  )
  const precisa = juntar(
    NEED_M9[text(answers, 'm9_garantia')],
    COMPUTADOR_M9[text(answers, 'm9_computador')],
    answers.m9_cena === 'irmao' ? IRMAO_M9 : '',
  )
  const semCondicao = d.unmet.length > 0
  const destino = comunidadeOfferPath('criar-junto')
  const blocos: BlocoConversa[] = [
    { tipo: 'p', texto: f(primeiro) },
    { tipo: 'h', texto: f(copy.whyTitle) },
    { tipo: 'p', texto: f(porque) },
    { tipo: 'h', texto: f(copy.changeTitle) },
    { tipo: 'p', texto: f(muda) },
    { tipo: 'h', texto: 'Onde isso acontece' },
    { tipo: 'p', texto: f(juntar(ONDE_M9, ONDE_LEITURA[leitura])) },
    { tipo: 'img', ...IMAGEM_M9 },
    { tipo: 'p', texto: RELATO_M9.intro },
    { tipo: 'relato', texto: RELATOS.AV03.fala, autor: RELATO_M9.autor, foto: RELATO_M9.foto },
    { tipo: 'h', texto: 'O que você disse que precisa' },
    { tipo: 'p', texto: f(precisa) },
    {
      tipo: 'cta',
      texto: f(semCondicao ? NEXT_WITH_UNMET_CONDITION : NEXT_M9),
      rotulo: f(semCondicao ? CTA_WITH_UNMET_CONDITION : copy.cta),
      href: destino,
    },
  ]
  return {
    tema: 'kids-m9',
    titulo: f(copy.title),
    ...(d.state === 'perfil_aproximado' ? { aviso: APPROXIMATE_NOTE } : {}),
    blocos,
    assinatura: ASSINATURA_KIDS,
    perfil: PROFILE_IDS_M9[p],
    destino,
    evento: eventoDo(answers, d, destino),
  }
}

function eventoDo(
  answers: QuizAnswers,
  d: Decision917 | DecisionM9,
  destino: string,
): Record<string, unknown> {
  return {
    quiz_version: QUIZ_VERSION,
    revision: quizRevision(answers),
    ramo: d.branch,
    perfil_principal: d.profile,
    perfil_secundario: d.secondary,
    pontos: d.scores,
    estado: d.state,
    adequacao: d.adequacy,
    destino,
  }
}

/** A carta do resultado, ou null quando o quiz não está completo (ou é a saída de 18 ou mais). */
export function buildCommunityResult(answers: QuizAnswers): ResultadoConversa | null {
  const decision = communityDecision(answers)
  if (!decision) return null
  return decision.branch === 'm9' ? cartaM9(answers, decision) : carta917(answers, decision)
}

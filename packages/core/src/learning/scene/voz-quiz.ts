import {
  chaveDeVoz,
  isVozesDoZappy,
  isZappySpeechOverride,
  roteiroDoZappy,
  type SceneVozes,
  textoFalado,
  type ZappySpeechOverride,
} from './voz'

/**
 * A voz do Zappy no QUIZ: a pergunta com as alternativas e, depois de responder, a explicação.
 *
 * ⭐⭐ Decisão da dona (07/10/2026): o quiz é o único lugar da aula em que a criança PRECISA ler
 * sozinha para seguir. Quem ainda lê com dificuldade travava ali, e o quiz media leitura em vez do
 * conteúdo. Agora o Zappy lê a pergunta e as alternativas, e lê a explicação da correção.
 *
 * ⚠️⚠️ As alternativas são faladas com a LETRA que aparece na tela ("Letra A: …"). No palpite da
 * cena o "Pode ser… Ou…" basta porque são duas ou três opções; num quiz de quatro, quem não lê
 * ouviria "ou…, ou…, ou…" sem saber qual botão era qual.
 *
 * ⚠️⚠️ A explicação é GABARITO: o GET da aula nunca a traz. O dicionário do bloco guarda o MP3
 * dela, mas a projeção pública (`vozesPublicasDoQuiz`) só deixa sair as falas das PERGUNTAS, e o
 * endereço da explicação viaja na resposta do envio, junto da correção (`audioDaExplicacao`).
 *
 * ⚠️ Mesma regra do resto da voz: a string falada tem de ser IDÊNTICA no gerador do admin e no
 * player, por isso tudo o que monta a fala mora aqui, no core.
 */

/** As letras da tela. O quiz aceita até 20 alternativas (`isManifestQuiz`): A a T. */
const LETRAS = 'ABCDEFGHIJKLMNOPQRST'

/** A letra de uma alternativa, igual nos dois players e na fala. */
export function letraDaAlternativa(indice: number): string {
  return LETRAS[indice] ?? String(indice + 1)
}

/**
 * O markdown da autoria como a VOZ o lê: sem marcação, sem endereço de imagem ou de link.
 *
 * ⚠️ Cobre o que o `renderMarkdown` do member-shell desenha (negrito, itálico, código, imagem com
 * sufixo de tamanho, link, título, lista, citação e bloco de código). Uma linha sem pontuação no
 * fim ganha um ponto, senão a lista "vermelho / azul" viraria "vermelho azul" numa respiração só.
 */
export function textoDoMarkdownParaFala(markdown: string): string {
  const linhas = markdown
    .replace(/\r\n/g, '\n')
    .replace(/^\s*```.*$/gm, '')
    .replace(/!\[([^\]]*)\]\([^)\s]*\)(?:\{[^}]*\})?/g, '$1')
    .replace(/\[([^\]]+)\]\([^)\s]*\)/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/(^|[^\p{L}\p{N}])_([^_]+)_(?=$|[^\p{L}\p{N}])/gu, '$1$2')
    .replace(/\\([\\`*_{}[\]()#+\-.!>])/g, '$1')
    .split('\n')
    .map((linha) =>
      textoFalado(
        linha
          .replace(/^\s*#{1,6}\s+/, '')
          .replace(/^\s*>\s?/, '')
          .replace(/^\s*(?:[-*+]|\d+[.)])\s+/, ''),
      ),
    )
    .filter(Boolean)
  return linhas.map((linha, i) => (i < linhas.length - 1 ? comPontuacao(linha) : linha)).join(' ')
}

const semPontoFinal = (texto: string) => texto.trim().replace(/[.!?…:;,]+$/, '')
const comPontuacao = (texto: string) => (/[.!?…:;]$/.test(texto) ? texto : `${texto}.`)

/** Uma alternativa só de imagem não tem texto: a voz avisa em vez de dizer "Letra A:" e calar. */
const ALTERNATIVA_SEM_TEXTO = 'a imagem'

/** A pergunta como a voz lê: o enunciado e cada alternativa com a letra da tela. */
export function falaDaPerguntaDoQuiz(pergunta: {
  prompt: string
  choices: readonly { label: string }[]
}): string {
  const enunciado = textoDoMarkdownParaFala(pergunta.prompt)
  const opcoes = pergunta.choices.map(
    (c, i) =>
      `Letra ${letraDaAlternativa(i)}: ${semPontoFinal(textoDoMarkdownParaFala(c.label)) || ALTERNATIVA_SEM_TEXTO}.`,
  )
  return [enunciado ? comPontuacao(enunciado) : '', ...opcoes].filter(Boolean).join(' ')
}

/** A explicação da correção como a voz lê. */
export function falaDaExplicacaoDoQuiz(explicacao: string): string {
  return textoDoMarkdownParaFala(explicacao)
}

/** Ajustes de pronúncia de uma pergunta: um para a pergunta, outro para a explicação. */
export interface QuizQuestionSpeech {
  question?: ZappySpeechOverride
  explanation?: ZappySpeechOverride
}

export function isQuizQuestionSpeech(value: unknown): value is QuizQuestionSpeech | undefined {
  if (value === undefined) return true
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const entradas = Object.entries(value as Record<string, unknown>)
  return entradas.every(
    ([slot, ajuste]) =>
      (slot === 'question' || slot === 'explanation') &&
      (ajuste === undefined || isZappySpeechOverride(ajuste)),
  )
}

export type QuizSpeechSlot = 'question' | 'explanation'

export interface QuizSpeech {
  questionId: string
  slot: QuizSpeechSlot
  /** O texto de referência da fala (o que o painel de pronúncia mostra e a voz do navegador lê). */
  visibleText: string
  /** O roteiro que o ElevenLabs recebe. */
  speechText: string
  key: string
}

interface PerguntaComFala {
  id: string
  prompt: string
  choices: readonly { label: string }[]
  explanation?: string
  zappySpeech?: QuizQuestionSpeech
}

function montar(
  questionId: string,
  slot: QuizSpeechSlot,
  texto: string,
  ajuste: ZappySpeechOverride | undefined,
): QuizSpeech | null {
  const visibleText = textoFalado(texto)
  if (!visibleText) return null
  const speechText = roteiroDoZappy(visibleText, ajuste)
  return { questionId, slot, visibleText, speechText, key: chaveDeVoz(speechText) }
}

/** A fala da PERGUNTA (enunciado e alternativas) de uma questão. */
export function falaDaQuestaoDoQuiz(pergunta: Omit<PerguntaComFala, 'explanation'>) {
  return montar(
    pergunta.id,
    'question',
    falaDaPerguntaDoQuiz(pergunta),
    pergunta.zappySpeech?.question,
  )
}

type ExplicacaoComFala = Pick<PerguntaComFala, 'id' | 'explanation' | 'zappySpeech'>

/** A fala da EXPLICAÇÃO de uma questão, quando ela tem uma. */
export function falaDaExplicacaoDaQuestao(pergunta: ExplicacaoComFala) {
  if (!pergunta.explanation) return null
  return montar(
    pergunta.id,
    'explanation',
    falaDaExplicacaoDoQuiz(pergunta.explanation),
    pergunta.zappySpeech?.explanation,
  )
}

/** Todas as falas que o admin grava de um quiz: pergunta e explicação de cada questão. */
export function falasDoQuiz(bloco: {
  questions: readonly PerguntaComFala[]
}): readonly QuizSpeech[] {
  return bloco.questions.flatMap((q) =>
    [falaDaQuestaoDoQuiz(q), falaDaExplicacaoDaQuestao(q)].filter(
      (fala): fala is QuizSpeech => fala !== null,
    ),
  )
}

/**
 * Teto do dicionário do quiz: duas falas por questão, até 30 questões (`isManifestQuiz`). A
 * régua da chave e do endereço é a mesma da cena.
 */
export const QUIZ_VOZ_LIMITS = { entradas: 60 } as const

export function isQuizVozes(value: unknown): value is SceneVozes | undefined {
  return isVozesDoZappy(value, QUIZ_VOZ_LIMITS.entradas)
}

/**
 * O que do dicionário pode ir ao navegador ANTES da resposta: só as falas das perguntas.
 *
 * ⚠️⚠️ O MP3 da explicação conta a resposta certa. Mandá-lo no GET seria entregar o gabarito em
 * áudio a quem abrisse a aba de rede.
 */
export function vozesPublicasDoQuiz(bloco: {
  questions: readonly Omit<PerguntaComFala, 'explanation'>[]
  vozes?: SceneVozes
}): SceneVozes | undefined {
  if (!bloco.vozes) return undefined
  const publicas: Record<string, string> = {}
  for (const q of bloco.questions) {
    const fala = falaDaQuestaoDoQuiz(q)
    const url = fala ? bloco.vozes[fala.key] : undefined
    if (fala && url) publicas[fala.key] = url
  }
  return Object.keys(publicas).length ? publicas : undefined
}

/** O MP3 da explicação de uma questão, para viajar na resposta do envio. */
export function audioDaExplicacao(
  pergunta: ExplicacaoComFala,
  vozes: SceneVozes | undefined,
): string | undefined {
  const fala = falaDaExplicacaoDaQuestao(pergunta)
  return fala && vozes ? vozes[fala.key] : undefined
}

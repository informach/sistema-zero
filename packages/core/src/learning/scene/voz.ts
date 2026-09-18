import { isSceneAudioUrl } from './audio-url'

/**
 * A voz do Zappy nas cenas: o dicionário `texto falado → arquivo`.
 *
 * ⭐⭐ Decisão da dona (17/09/2026): a instrução deixa de sair na voz do NAVEGADOR (a do sistema
 * operacional, que muda de máquina para máquina) e passa a sair na voz do Zappy, gravada no
 * ElevenLabs. O caminho é pré-gerar na AUTORIA e servir MP3: o texto da aula é fixo, quem muda é a
 * criança que ouve. Assim o ElevenLabs roda uma vez por frase, na nossa máquina, e o navegador da
 * criança nunca fala com ele — sem chave no cliente, sem latência de síntese, e a aula não cai
 * junto se o serviço cair.
 *
 * ⚠️⚠️ A CHAVE é o próprio texto falado, não um id. É o que casa o áudio com a frase sem nenhum
 * carimbo de versão: editou a frase, a chave não bate mais, não há áudio, e o "Ouvir" volta à voz
 * do navegador. Nunca existe o pior caso — a criança ouvindo a instrução ANTERIOR à correção. O
 * portão do CI acusa a falta para regerar; o navegador só não mente enquanto isso.
 *
 * ⚠️ Por isso `chaveDeVoz` tem de ser a MESMA função dos dois lados (gerador e player). Ela mora
 * aqui, no core, e não no hook nem no script: duas cópias que divergem num espaço a mais dão um
 * dicionário que nunca acerta, e o sintoma é "o Zappy não fala" sem erro nenhum.
 */

/** Setas, triângulos, marcas e emoji: a voz leria "triângulo preto apontando para a direita". */
const SIMBOLOS = /[←-⇿─-➿⬀-⯿\u{1F300}-\u{1FAFF}]/gu

/**
 * O texto como ele é FALADO: sem os símbolos da tela e com o espaço colapsado.
 *
 * ⚠️ É o que vai para o ElevenLabs e o que vira chave. A limpeza morava só no hook do navegador;
 * com o áudio gravado ela precisa valer para os dois, senão o gerador grava "seta para a direita
 * ligue a borda" e o player procura "Ligue a borda" — e nunca acha.
 */
export function textoFalado(texto: string): string {
  return texto.replace(SIMBOLOS, ' ').replace(/\s+/g, ' ').trim()
}

/** A chave do dicionário: o texto falado, e nada mais. Ver o aviso do topo. */
export function chaveDeVoz(texto: string): string {
  return textoFalado(texto)
}

/** `texto falado → URL do MP3`. Mora na atividade da cena e viaja até o navegador. */
export type SceneVozes = Readonly<Record<string, string>>

/**
 * Tetos do dicionário. Uma cena fala três coisas (instrução, pergunta do palpite com as opções e
 * checkpoint) e o balão do Zappy fala uma: 12 entradas é folga larga. Os limites existem porque
 * isto chega do manifesto e do admin, e um `Record` sem teto é payload livre no bloco da aula.
 *
 * ⚠⚠ A CHAVE acompanha o que a AUTORIA aceita, e não o que é sensato gravar: o DTO do members
 * deixa o professor escrever uma pergunta de 5000 caracteres, e a fala dela soma o rótulo e todas
 * as opções. Um teto mais apertado aqui reprovaria o BLOCO INTEIRO na publicação (o guard da
 * atividade devolve falso e a mensagem que sobra é "Configure a atividade e sua verificação"),
 * castigando quem escreveu uma pergunta longa e legal por causa do dicionário de voz. Quem decide
 * o que vale a pena GERAR é o admin, com um teto próprio e um recado que nomeia a fala.
 */
export const VOZ_LIMITS = { entradas: 12, chave: 6000 } as const

export function isSceneVozes(value: unknown): value is SceneVozes {
  if (value === undefined) return true
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const entradas = Object.entries(value as Record<string, unknown>)
  if (entradas.length > VOZ_LIMITS.entradas) return false
  for (const [chave, url] of entradas) {
    if (!chave || chave.length > VOZ_LIMITS.chave) return false
    // ⚠️ A chave precisa já estar normalizada: guardada com espaço duplo, ela nunca seria
    // encontrada pelo player (que procura pelo `chaveDeVoz` do texto da tela).
    if (chave !== chaveDeVoz(chave)) return false
    if (typeof url !== 'string' || !isSceneAudioUrl(url)) return false
  }
  return true
}

/**
 * A fila de áudio de uma fala: a URL de cada trecho, ou `null` quando falta alguma.
 *
 * ⚠️⚠️ TUDO OU NADA, e é a regra que evita o pior resultado: uma leitura em que o Zappy diz a
 * instrução e a voz robótica do sistema emenda a pergunta. Faltando o áudio de um trecho (a pista
 * que o motor monta na hora, por exemplo), a fala INTEIRA sai na voz do navegador, como antes.
 */
export function filaDeVoz(
  trechos: readonly string[],
  vozes: SceneVozes | undefined,
): readonly string[] | null {
  if (!vozes) return null
  const fila: string[] = []
  for (const trecho of trechos) {
    const texto = chaveDeVoz(trecho)
    if (!texto) continue
    const url = vozes[texto]
    if (!url) return null
    fila.push(url)
  }
  return fila.length ? fila : null
}

const semPontoFinal = (texto: string) => texto.trim().replace(/[.!?…]+$/, '')

/**
 * A pergunta do palpite como a VOZ lê: o enunciado e as opções, na ordem da tela.
 *
 * ⚠️⚠️ Mora no core porque o gerador do admin e o player precisam produzir a MESMA string. A chave
 * do dicionário é o texto falado: um "Pode ser:" que só exista de um lado gera um áudio que o
 * player nunca encontra, e o sintoma é o Zappy calado sem erro nenhum.
 */
export function falaDaPergunta(
  rotulo: string,
  pergunta: { prompt: string; choices: readonly { label: string }[] },
): string {
  const opcoes = pergunta.choices.map((c, i) =>
    i === 0 ? `Pode ser: ${semPontoFinal(c.label)}.` : `Ou: ${semPontoFinal(c.label)}.`,
  )
  return [`${rotulo}.`, pergunta.prompt, ...opcoes].join(' ')
}

/** A fala completa da etapa de hipótese: apresenta o assunto, pergunta e oferece as possibilidades. */
export function falaDoPalpite(
  rotulo: string,
  palpite: {
    context: { explanation: string }
    prompt: string
    choices: readonly { label: string }[]
  },
): string {
  const opcoes = palpite.choices.map((c, i) =>
    i === 0 ? `Pode ser: ${semPontoFinal(c.label)}.` : `Ou: ${semPontoFinal(c.label)}.`,
  )
  return [`${rotulo}.`, palpite.context.explanation, palpite.prompt, ...opcoes].join(' ')
}

/** A instrução prática é uma fala própria, separada da hipótese e de suas alternativas. */
export function falaDaInstrucao(instruction: string): string {
  return instruction
}

/**
 * Os textos de um bloco que a voz do Zappy PODE gravar de antemão.
 *
 * ⚠️⚠️ Recebe a PROJEÇÃO PÚBLICA do bloco (`publicInteractiveBlock`), nunca o rascunho cru: é ela
 * que resolve a previsão e a pergunta do MODELO da cena quando o professor não escreveu as suas.
 * Gerando a partir do rascunho, a aula que herda o palpite do modelo sairia sem áudio para
 * justamente a pergunta que tranca o palco.
 *
 * ⚠️ O que o motor monta na hora (pista pedida, legenda "Parte N", frase de situação, o retorno do
 * palpite com a escolha da criança) fica DE FORA por definição: depende do estado. Nessas falas o
 * player cai inteiro na voz do navegador — ver `filaDeVoz`.
 */
export function textosFalaveisDaCena(bloco: {
  instructions?: string
  checkpoint?: { prompt: string; choices: readonly { label: string }[] }
  prediction?: {
    context: { explanation: string }
    prompt: string
    choices: readonly { label: string }[]
  }
  activity?: { type?: string }
}): readonly string[] {
  const demonstracao = bloco.activity?.type === 'demonstration'
  return [
    falaDaInstrucao(bloco.instructions ?? ''),
    bloco.prediction
      ? falaDoPalpite(demonstracao ? 'Antes de assistir' : 'Seu palpite', bloco.prediction)
      : '',
    bloco.checkpoint ? falaDaPergunta('Agora explique', bloco.checkpoint) : '',
  ]
    .map(chaveDeVoz)
    .filter(Boolean)
}

import { isSceneAudioUrl } from './audio-url'

/**
 * A voz do Zappy nas cenas: o dicionário `roteiro efetivo → arquivo`.
 *
 * ⭐⭐ Decisão da dona (17/09/2026): a instrução deixa de sair na voz do NAVEGADOR (a do sistema
 * operacional, que muda de máquina para máquina) e passa a sair na voz do Zappy, gravada no
 * ElevenLabs. O caminho é pré-gerar na AUTORIA e servir MP3: o texto da aula é fixo, quem muda é a
 * criança que ouve. Assim o ElevenLabs roda uma vez por frase, na nossa máquina, e o navegador da
 * criança nunca fala com ele — sem chave no cliente, sem latência de síntese, e a aula não cai
 * junto se o serviço cair.
 *
 * ⚠️⚠️ A criança lê o texto editorial correto; o ElevenLabs recebe um ROTEIRO efetivo, que pode
 * ajustar a pronúncia de uma letra isolada ou inserir uma pausa. A chave carrega a versão desse
 * perfil e o roteiro efetivo: mudar qualquer um dos dois não deixa um MP3 antigo fingir que está
 * em dia.
 *
 * ⚠️ Por isso `chaveDeVoz` tem de ser a MESMA função dos dois lados (gerador e player). Ela mora
 * aqui, no core, e não no hook nem no script: duas cópias que divergem num espaço a mais dão um
 * dicionário que nunca acerta, e o sintoma é "o Zappy não fala" sem erro nenhum.
 */

/** Setas, triângulos, marcas e emoji: a voz leria "triângulo preto apontando para a direita". */
const SIMBOLOS = /[←-⇿─-➿⬀-⯿\u{1F300}-\u{1FAFF}]/gu

/** Uma mudança aqui invalida propositalmente o cache dos MP3s pré-gerados. */
export const ZAPPY_PRONUNCIATION_PROFILE_VERSION = 'pt-BR-1'

/**
 * Tetos do dicionário. A chave inclui a versão do perfil, portanto acompanha o teto de uma fala
 * possível, e não o tamanho pequeno dos exemplos atuais.
 */
export const VOZ_LIMITS = { entradas: 12, chave: 6000 } as const

const PAUSE_TAG = /<break time="(0\.\d+|[12](?:\.\d+)?|3(?:\.0+)?)s"\s*\/>/g
const QUALQUER_TAG = /<[^>]*>/g

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

/**
 * Roteiro que pode ir ao ElevenLabs. Não é HTML: só a pausa curta e fechada é aceita, para que a
 * autoria tenha cadência sem ganhar uma superfície livre de SSML.
 */
export function isZappySpeechText(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > VOZ_LIMITS.chave) return false
  const tags = value.match(QUALQUER_TAG) ?? []
  if (tags.some((tag) => !/^<break time="(?:0\.\d+|[12](?:\.\d+)?|3(?:\.0+)?)s"\s*\/>$/.test(tag)))
    return false
  return Boolean(textoFalado(value.replace(QUALQUER_TAG, ' ')))
}

/** Deixa a mesma pausa com a mesma forma para a key e para o cache do R2. */
export function normalizarRoteiroDoZappy(texto: string): string {
  return textoFalado(
    texto.replace(PAUSE_TAG, (_tag, segundos: string) => `<break time="${Number(segundos)}s" />`),
  )
}

/**
 * Perfil global, pequeno e auditável. Só entram aqui correções invariáveis; palavra estrangeira
 * depende do contexto e deve ser ajustada pela própria fala no Admin, depois de ouvida.
 */
export function aplicarPerfilDePronunciaDoZappy(texto: string): string {
  return textoFalado(texto)
    .replace(/(^|[^\p{L}\p{N}])X(?=$|[^\p{L}\p{N}])/gu, '$1xis')
    .replace(/(^|[^\p{L}\p{N}])Y(?=$|[^\p{L}\p{N}])/gu, '$1ípsilon')
}

/** A exceção fica presa ao texto que a criança vê; texto alterado não reaproveita fala velha. */
export interface ZappySpeechOverride {
  sourceText: string
  speechText: string
}

export function isZappySpeechOverride(value: unknown): value is ZappySpeechOverride {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const ajuste = value as Record<string, unknown>
  return (
    typeof ajuste.sourceText === 'string' &&
    ajuste.sourceText === textoFalado(ajuste.sourceText) &&
    isZappySpeechText(ajuste.speechText) &&
    ajuste.speechText === normalizarRoteiroDoZappy(ajuste.speechText)
  )
}

/** O roteiro efetivo preserva a tela como fonte da verdade e só usa ajuste ainda correspondente. */
export function roteiroDoZappy(textoVisivel: string, ajuste?: ZappySpeechOverride): string {
  const origem = textoFalado(textoVisivel)
  if (ajuste && isZappySpeechOverride(ajuste) && ajuste.sourceText === origem)
    return ajuste.speechText
  return aplicarPerfilDePronunciaDoZappy(origem)
}

const VOZ_KEY_PREFIX = `zappy:${ZAPPY_PRONUNCIATION_PROFILE_VERSION}:`

/** A chave que viaja no bloco: versão do perfil mais o roteiro que o Zappy realmente vai falar. */
export function chaveDeVoz(roteiro: string): string {
  return `${VOZ_KEY_PREFIX}${normalizarRoteiroDoZappy(roteiro)}`
}

function isChaveDeVoz(value: string): boolean {
  if (!value.startsWith(VOZ_KEY_PREFIX)) return false
  const roteiro = value.slice(VOZ_KEY_PREFIX.length)
  return isZappySpeechText(roteiro) && value === chaveDeVoz(roteiro)
}

/** `chave do roteiro efetivo → URL do MP3`. Mora na atividade da cena e viaja até o navegador. */
export type SceneVozes = Readonly<Record<string, string>>

/**
 * Tetos do dicionário. Uma cena fala quatro coisas (instrução, contexto do palpite, pergunta do
 * palpite com as opções e checkpoint): 12 entradas é folga larga. Os limites existem porque
 * isto chega do manifesto e do admin, e um `Record` sem teto é payload livre no bloco da aula.
 *
 * ⚠⚠ A CHAVE acompanha o que a AUTORIA aceita, e não o que é sensato gravar: o DTO do members
 * deixa o professor escrever uma pergunta de 5000 caracteres, e a fala dela soma o rótulo e todas
 * as opções. Um teto mais apertado aqui reprovaria o BLOCO INTEIRO na publicação (o guard da
 * atividade devolve falso e a mensagem que sobra é "Configure a atividade e sua verificação"),
 * castigando quem escreveu uma pergunta longa e legal por causa do dicionário de voz. Quem decide
 * o que vale a pena GERAR é o admin, com um teto próprio e um recado que nomeia a fala.
 */
export function isSceneVozes(value: unknown): value is SceneVozes {
  if (value === undefined) return true
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const entradas = Object.entries(value as Record<string, unknown>)
  if (entradas.length > VOZ_LIMITS.entradas) return false
  for (const [chave, url] of entradas) {
    if (!chave || chave.length > VOZ_LIMITS.chave) return false
    if (!isChaveDeVoz(chave)) return false
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
  roteiros: readonly string[],
  vozes: SceneVozes | undefined,
): readonly string[] | null {
  if (!vozes) return null
  const fila: string[] = []
  for (const roteiro of roteiros) {
    const chave = chaveDeVoz(roteiro)
    if (!normalizarRoteiroDoZappy(roteiro)) continue
    const url = vozes[chave]
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

/** O assunto que prepara a observação da cena antes de a criança formular a hipótese. */
export function falaDoContextoDoPalpite(rotulo: string, contexto: { explanation: string }): string {
  return [`${rotulo}.`, contexto.explanation].join(' ')
}

/** A pergunta do palpite e as possibilidades, na mesma ordem das escolhas da tela. */
export function falaDaEscolhaDoPalpite(palpite: {
  prompt: string
  choices: readonly { label: string }[]
}): string {
  const opcoes = palpite.choices.map((c, i) =>
    i === 0 ? `Pode ser: ${semPontoFinal(c.label)}.` : `Ou: ${semPontoFinal(c.label)}.`,
  )
  return [palpite.prompt, ...opcoes].join(' ')
}

/** A instrução prática é uma fala própria, separada da hipótese e de suas alternativas. */
export function falaDaInstrucao(instruction: string): string {
  return instruction
}

export const SCENE_SPEECH_SLOTS = [
  'instruction',
  'prediction-context',
  'prediction-question',
  'checkpoint',
] as const
export type SceneSpeechSlot = (typeof SCENE_SPEECH_SLOTS)[number]
export type SceneSpeechOverrides = Readonly<Partial<Record<SceneSpeechSlot, ZappySpeechOverride>>>

export function isSceneSpeechOverrides(value: unknown): value is SceneSpeechOverrides | undefined {
  if (value === undefined) return true
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const entries = Object.entries(value as Record<string, unknown>)
  if (!entries.length) return false
  return entries.every(
    ([slot, ajuste]) =>
      (SCENE_SPEECH_SLOTS as readonly string[]).includes(slot) && isZappySpeechOverride(ajuste),
  )
}

export interface ZappySpeech {
  slot: SceneSpeechSlot
  /** O que a criança lê, sempre em grafia editorial correta. */
  visibleText: string
  /** O que o ElevenLabs recebe, depois do perfil ou de uma exceção autoral. */
  speechText: string
  key: string
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
export function falasDaCena(bloco: {
  instructions?: string
  checkpoint?: { prompt: string; choices: readonly { label: string }[] }
  prediction?: {
    context: { explanation: string }
    prompt: string
    choices: readonly { label: string }[]
  }
  activity?: { type?: string; zappySpeech?: SceneSpeechOverrides }
}): readonly ZappySpeech[] {
  const demonstracao = bloco.activity?.type === 'demonstration'
  const falas: readonly [SceneSpeechSlot, string][] = [
    ['instruction', falaDaInstrucao(bloco.instructions ?? '')],
    [
      'prediction-context',
      bloco.prediction
        ? falaDoContextoDoPalpite(
          demonstracao ? 'Antes de assistir' : 'Seu palpite',
          bloco.prediction.context,
        )
        : '',
    ],
    ['prediction-question', bloco.prediction ? falaDaEscolhaDoPalpite(bloco.prediction) : ''],
    ['checkpoint', bloco.checkpoint ? falaDaPergunta('Agora explique', bloco.checkpoint) : ''],
  ]
  return falas.flatMap(([slot, visibleText]) => {
    const texto = textoFalado(visibleText)
    if (!texto) return []
    const speechText = roteiroDoZappy(texto, bloco.activity?.zappySpeech?.[slot])
    return [{ slot, visibleText: texto, speechText, key: chaveDeVoz(speechText) }]
  })
}

/** Mantido como atalho da autoria: devolve o roteiro efetivo, não a chave do dicionário. */
export function textosFalaveisDaCena(bloco: Parameters<typeof falasDaCena>[0]): readonly string[] {
  return falasDaCena(bloco).map((fala) => fala.speechText)
}

/** Shared learning contracts. No framework, persistence or editor dependency. */
export * from './authoring'
export * from './gallery-delivery'
export * from './legacy-layout'
export * from './manifest-quiz'
export * from './project-structure'
export * from './quiz'
export * from './requirements'
export * from './section-progression'
export * from './section-templates'
export * from './video-watch'

import {
  castText,
  evaluateDemonstration,
  evaluateExperimentation,
  isSceneActivity,
  openScene,
  readDemonstrationSession,
  readExperimentSession,
  SCENE_IDS,
  SCENE_QUESTIONS,
  type SceneActivity,
  type SceneId,
  type SceneVozes,
  sceneActivityForReading,
  sceneGoalIds,
  sceneHintsFor,
  sceneModel,
  sceneStart,
  sceneTargets,
} from './scene'
import { isSectionCompletion, type SectionCompletion } from './section-progression'
export const SECTION_INTENTS = [
  'presentation',
  'demonstration',
  'exploration',
  'explanation',
  'application',
  'delivery',
  'material',
  'closing',
] as const
export type SectionIntent = (typeof SECTION_INTENTS)[number]
export const SECTION_INTENT_LABELS: Record<SectionIntent, string> = {
  presentation: 'Apresentação',
  demonstration: 'Demonstração',
  exploration: 'Exploração',
  explanation: 'Explicação',
  application: 'Aplicação',
  delivery: 'Entrega e compartilhamento',
  material: 'Material do curso',
  closing: 'Fechamento',
}

export interface LessonSection {
  id: string
  title: string
  objective: string
  intent: SectionIntent
  blockIds: string[]
  workspaceBlockId: string | null
  externalTool: 'estudio' | 'pinta' | null
  /** Authoring-only production requirements. A published lesson cannot contain these. */
  pendingMedia: string[]
  completion?: SectionCompletion
}

export interface LearningChoice {
  id: string
  label: string
}
export interface LearningCheckpoint {
  prompt: string
  choices: LearningChoice[]
  correctChoiceId: string
  explanation: string
}

/**
 * A PREVISÃO: a pergunta que vem ANTES de a criança mexer.
 *
 * É o padrão mais forte do Brilliant — "o que você acha que vai acontecer?" — e o mais barato
 * de trazer, porque quem responde não é o servidor: é a própria cena, quando ela roda.
 *
 * ⚠️⚠️ NÃO é um `checkpoint` com outro nome, e é por isso que tem tipo próprio. O checkpoint
 * entra no `passed` do bloco: errá-lo reprova a atividade. Uma previsão errada é o CAMINHO do
 * aprendizado ("achei que subiria, e desceu"), e reprovar por ela ensinaria a criança a não
 * arriscar — que é o contrário do que a cena pede. Por isso ela não tem gabarito obrigatório e
 * nunca entra na avaliação; o `correctChoiceId` existe só para o relatório do professor saber
 * quantos previram o quê.
 */
export interface LearningPrediction {
  prompt: string
  choices: (LearningChoice & {
    /** Para onde olhar quando a criança escolheu esta opção errada. Ver `ScenePrediction`. */
    shows?: string
  })[]
  /**
   * Opcional, e SEM efeito na conclusão. Serve ao acompanhamento e, desde o lote 2 do raio-x
   * (16/09/2026), a RETOMAR o palpite na tela: por isso ele é público (a previsão não vale nota).
   */
  correctChoiceId?: string
  /** A meta cuja queda responde o palpite. Sem ela, o palpite volta quando a cena conclui. */
  revealOn?: string
}
/** Uma experiência autoral em HTML, isolada num iframe. */
export interface HtmlActivity {
  type: 'html'
  html: string
}

/**
 * Uma pergunta sozinha, como atividade do bloco.
 *
 * ⚠️ Chamava-se `checkpoint` e colidia com `block.checkpoint` — a pergunta que se ANEXA a
 * qualquer atividade — e, pior, com `answers.checkpoint`, que numa era a alternativa
 * escolhida (uma string) e noutra os pedaços da sessão serializada (um array). As duas só
 * não se atropelavam por uma invariante implícita, não documentada, em outro arquivo.
 */
export interface QuestionActivity {
  type: 'question'
}
/**
 * O que uma atividade interativa pode ser. Quatro formas, nenhuma sobreposta.
 *
 * Saíram: `simulation` (a geração 1), `experiment` (modelos 2D) e `comparison`, que não
 * tinham um único uso em curso nenhum; e `prediction` e `sequence`, reescritos no conteúdo.
 * As cenas, que eram um tipo com um campo `mode`, viraram dois tipos irmãos.
 */
export type LearningActivity = QuestionActivity | HtmlActivity | SceneActivity
export interface InteractiveBlock {
  kind: 'interactive'
  title: string
  instructions: string
  hints: string[]
  activity: LearningActivity
  required: boolean
  /** A checkpoint is graded on the server, independently of a custom iframe. */
  checkpoint?: LearningCheckpoint
  /** A pergunta de antes. Não é avaliada: ver `LearningPrediction`. */
  prediction?: LearningPrediction
  /**
   * Esta experimentação entra SEM a pergunta do fim.
   *
   * ⚠️⚠️ É a única maneira de uma aula dizer "aqui a criança só mexe". Toda experimentação herda a
   * pergunta do modelo da cena (`SCENE_QUESTIONS[cena].explain`), e escrever a sua no bloco TROCA a
   * pergunta, nunca a tira. Numa aula com quatro cenas seguidas isso dá oito momentos de responder
   * (previsão + pergunta em cada), e a Aula 1 do Corre Dino é a primeira aula da criança: a dona
   * decidiu manter as quatro previsões e deixar a pergunta do fim só em duas cenas.
   *
   * ⚠️ A cena continua CONCLUINDO sozinha: sem pergunta, quem dá a palavra final é a descoberta
   * (`evaluateSceneBlock`), e a seção que tem a cena como critério fecha do mesmo jeito.
   *
   * ⚠️ Só `true`, e só onde ela teria efeito: na EXPERIMENTAÇÃO de cena e sem `checkpoint` escrito
   * no bloco (`isInteractiveBlock` recusa os dois casos). Campo sem efeito é armadilha para quem
   * autora, e "tirar a pergunta" junto de "escrever a minha" seriam duas ordens contrárias.
   */
  semPerguntaFinal?: true
}
/** Authoring, presentation and evidence use the same hints, including curated mission defaults. */
export function learningHints(block: Pick<InteractiveBlock, 'activity' | 'hints'>): string[] {
  // A escada de três degraus do modelo só entra quando o professor não escreveu a dele.
  // ⚠️ E ela passa pelo ELENCO da atividade: as pistas citam o Dino e o cacto pelo nome, e a
  // cena vestida com outro personagem ficaria com a ajuda falando de um terceiro.
  // ⚠️ A atividade sai para uma const: dentro do callback do `map` o TypeScript perde o
  // estreitamento de `block.activity`, e `cast` deixa de existir para ele.
  const atividade = block.activity
  if (atividade.type === 'experimentation' && block.hints.length === 0)
    // ⚠️ Pela `sceneHintsFor` (full review de experiência, A1): com `pilha: 'camadas'` a escada fala do
    // painel Camadas do Pinta, que se lê ao contrário da lista de blocos do Estúdio.
    return sceneHintsFor(atividade).map((h) => castText(h, atividade.cast))
  return block.hints
}
/** Nenhuma das quatro atividades carrega gabarito: o que precisa ficar no servidor é o
 *  `correctChoiceId` da pergunta anexa, tratado abaixo. */
export type PublicLearningActivity = LearningActivity
export interface PublicInteractiveBlock
  extends Omit<InteractiveBlock, 'activity' | 'checkpoint' | 'prediction' | 'semPerguntaFinal'> {
  activity: PublicLearningActivity
  checkpoint?: Omit<LearningCheckpoint, 'correctChoiceId' | 'explanation'>
  /**
   * ⚠️⚠️ A previsão é PÚBLICA inteira, com o `correctChoiceId`, o `revealOn` e os `shows` (lote 2
   * do Raio-X, 16/09/2026). Ela não vale nota, então não é gabarito: é o que o player precisa para
   * RETOMAR o palpite na tela ("Você achou: Nada. E foi isso mesmo!"). Podada como o checkpoint, a
   * criança apostava antes de mexer e nunca ficava sabendo se acertou, que é metade do ciclo.
   * ⚠️ O checkpoint continua podado: aquele entra no `passed`.
   */
  prediction?: LearningPrediction
}
const PUBLIC_ACTIVITY_FIELDS: Record<string, readonly string[]> = {
  // ⚠️ `cast` é PÚBLICO de propósito: é texto que a criança lê, não gabarito. Sem ele na
  // lista, a cena chegaria ao navegador falando de Dino num curso de nave.
  // ⚠️⚠️ `setup` também é PÚBLICO, e por um motivo mais duro que o do elenco: ele é o estado
  // de PARTIDA da cena. Sem ele no navegador, a criança abriria o mundo de fábrica enquanto o
  // servidor avalia o caso do professor — duas cenas diferentes com o mesmo nome.
  demonstration: [
    'type',
    'scene',
    'script',
    'instructionAudioUrl',
    // ⚠⚠ PÚBLICO por definição: o dicionário da voz do Zappy é o que o "Ouvir" toca. Fora da
    // lista, o bloco chega ao navegador sem áudio nenhum e a cena volta à voz do sistema, calada
    // quanto ao motivo. Não é gabarito: é o MESMO texto que já está escrito na tela.
    'vozes',
    'cast',
    'setup',
    'presentation',
    'pilha',
  ],
  // ⚠️ `pilha` é PÚBLICA (full review de experiência, A1): é como a bancada se apresenta. Sem ela no
  // navegador, a Aula 5 do Meu Jeito voltaria a mostrar a lista do Estúdio ao contrário do Pinta.
  experimentation: [
    'type',
    'scene',
    'initialImpulse',
    'instructionAudioUrl',
    // ⚠⚠ PÚBLICO por definição: o dicionário da voz do Zappy é o que o "Ouvir" toca. Fora da
    // lista, o bloco chega ao navegador sem áudio nenhum e a cena volta à voz do sistema, calada
    // quanto ao motivo. Não é gabarito: é o MESMO texto que já está escrito na tela.
    'vozes',
    'cast',
    'setup',
    'pilha',
  ],
  question: ['type'],
  html: ['type', 'html'],
}
function publicActivity(activity: LearningActivity): LearningActivity {
  const permitidos = PUBLIC_ACTIVITY_FIELDS[activity.type]
  if (!permitidos) return { type: 'question' }
  const cru = activity as unknown as Record<string, unknown>
  const saida: Record<string, unknown> = {}
  for (const campo of permitidos) if (cru[campo] !== undefined) saida[campo] = cru[campo]
  // ⚠️⚠️ A meta que a cena não tem não chega ao navegador (full review final de dados e deploy,
  // MÉDIO-3): um bloco do banco citando um id que não existe sumia da aula e travava a seção
  // obrigatória. Quem autora vê o erro no editor do admin; a criança não perde a aula por isso.
  return sceneActivityForReading(saida) as unknown as LearningActivity
}

/** Answer keys stay on the server, including for custom HTML activities. */
/**
 * A PREVISÃO e a PERGUNTA desta atividade: as do bloco, quando o professor escreveu; as do
 * MODELO da cena, quando não.
 *
 * ⚠️⚠️ É o conserto de raiz do padrão mais caro que construímos e menos usamos. Os dois campos
 * nasceram OPCIONAIS no bloco, e a medição foi dura: de 52 blocos de cena nos cursos, 7 tinham
 * previsão e 8 tinham pergunta — 13% e 15%. A pergunta certa para uma cena é propriedade DA
 * CENA, não do bloco: "o que acontece com a velocidade em zero" é a mesma em toda aula que usa
 * `velocity`. Escrita uma vez no catálogo, ela chega a todo bloco de toda aula sem tocar em
 * manifesto nenhum.
 *
 * ⚠️ O bloco continua vencendo: quem escreve a sua, usa a sua. O que mudou é o PADRÃO.
 *
 * ⚠️ O texto passa pelo ELENCO, como tudo o que a plataforma gera — sem isso uma turma de nave
 * leria a pergunta falando do Dino.
 *
 * ⚠️⚠️ **A busca é opcional (`?.`) de propósito, e o `Record<SceneId, …>` não dispensa isso.**
 * Estes dois resolvedores são chamados pelo `publicInteractiveBlock`, que roda sobre o conteúdo
 * CRU do banco, sem passar pelo guard — está escrito lá embaixo, e é por isso que a poda de
 * gabarito existe. Uma linha gravada com um id de cena que não existe mais faria
 * `SCENE_QUESTIONS[a.scene].prediction` LANÇAR, e a exceção derrubaria o GET da aula inteira,
 * não só aquele bloco. Sem modelo, a cena volta a não ter pergunta — que é exatamente o que ela
 * era antes deste lote.
 */
export function blockPrediction(block: InteractiveBlock): LearningPrediction | undefined {
  if (block.prediction) return block.prediction
  const a = block.activity
  if (a.type !== 'experimentation' && a.type !== 'demonstration') return undefined
  // ⚠️⚠️ A demonstração `inline` fica de FORA do padrão, e é o contrário de um detalhe: ela existe
  // para ser "um ▶ e nada mais, no meio de uma explicação" — o degrau entre o parágrafo e a
  // simulação. A previsão TRAVA o palco até a criança escolher, então herdá-la aqui põe uma
  // pergunta de duas opções e um portão em frente a um botão que devia caber numa frase. Quem
  // escreve a previsão no bloco continua mandando: o que não pode é a plataforma pôr uma por
  // conta própria num formato desenhado para não ter nenhuma.
  if (a.type === 'demonstration' && a.presentation === 'inline') return undefined
  const modelo = SCENE_QUESTIONS[a.scene]?.prediction
  if (!modelo) return undefined
  return {
    prompt: castText(modelo.prompt, a.cast),
    // ⚠️ O `shows` passa pelo elenco como o rótulo: é a frase que a criança lê logo depois de
    // ver a cena ("Olhe a tela: ela ficou vazia"), e ela cita o personagem.
    choices: modelo.choices.map((c) => ({
      id: c.id,
      label: castText(c.label, a.cast),
      ...(c.shows ? { shows: castText(c.shows, a.cast) } : {}),
    })),
    correctChoiceId: modelo.correctChoiceId,
    ...(modelo.revealOn ? { revealOn: modelo.revealOn } : {}),
  }
}

/**
 * ⚠️⚠️ A pergunta padrão vale só na EXPERIMENTAÇÃO, e é deliberado: ela dá a palavra final sobre
 * a conclusão do bloco (o terceiro tempo do ciclo — mexer, prever, enunciar). Na demonstração a
 * criança assistiu, e cobrar dela a regra depois de um roteiro que ela não conduziu seria cobrar
 * um gesto que a tela não ofereceu.
 */
export function blockCheckpoint(block: InteractiveBlock): LearningCheckpoint | undefined {
  if (block.checkpoint) return block.checkpoint
  // ⚠️ DEPOIS da pergunta escrita no bloco, de propósito: os dois juntos são recusados na autoria,
  // mas este resolvedor roda sobre o conteúdo CRU do banco, sem passar pelo guard. Se uma linha
  // antiga carregar os dois, quem a criança vê continua sendo a pergunta que alguém escreveu.
  if (block.semPerguntaFinal) return undefined
  const a = block.activity
  if (a.type !== 'experimentation') return undefined
  const modelo = SCENE_QUESTIONS[a.scene]?.explain
  if (!modelo) return undefined
  return {
    prompt: castText(modelo.prompt, a.cast),
    choices: modelo.choices.map((c) => ({ id: c.id, label: castText(c.label, a.cast) })),
    correctChoiceId: modelo.correctChoiceId,
    explanation: castText(modelo.explanation, a.cast),
  }
}

export function publicInteractiveBlock(block: InteractiveBlock): PublicInteractiveBlock {
  // ⚠️ Poda defensiva: a projeção roda sobre o conteúdo CRU do banco, sem passar pelo
  // guard. Uma linha gravada antes desta reescrita pode carregar um gabarito (`solution`) —
  // copiar a atividade inteira mandaria a resposta para o navegador da criança.
  const activity = publicActivity(block.activity)
  const pergunta = blockCheckpoint(block)
  const palpite = blockPrediction(block)
  return {
    kind: 'interactive',
    title: block.title,
    instructions: block.instructions,
    hints: block.hints,
    required: block.required,
    activity,
    // ⚠️ Pelos RESOLVEDORES, não pelos campos crus: é aqui que a previsão e a pergunta do
    // modelo chegam à criança. A poda do gabarito da PERGUNTA continua a mesma: o
    // `correctChoiceId` e a `explanation` dela não saem daqui em nenhum dos dois caminhos.
    ...(pergunta
      ? {
          checkpoint: {
            prompt: pergunta.prompt,
            choices: pergunta.choices.map((c) => ({ id: c.id, label: c.label })),
          },
        }
      : {}),
    // ⚠️⚠️ A previsão sai INTEIRA (ver `PublicInteractiveBlock.prediction`), mas copiada campo a
    // campo: a projeção roda sobre o conteúdo CRU do banco, e espalhar o objeto levaria junto
    // qualquer chave que uma linha antiga carregasse.
    ...(palpite
      ? {
          prediction: {
            prompt: palpite.prompt,
            choices: palpite.choices.map((c) => ({
              id: c.id,
              label: c.label,
              ...(typeof c.shows === 'string' ? { shows: c.shows } : {}),
            })),
            ...(typeof palpite.correctChoiceId === 'string'
              ? { correctChoiceId: palpite.correctChoiceId }
              : {}),
            ...(typeof palpite.revealOn === 'string' ? { revealOn: palpite.revealOn } : {}),
          },
        }
      : {}),
  }
}
export function isPublicInteractiveBlock(value: unknown): value is PublicInteractiveBlock {
  if (!record(value) || !record(value.activity)) return false
  const a = value.activity
  const checkpoint = value.checkpoint
  if (checkpoint !== undefined && (!record(checkpoint) || !choices(checkpoint.choices)))
    return false
  const prediction = value.prediction
  if (prediction !== undefined && (!record(prediction) || !choices(prediction.choices)))
    return false
  return isInteractiveBlock({
    ...value,
    // ⚠️⚠️ A LEITURA é tolerante com a meta desconhecida (`sceneActivityForReading`). Este guarda roda
    // no NAVEGADOR, contra o catálogo DO NAVEGADOR: com o members à frente numa aba já aberta, uma meta
    // nova derrubaria a atividade inteira. Quem consome lê as metas pelo `sceneTargets`/`sceneSetupGoals`.
    activity: sceneActivityForReading(a),
    // ⚠️⚠️ O `revealOn` é conferido na AUTORIA, nunca aqui (review do lote 2 do Raio-X). Este guarda
    // roda no NAVEGADOR, contra o catálogo DO NAVEGADOR: com o members um deploy à frente (ou numa
    // aba aberta antes do deploy), uma previsão apontando para uma meta nova derrubava a atividade
    // INTEIRA em "precisa de uma configuração válida". Uma meta que o player não conhece só nunca
    // cai, e o palpite volta na conclusão, que é o comportamento sem `revealOn`.
    ...(record(prediction) && typeof prediction.revealOn === 'string'
      ? { prediction: { ...prediction, revealOn: undefined } }
      : {}),
    ...(record(checkpoint) && choices(checkpoint.choices)
      ? {
          checkpoint: {
            ...checkpoint,
            correctChoiceId: checkpoint.choices[0]?.id,
            explanation: 'server',
          },
        }
      : {}),
  })
}
export type LearningValue = string | number | boolean | null | string[] | Record<string, number>
export type LearningAnswers = Record<string, LearningValue>
export interface LearningResult {
  participated: boolean
  passed: boolean
  feedback: string
  verifiedBy: 'server' | 'client'
  /** Exploration is evidence of manipulating a model, not a claim of conceptual mastery. */
  evidence?: 'exploration' | 'understanding' | 'demonstration'
}
export interface LearningBlockProgress {
  blockId: string
  revision: string
  positionSeconds: number | null
  answers: LearningAnswers
  hintsUsed: number
  attemptsCount: number
  result: LearningResult | null
  updatedAt: string
}
export interface LessonLearningProgress {
  sectionId: string | null
  blocks: LearningBlockProgress[]
}
export interface LearningAttemptView {
  id: string
  blockId: string
  revision: string
  answers: LearningAnswers
  hintsUsed: number
  result: LearningResult
  createdAt: string
}
export interface LessonLearningReport {
  sectionProgress?: import('./section-progression').SectionProgressView
  milestones?: import('./section-progression').SectionProgressRecord[]
  evidence?: LessonEvidence[]
  evidenceNextCursor?: string | null
  lessonTitle: string
  sections: LessonSection[]
  activities: Array<{ id: string; revision: string; content: PublicInteractiveBlock }>
  lessonId: string
  userId: string
  sectionId: string | null
  blocks: LearningBlockProgress[]
  attempts: LearningAttemptView[]
}
export interface LearningTopicSummary {
  lessonId: string
  lessonTitle: string
  topics: string[]
}

export interface LessonEvidence {
  id: string
  kind: 'section_project' | 'platform_action' | 'quiz' | 'studio'
  blockId: string | null
  sectionId: string | null
  revision: string
  createdAt: string
  payload: unknown
}

export interface LessonEvidencePage {
  items: LessonEvidence[]
  nextCursor: string | null
}

export const MAX_LEARNING_STATE_BYTES = 32_000
export const LEARNING_PROTOCOL = 'sz-learning-v1'
export interface LearningFrameMessage {
  protocol: typeof LEARNING_PROTOCOL
  instance: string
  event: 'ready' | 'state' | 'participated' | 'resize'
  state?: LearningAnswers
  height?: number
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function text(value: unknown, max = 10_000): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max
}
function strings(value: unknown, max = 100): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= max &&
    value.every((v) => typeof v === 'string' && v.length <= 10_000)
  )
}
function choices(value: unknown): value is LearningChoice[] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.length <= 20 &&
    value.every((v) => record(v) && text(v.id, 80) && text(v.label, 2000)) &&
    new Set(value.map((v: LearningChoice) => v.id)).size === value.length
  )
}
export function isLearningAnswers(value: unknown): value is LearningAnswers {
  if (!record(value) || Object.keys(value).length > 40) return false
  return (
    Object.entries(value).every(([key, v]) => {
      if (!/^[a-zA-Z][\w-]{0,79}$/.test(key)) return false
      if (v === null || typeof v === 'boolean') return true
      if (typeof v === 'string') return v.length <= 8000
      if (typeof v === 'number') return Number.isFinite(v)
      if (Array.isArray(v)) return strings(v, 100)
      return (
        record(v) &&
        Object.keys(v).length <= 20 &&
        Object.entries(v).every(
          ([k, n]) =>
            /^[a-zA-Z][\w-]{0,79}$/.test(k) && typeof n === 'number' && Number.isFinite(n),
        )
      )
    }) && new TextEncoder().encode(JSON.stringify(value)).byteLength <= MAX_LEARNING_STATE_BYTES
  )
}
/**
 * A atividade do modelo ANTERIOR, trazida para o de agora.
 *
 * ⚠️⚠️ Isto existe porque o plano da reescrita partiu de uma premissa que era falsa no ambiente
 * dela: "nada foi usado por ninguém". Havia aulas com blocos interativos já gravados, e ao tirar
 * os seis tipos antigos do contrato esses blocos pararam de poder ser SALVOS — o que trava a aula
 * inteira, porque o editor desabilita o botão quando o bloco é inválido e a importação de roteiro
 * tenta salvar o bloco aberto antes de começar. A professora ficava sem saída: não conseguia nem
 * consertar, nem importar por cima.
 *
 * O que dá para converter com fidelidade, converte:
 * - `exploration` (v2 e v3) era o MESMO motor de cena com outro nome. A missão vira a cena, e o
 *   modo escolhe entre as duas irmãs: `demo` vira demonstração, o resto vira experimentação.
 *
 * O que NÃO dá, vira **pergunta curta**, preservando o enunciado e o gabarito que o bloco já
 * tivesse: `prediction`, `sequence`, `simulation`, `comparison` e `experiment` não têm equivalente
 * automático (a conversão do conteúdo do repositório foi escrita à mão, texto por texto). Virar
 * pergunta é o destino que mantém o bloco ABERTO para ela decidir, em vez de prendê-lo.
 *
 * Devolve `null` quando não há o que migrar — a atividade já é atual, ou não é reconhecível.
 */
export function migrateLegacyActivity(value: unknown): LearningActivity | null {
  if (!record(value) || typeof value.type !== 'string') return null
  if (isSceneActivity(value) || value.type === 'question' || value.type === 'html') return null
  if (value.type === 'exploration') {
    const cena = SCENE_IDS.find((id) => id === value.mission)
    if (!cena) return { type: 'question' }
    return value.mode === 'demo'
      ? { type: 'demonstration', scene: cena as SceneId }
      : { type: 'experimentation', scene: cena as SceneId }
  }
  if (['prediction', 'sequence', 'simulation', 'comparison', 'experiment'].includes(value.type))
    return { type: 'question' }
  return null
}

/**
 * O BLOCO inteiro trazido para o modelo de agora; `null` quando não havia o que migrar.
 *
 * ⚠️ NÃO garante bloco publicável, e isso é deliberado: um `prediction` sem gabarito vira uma
 * pergunta SEM pergunta, que o `isInteractiveBlock` recusa — e deve recusar mesmo, porque ele é
 * o guarda da PUBLICAÇÃO. O rascunho aceita campo vazio de propósito; o que a migração precisa
 * garantir é que o bloco volte a ser EDITÁVEL e SALVÁVEL, para a professora completar ou apagar.
 * Filtrar por validade aqui só trocaria uma parede por outra, que foi o defeito original.
 */
export function migrateLegacyInteractiveBlock(value: unknown): InteractiveBlock | null {
  if (!record(value) || value.kind !== 'interactive') return null
  const activity = migrateLegacyActivity(value.activity)
  return activity ? ({ ...value, activity } as InteractiveBlock) : null
}

export function isInteractiveBlock(value: unknown): value is InteractiveBlock {
  if (
    !record(value) ||
    value.kind !== 'interactive' ||
    !text(value.title, 200) ||
    !text(value.instructions) ||
    !strings(value.hints, 10) ||
    new Set(value.hints).size !== value.hints.length ||
    typeof value.required !== 'boolean' ||
    !record(value.activity)
  )
    return false
  if (value.checkpoint !== undefined) {
    const c = value.checkpoint
    if (
      !record(c) ||
      !text(c.prompt, 5000) ||
      !choices(c.choices) ||
      !text(c.explanation, 5000) ||
      !c.choices.some((choice) => choice.id === c.correctChoiceId)
    )
      return false
  }
  if (value.prediction !== undefined) {
    const p = value.prediction
    // ⚠️ O gabarito é OPCIONAL aqui, ao contrário do checkpoint: previsão sem resposta certa é
    // legítima ("o que você acha que vai acontecer?" numa cena de exploração livre). Quando
    // existe, ele precisa apontar para uma das alternativas — um id solto seria um relatório
    // dizendo que ninguém previu certo.
    if (!record(p) || !text(p.prompt, 5000) || !choices(p.choices)) return false
    if (
      p.correctChoiceId !== undefined &&
      !p.choices.some((choice) => choice.id === p.correctChoiceId)
    )
      return false
    // O "para onde olhar" de cada opção: texto curto, ou nada.
    if (
      !p.choices.every((choice) => {
        const shows = (choice as { shows?: unknown }).shows
        return shows === undefined || text(shows, 2000)
      })
    )
      return false
    // ⚠️ `revealOn` precisa ser uma meta DESTA cena: um id solto é um palpite que só volta na
    // conclusão, sem aviso nenhum a quem escreveu. Fora de cena ele não tem efeito, e campo sem
    // efeito é armadilha para quem autora.
    if (p.revealOn !== undefined) {
      const a = value.activity
      const cena =
        (a.type === 'experimentation' || a.type === 'demonstration') &&
        SCENE_IDS.some((s) => s === a.scene)
          ? (a.scene as SceneId)
          : null
      if (typeof p.revealOn !== 'string' || !cena || !sceneGoalIds(cena).includes(p.revealOn))
        return false
    }
  }
  const a = value.activity
  // ⚠️⚠️ "Esta cena entra sem a pergunta do fim" só vale onde ela teria efeito: a pergunta de fábrica
  // é da EXPERIMENTAÇÃO (na demonstração a criança não conduziu, e ali não existe pergunta a tirar), e
  // um bloco que escreveu a PRÓPRIA pergunta estaria dando duas ordens contrárias. Nos dois casos o
  // campo seria decoração silenciosa, que é a armadilha que o `goals` da demonstração já recusa.
  if (value.semPerguntaFinal !== undefined) {
    if (value.semPerguntaFinal !== true || value.checkpoint !== undefined) return false
    if (!record(a) || a.type !== 'experimentation' || !SCENE_IDS.some((s) => s === a.scene))
      return false
  }
  switch (a.type) {
    case 'demonstration':
    case 'experimentation':
      // ⚠️⚠️ A cena ACEITA pergunta anexa desde 15/09/2026, e isso já foi proibido: quando a
      // sessão da cena morava em `answers.checkpoint`, a mesma chave guardaria a alternativa
      // escolhida E os pedaços da sessão. Hoje a sessão mora em `answers.sceneCheckpoint` e a
      // colisão não existe mais — o que a proibição custava era o TERCEIRO tempo do ciclo:
      // mexer, prever, e então enunciar a regra com as próprias palavras. Sem ela, a regra só
      // cabia numa seção separada, com outra atividade.
      return isSceneActivity(a)
    case 'question':
      return value.checkpoint !== undefined
    case 'html':
      // ⚠️ HTML é código de terceiro num iframe: ele pode dizer "participei" sozinho. Se o
      // bloco é ESSENCIAL para concluir a seção, a prova tem de vir de uma pergunta que o
      // servidor corrige — senão a criança avança sem que ninguém tenha conferido nada.
      return text(a.html, 500_000) && (!value.required || value.checkpoint !== undefined)
    default:
      return false
  }
}

/**
 * O resultado de uma atividade.
 *
 * As cenas saem antes do resto: elas guardam a própria sessão e são avaliadas pelo módulo
 * delas. Para as outras duas, a pergunta anexa (quando existe) é quem dá a palavra final.
 */
export function evaluateLearning(
  block: InteractiveBlock,
  answers: LearningAnswers,
): LearningResult {
  const a = block.activity
  if (a.type === 'demonstration' || a.type === 'experimentation')
    return withAttachedQuestion(evaluateSceneBlock(a, answers), block, answers)

  let participated = false
  let feedback = 'Experimente a atividade antes de conferir.'
  let verifiedBy: LearningResult['verifiedBy'] = 'server'
  if (a.type === 'question') {
    participated = block.checkpoint?.choices.some((c) => c.id === answers.checkpoint) ?? false
    feedback = 'Escolha uma resposta antes de conferir.'
  } else if (a.type === 'html') {
    participated = answers.participated === true
    verifiedBy = 'client'
    feedback = participated
      ? 'Exploração registrada.'
      : 'Conclua a exploração para registrar sua participação.'
  } else {
    // ⚠️ Forma desconhecida (um bloco gravado antes desta reescrita) NÃO conclui nada. Um
    // `else` genérico aqui aceitaria um `{participated:true}` do cliente e daria o bloco por
    // cumprido sem ninguém ter respondido coisa alguma.
    feedback = 'Esta atividade precisa ser reconfigurada na autoria.'
  }
  let passed = participated
  if (passed && block.checkpoint) {
    passed = answers.checkpoint === block.checkpoint.correctChoiceId
    verifiedBy = 'server'
    feedback = passed
      ? block.checkpoint.explanation
      : 'Vamos pensar mais um pouco. Consulte a explicação ou uma pista e tente novamente.'
  }
  return { participated, passed, feedback, verifiedBy }
}

/**
 * O recado de uma resposta vinda de uma pergunta que não existe mais. Exportado porque o player
 * reconhece ESTA frase para oferecer "Abrir de novo" no lugar do "tente outra".
 */
export const PERGUNTA_MUDOU = 'Esta pergunta mudou. Abra a aula de novo.'

/**
 * O TERCEIRO tempo do ciclo: mexer, prever, e enunciar a regra.
 *
 * A cena traz a própria evidência e é ela que diz se a criança participou; a pergunta anexa,
 * quando existe, é quem dá a palavra final sobre o `passed` — a mesma regra do HTML e da
 * pergunta solta, e corrigida no servidor do mesmo jeito.
 *
 * ⚠️ Enquanto a cena não foi concluída, a pergunta NÃO reprova: o feedback continua sendo o da
 * cena ("falta ver o que acontece com o y"), que é o que diz à criança o que fazer agora.
 */
function withAttachedQuestion(
  resultado: LearningResult,
  block: InteractiveBlock,
  answers: LearningAnswers,
): LearningResult {
  // ⚠️ O mesmo resolvedor da projeção pública: se a criança VÊ a pergunta do modelo, é essa
  // que o servidor cobra. Lendo o campo cru aqui, a cena passaria sem a pergunta que a tela
  // mostrou — e a tela e o veredito contariam histórias diferentes.
  const pergunta = blockCheckpoint(block)
  if (!pergunta || !resultado.passed) return resultado
  // ⚠️ Uma resposta que não é NENHUMA opção da pergunta de agora vem de uma tela velha: o texto da
  // pergunta mudou (ids novos) enquanto a aba estava aberta. "Ainda não é essa" ali mentiria, e
  // toda opção daquela tela responderia a mesma coisa até um F5 (review do lote 2 do Raio-X).
  if (
    typeof answers.checkpoint === 'string' &&
    !pergunta.choices.some((c) => c.id === answers.checkpoint)
  )
    return { ...resultado, passed: false, verifiedBy: 'server', feedback: PERGUNTA_MUDOU }
  const acertou = answers.checkpoint === pergunta.correctChoiceId
  return {
    ...resultado,
    passed: acertou,
    verifiedBy: 'server',
    // ⚠️ Errar e não ter respondido são coisas diferentes, e davam o MESMO recado: quem tinha
    // escolhido a frase errada lia "agora escolha a frase", que descreve um estado em que ela
    // não está — e sem nenhum sinal de que errou, o caminho natural é reler e reescolher a
    // mesma opção. ⚠️ O gabarito continua sem sair do servidor: o recado diz que não é essa,
    // nunca qual é.
    // ⚠️ Frases de criança (lote 2 do Raio-X): curtas, e sem apontar para um "logo acima" que a
    // tela pode não ter. O player põe o ícone e a cor em volta; aqui fica só a palavra.
    feedback: acertou
      ? pergunta.explanation
      : answers.checkpoint === undefined
        ? 'Última parte: escolha a frase que explica o que aconteceu.'
        : 'Ainda não é essa. Olhe a cena de novo e tente outra.',
  }
}

/** A cena reconstrói a sessão do checkpoint guardado e pergunta ao módulo dela. */
function evaluateSceneBlock(a: SceneActivity, answers: LearningAnswers): LearningResult {
  const parts = answers.sceneCheckpoint
  if (a.type === 'demonstration') {
    const session = readDemonstrationSession(a.scene, parts)
    // Sem nada guardado a criança ainda não abriu: não é evidência inválida, é ausência.
    if (!session) return evaluateDemonstration(false, parts === undefined, false)
    return evaluateDemonstration(session.viewed, true, true)
  }
  const session = readExperimentSession(a.scene, parts)
  // ⚠️ O ELENCO entra aqui também (achado do full review de 14/09/2026): esta é a avaliação do
  // SERVIDOR, e o `feedback` que ela devolve é gravado na tentativa e lido de volta pelo cartão
  // "Descoberta registrada" e pelo relatório do professor. Sem o elenco, uma turma de nave
  // recebia a frase de sucesso falando de Dino e de cacto.
  const alvo = sceneTargets(a)
  if (!session)
    return evaluateExperimentation(
      a.scene,
      openScene(sceneStart(a)),
      parts === undefined,
      a.cast,
      alvo,
      a.pilha,
    )
  return evaluateExperimentation(a.scene, session.state, true, a.cast, alvo, a.pilha)
}

export function isLearningFrameMessage(
  value: unknown,
  instance: string,
): value is LearningFrameMessage {
  if (!record(value) || value.protocol !== LEARNING_PROTOCOL || value.instance !== instance)
    return false
  if (value.event === 'ready') return true
  if (value.event === 'participated')
    return value.state === undefined || isLearningAnswers(value.state)
  if (value.event === 'state') return isLearningAnswers(value.state)
  return (
    value.event === 'resize' &&
    typeof value.height === 'number' &&
    Number.isFinite(value.height) &&
    value.height >= 180 &&
    value.height <= 1600
  )
}

export function defaultLessonSection(
  lessonId: string,
  title: string,
  blockIds: string[],
): LessonSection {
  return {
    id: lessonId,
    title,
    objective: '',
    intent: 'application',
    blockIds,
    workspaceBlockId: null,
    externalTool: null,
    pendingMedia: [],
  }
}

/** Checks referential integrity independently from database ids or UI. */
export function validateLessonSections(
  sections: LessonSection[],
  blocks: { id: string; kind: string }[],
  supportBlockIds: string[] = [],
): string | null {
  if (sections.length < 1 || sections.length > 60) return 'A aula precisa ter entre 1 e 60 seções.'
  if (new Set(sections.map((s) => s.id)).size !== sections.length)
    return 'As seções precisam ter identificadores diferentes.'
  const assigned = [...sections.flatMap((s) => s.blockIds), ...supportBlockIds]
  if (
    assigned.length !== blocks.length ||
    new Set(assigned).size !== blocks.length ||
    blocks.some((b) => !assigned.includes(b.id))
  )
    return 'Cada bloco deve pertencer a uma seção ou aos materiais de apoio, sem duplicação.'
  for (const section of sections) {
    if (section.completion !== undefined && !isSectionCompletion(section.completion))
      return 'Critérios de conclusão inválidos.'
    if (!text(section.title, 200) || section.objective.length > 2000)
      return 'Informe um título e um objetivo válido para cada seção.'
    if (
      section.workspaceBlockId &&
      !blocks.some(
        (b) => b.id === section.workspaceBlockId && (b.kind === 'studio' || b.kind === 'pinta'),
      )
    )
      return 'O espaço de trabalho deve ser um Estúdio ou Pinta desta aula.'
    if (section.workspaceBlockId && section.externalTool)
      return 'Escolha um espaço de trabalho incorporado ou uma ferramenta externa.'
    if (section.workspaceBlockId && supportBlockIds.includes(section.workspaceBlockId))
      return 'Coloque o projeto reutilizado em uma seção do percurso antes de vinculá-lo.'
  }
  return null
}

/** Portable authoring format. Existing projects/media are references, never invented snapshots. */
export interface LearningManifest {
  version: 1 | 2 | 3 | 4
  /** Explicit retirement of earlier imported instructional blocks, reviewed in the import preview. */
  retireBlockKeys?: string[]
  courseSlug: string
  lessonSlug: string
  title: string
  blocks: Array<
    | {
        key: string
        content:
          | InteractiveBlock
          | ManifestQuiz
          | { kind: 'rich_text'; markdown: string }
          | { kind: 'dialogue'; pose?: string; text: string; vozes?: SceneVozes }
      }
    | { key: string; existing: { kind: string; index: number } }
    | { key: string; plannedVideo: string }
  >
  sections: Array<
    Omit<LessonSection, 'id' | 'blockIds' | 'workspaceBlockId'> & {
      key: string
      blockKeys: string[]
      workspaceKey: string | null
    }
  >
}
export function isLearningManifest(value: unknown): value is LearningManifest {
  if (
    !record(value) ||
    (value.version !== 1 && value.version !== 2 && value.version !== 3 && value.version !== 4) ||
    !text(value.courseSlug, 200) ||
    !text(value.lessonSlug, 200) ||
    !text(value.title, 200) ||
    !Array.isArray(value.blocks) ||
    value.blocks.length > 200 ||
    !Array.isArray(value.sections) ||
    value.sections.length === 0 ||
    value.sections.length > 59
  )
    return false
  const key = (v: unknown) => typeof v === 'string' && /^[a-z][a-z0-9-]{0,79}$/.test(v)
  if (
    value.retireBlockKeys !== undefined &&
    (value.version !== 4 ||
      !Array.isArray(value.retireBlockKeys) ||
      value.retireBlockKeys.length > 200 ||
      !value.retireBlockKeys.every(key) ||
      new Set(value.retireBlockKeys).size !== value.retireBlockKeys.length)
  )
    return false
  if (
    !value.blocks.every(
      (b) =>
        record(b) &&
        key(b.key) &&
        (((value.version === 2 || value.version === 3 || value.version === 4) &&
          'plannedVideo' in b &&
          !('content' in b) &&
          !('existing' in b) &&
          text(b.plannedVideo, 5000)) ||
          ('content' in b &&
            !('plannedVideo' in b) &&
            !('existing' in b) &&
            (isInteractiveBlock(b.content) ||
              (value.version === 4 && isManifestQuiz(b.content)) ||
              (record(b.content) &&
                b.content.kind === 'rich_text' &&
                text(b.content.markdown, 50000)) ||
              // Balão de fala do mascote: variante ADITIVA, sem bump de `version`
              // (manifesto antigo nunca a emite, e o novo é lido pelos dois).
              (record(b.content) &&
                b.content.kind === 'dialogue' &&
                text(b.content.text, 400) &&
                (b.content.pose === undefined ||
                  (typeof b.content.pose === 'string' &&
                    ['speaking', 'happy', 'thinking', 'celebrating'].includes(
                      b.content.pose,
                    )))))) ||
          ('existing' in b &&
            !('plannedVideo' in b) &&
            !('content' in b) &&
            record(b.existing) &&
            text(b.existing.kind, 40) &&
            Number.isInteger(b.existing.index) &&
            typeof b.existing.index === 'number' &&
            b.existing.index >= 0 &&
            b.existing.index < 200)),
    )
  )
    return false
  if (
    !value.sections.every(
      (s) =>
        record(s) &&
        key(s.key) &&
        text(s.title, 200) &&
        typeof s.objective === 'string' &&
        s.objective.length <= 2000 &&
        SECTION_INTENTS.some((intent) => intent === s.intent) &&
        strings(s.blockKeys, 200) &&
        (s.workspaceKey === null || key(s.workspaceKey)) &&
        (s.externalTool === null || s.externalTool === 'estudio' || s.externalTool === 'pinta') &&
        strings(s.pendingMedia, 20) &&
        !(s.workspaceKey && s.externalTool) &&
        (s.completion === undefined
          ? value.version !== 3 && value.version !== 4
          : isSectionCompletion(s.completion)),
    )
  )
    return false
  const blockKeys = value.blocks.map((b) => b.key)
  const sectionKeys = value.sections.map((s) => s.key)
  const placed = value.sections.flatMap((s) => s.blockKeys)
  return (
    new Set(blockKeys).size === blockKeys.length &&
    new Set(sectionKeys).size === sectionKeys.length &&
    new Set(placed).size === placed.length &&
    placed.length === blockKeys.length &&
    placed.every((k) => blockKeys.includes(k)) &&
    (!Array.isArray(value.retireBlockKeys) ||
      value.retireBlockKeys.every((k) => !blockKeys.includes(k))) &&
    value.sections.every((s) => s.workspaceKey === null || blockKeys.includes(s.workspaceKey))
  )
}
export * from './platform-action'

import { isManifestQuiz, type ManifestQuiz } from './manifest-quiz'

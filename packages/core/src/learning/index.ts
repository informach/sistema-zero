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
  evaluateDemonstration,
  evaluateExperimentation,
  initialScene,
  isSceneActivity,
  readDemonstrationSession,
  readExperimentSession,
  type SceneActivity,
  sceneModel,
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
}
/** Authoring, presentation and evidence use the same hints, including curated mission defaults. */
export function learningHints(block: Pick<InteractiveBlock, 'activity' | 'hints'>): string[] {
  // A escada de três degraus do modelo só entra quando o professor não escreveu a dele.
  if (block.activity.type === 'experimentation' && block.hints.length === 0)
    return [...sceneModel(block.activity.scene).hints]
  return block.hints
}
/** Nenhuma das quatro atividades carrega gabarito: o que precisa ficar no servidor é o
 *  `correctChoiceId` da pergunta anexa, tratado abaixo. */
export type PublicLearningActivity = LearningActivity
export interface PublicInteractiveBlock extends Omit<InteractiveBlock, 'activity' | 'checkpoint'> {
  activity: PublicLearningActivity
  checkpoint?: Omit<LearningCheckpoint, 'correctChoiceId' | 'explanation'>
}
const PUBLIC_ACTIVITY_FIELDS: Record<string, readonly string[]> = {
  demonstration: ['type', 'scene', 'script', 'instructionAudioUrl'],
  experimentation: ['type', 'scene', 'initialImpulse', 'instructionAudioUrl'],
  question: ['type'],
  html: ['type', 'html'],
}
function publicActivity(activity: LearningActivity): LearningActivity {
  const permitidos = PUBLIC_ACTIVITY_FIELDS[activity.type]
  if (!permitidos) return { type: 'question' }
  const cru = activity as unknown as Record<string, unknown>
  const saida: Record<string, unknown> = {}
  for (const campo of permitidos) if (cru[campo] !== undefined) saida[campo] = cru[campo]
  return saida as unknown as LearningActivity
}

/** Answer keys stay on the server, including for custom HTML activities. */
export function publicInteractiveBlock(block: InteractiveBlock): PublicInteractiveBlock {
  // ⚠️ Poda defensiva: a projeção roda sobre o conteúdo CRU do banco, sem passar pelo
  // guard. Uma linha gravada antes desta reescrita pode carregar um gabarito (`solution`) —
  // copiar a atividade inteira mandaria a resposta para o navegador da criança.
  const activity = publicActivity(block.activity)
  return {
    kind: 'interactive',
    title: block.title,
    instructions: block.instructions,
    hints: block.hints,
    required: block.required,
    activity,
    ...(block.checkpoint
      ? { checkpoint: { prompt: block.checkpoint.prompt, choices: block.checkpoint.choices } }
      : {}),
  }
}
export function isPublicInteractiveBlock(value: unknown): value is PublicInteractiveBlock {
  if (!record(value) || !record(value.activity)) return false
  const a = value.activity
  const checkpoint = value.checkpoint
  if (checkpoint !== undefined && (!record(checkpoint) || !choices(checkpoint.choices)))
    return false
  return isInteractiveBlock({
    ...value,
    activity: a,
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
  const a = value.activity
  switch (a.type) {
    case 'demonstration':
    case 'experimentation':
      // ⚠️ Cena não aceita pergunta anexa: `answers.checkpoint` seria a alternativa
      // escolhida E os pedaços da sessão ao mesmo tempo, na mesma chave.
      return isSceneActivity(a) && value.checkpoint === undefined
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
    return evaluateSceneBlock(a, answers)

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
  if (!session) return evaluateExperimentation(a.scene, initialScene(a), parts === undefined)
  return evaluateExperimentation(a.scene, session.state)
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
          | { kind: 'dialogue'; pose?: string; text: string }
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

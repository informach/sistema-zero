/** Shared learning contracts. No framework, persistence or editor dependency. */
export * from './authoring'
export * from './project-structure'
export * from './requirements'
export * from './section-progression'

import { isSectionCompletion, type SectionCompletion } from './section-progression'
export const SECTION_INTENTS = [
  'presentation',
  'demonstration',
  'exploration',
  'explanation',
  'application',
  'closing',
] as const
export type SectionIntent = (typeof SECTION_INTENTS)[number]
export const SECTION_INTENT_LABELS: Record<SectionIntent, string> = {
  presentation: 'Apresentação',
  demonstration: 'Demonstração',
  exploration: 'Exploração',
  explanation: 'Explicação',
  application: 'Aplicação',
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
export interface PredictionActivity {
  type: 'prediction'
  choices: LearningChoice[]
  outcome: string
}
export interface ComparisonActivity {
  type: 'comparison'
  left: { label: string; url: string; alt: string }
  right: { label: string; url: string; alt: string }
}
export interface SequenceActivity {
  type: 'sequence'
  items: LearningChoice[]
  /** Ordering uses all items; matching pairs item ids with distinct labels. */
  mode: 'order' | 'match'
  solution: string[]
  targets: string[]
}
export const EXPERIMENT_PRESETS = ['motion', 'population', 'collision'] as const
export type ExperimentPreset = (typeof EXPERIMENT_PRESETS)[number]
export interface ExperimentActivity {
  type: 'experiment'
  preset: ExperimentPreset
  parameters: Record<string, number>
}
export interface HtmlActivity {
  type: 'html'
  html: string
}
export interface CheckpointActivity {
  type: 'checkpoint'
}
export type LearningActivity =
  | CheckpointActivity
  | PredictionActivity
  | ComparisonActivity
  | SequenceActivity
  | ExperimentActivity
  | HtmlActivity
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
export type PublicLearningActivity =
  | Exclude<LearningActivity, SequenceActivity>
  | Omit<SequenceActivity, 'solution'>
export interface PublicInteractiveBlock extends Omit<InteractiveBlock, 'activity' | 'checkpoint'> {
  activity: PublicLearningActivity
  checkpoint?: Omit<LearningCheckpoint, 'correctChoiceId' | 'explanation'>
}
/** Answer keys stay on the server, including for custom HTML activities. */
export function publicInteractiveBlock(block: InteractiveBlock): PublicInteractiveBlock {
  const activity =
    block.activity.type === 'sequence'
      ? {
          type: block.activity.type,
          items: block.activity.items,
          mode: block.activity.mode,
          targets: block.activity.targets,
        }
      : block.activity
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
    activity:
      a.type === 'sequence' && choices(a.items)
        ? { ...a, solution: a.items.map((item) => item.id) }
        : a,
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
  kind: 'section_project' | 'quiz' | 'studio'
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
function media(value: unknown): value is ComparisonActivity['left'] {
  return (
    record(value) &&
    text(value.label, 200) &&
    text(value.alt, 1000) &&
    text(value.url, 4000) &&
    (/^https?:\/\//.test(value.url) || /^\/[^/]/.test(value.url))
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
    case 'checkpoint':
      return value.checkpoint !== undefined
    case 'prediction':
      return choices(a.choices) && text(a.outcome)
    case 'comparison':
      return media(a.left) && media(a.right)
    case 'sequence': {
      const solution = a.solution
      return (
        choices(a.items) &&
        strings(solution, 20) &&
        strings(a.targets, 20) &&
        solution.length === a.items.length &&
        new Set(solution).size === a.items.length &&
        a.items.every((item) => solution.includes(item.id)) &&
        (a.mode === 'order' ||
          (a.mode === 'match' &&
            a.targets.length === a.items.length &&
            new Set(a.targets).size === a.targets.length))
      )
    }
    case 'experiment':
      return (
        EXPERIMENT_PRESETS.some((p) => p === a.preset) &&
        record(a.parameters) &&
        (!value.required || value.checkpoint !== undefined) &&
        Object.keys(a.parameters).length <= 10 &&
        Object.values(a.parameters).every((n) => typeof n === 'number' && Number.isFinite(n))
      )
    case 'html':
      return text(a.html, 500_000) && (!value.required || value.checkpoint !== undefined)
    default:
      return false
  }
}

/** Prediction errors are observations, never a grade. Only a checkpoint/sequence verifies mastery. */
export function evaluateLearning(
  block: InteractiveBlock,
  answers: LearningAnswers,
): LearningResult {
  const a = block.activity
  let participated = false
  let passed = false
  let feedback = 'Experimente a atividade antes de conferir.'
  let verifiedBy: LearningResult['verifiedBy'] = 'server'
  switch (a.type) {
    case 'checkpoint':
      participated = block.checkpoint?.choices.some((c) => c.id === answers.checkpoint) ?? false
      passed = participated
      feedback = 'Escolha uma resposta antes de conferir.'
      break
    case 'prediction':
      participated =
        a.choices.some((choice) => choice.id === answers.prediction) && answers.observed === true
      passed = participated
      feedback = participated ? a.outcome : 'Escolha sua previsão e observe o resultado.'
      break
    case 'comparison':
      participated = answers.leftObserved === true && answers.rightObserved === true
      passed = participated
      feedback = participated
        ? 'Você comparou as duas possibilidades. Use o que observou na sua criação.'
        : 'Observe os dois lados antes de continuar.'
      break
    case 'sequence': {
      const order = answers.order
      participated =
        Array.isArray(order) &&
        order.length === a.items.length &&
        new Set(order).size === a.items.length &&
        a.items.every((item) => order.includes(item.id))
      passed = participated && Array.isArray(order) && order.every((id, i) => id === a.solution[i])
      feedback = passed
        ? 'As relações estão corretas. Agora aplique essa ideia no seu projeto.'
        : 'Confira as relações entre as peças. Você pode consultar uma pista e tentar novamente.'
      break
    }
    case 'experiment':
      participated =
        typeof answers.experiments === 'number' &&
        answers.experiments >= 2 &&
        answers.observed === true
      passed = participated
      verifiedBy = 'client'
      feedback = participated
        ? 'Você observou dois resultados. Compare o que mudou ao ajustar os valores.'
        : 'Execute e observe pelo menos duas configurações.'
      break
    case 'html':
      participated = answers.participated === true
      passed = participated
      verifiedBy = 'client'
      feedback = participated
        ? 'Exploração registrada.'
        : 'Conclua a exploração para registrar sua participação.'
      break
  }
  if (passed && block.checkpoint) {
    passed = answers.checkpoint === block.checkpoint.correctChoiceId
    verifiedBy = 'server'
    feedback = passed
      ? block.checkpoint.explanation
      : 'Vamos pensar mais um pouco. Consulte a explicação ou uma pista e tente novamente.'
  }
  return { participated, passed, feedback, verifiedBy }
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
  version: 1 | 2 | 3
  courseSlug: string
  lessonSlug: string
  title: string
  blocks: Array<
    | {
        key: string
        content:
          | InteractiveBlock
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
    (value.version !== 1 && value.version !== 2 && value.version !== 3) ||
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
    !value.blocks.every(
      (b) =>
        record(b) &&
        key(b.key) &&
        (((value.version === 2 || value.version === 3) &&
          'plannedVideo' in b &&
          !('content' in b) &&
          !('existing' in b) &&
          text(b.plannedVideo, 5000)) ||
          ('content' in b &&
            !('plannedVideo' in b) &&
            !('existing' in b) &&
            (isInteractiveBlock(b.content) ||
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
        (s.completion === undefined ? value.version !== 3 : isSectionCompletion(s.completion)),
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
    value.sections.every((s) => s.workspaceKey === null || blockKeys.includes(s.workspaceKey))
  )
}

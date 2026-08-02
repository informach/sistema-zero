import type { ReactNode } from 'react'
import { createContext, createElement, type JSX, useContext, useMemo, useState } from 'react'
import type { IDEMode, Project, ProjectKind } from '#core'
import { isStudioTutorSensitivePath, redactStudioTutorSecrets } from './tutorSafety'

export type StudioTutorScope =
  | 'block'
  | 'mechanic'
  | 'error'
  | 'concept'
  | 'lesson'
  | 'needs-context'
  | 'redirect-pensa'
  | 'redirect-pinta'
  | 'unsupported'

export interface StudioTutorCompactBlock {
  id: string
  type: string
  parentId?: string
  input?: string
  topLevel: boolean
}

export interface StudioTutorCodeFile {
  path: string
  content: string
}

/** Snapshot efêmero e deliberadamente pequeno enviado ao BFF a cada pergunta. */
export interface StudioTutorProjectContext {
  projectId: string
  mode: IDEMode
  kind: ProjectKind
  blocks: StudioTutorCompactBlock[]
  installedExtensions: string[]
  selectedBlockId: string | null
  lastError: string | null
  /** Só existe em Ponte/Pro. O modo Blocos nunca envia código. */
  code?: StudioTutorCodeFile[]
}

export interface StudioTutorBlockReference {
  /** ID de uma instância já existente no projeto, quando houver. */
  blockId?: string
  /** ID autoritativo do tipo no catálogo server-safe. */
  blockType: string
  name: string
  category: string
  area: string
}

export interface StudioTutorLessonReference {
  courseId: string
  /** Ausente apenas em respostas históricas gravadas antes de a navegação existir. */
  courseSlug?: string
  lessonId: string
  title: string
}

export interface StudioTutorResponse {
  id: string
  text: string
  scope: StudioTutorScope
  blockReferences: StudioTutorBlockReference[]
  lessonReferences?: StudioTutorLessonReference[]
  createdAt: string
}

export interface StudioTutorHistoryMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  createdAt: string
  response?: StudioTutorResponse
}

export interface StudioTutorHistoryPage {
  messages: StudioTutorHistoryMessage[]
  nextCursor: string | null
}

export interface StudioTutorAskInput {
  projectId: string
  clientMessageId: string
  question: string
  context: StudioTutorProjectContext
}

export interface StudioTutorFeedbackInput {
  projectId: string
  responseId: string
  useful: boolean
}

/** I/O do host. O Studio nunca conhece sessão, provedor, quota ou banco. */
export interface StudioTutorAdapter {
  loadHistory(projectId: string, before?: string): Promise<StudioTutorHistoryPage>
  deleteHistory(projectId: string): Promise<void>
  ask(input: StudioTutorAskInput): Promise<StudioTutorResponse>
  feedback(input: StudioTutorFeedbackInput): Promise<void>
}

export interface StudioTutorConfig {
  adapter: StudioTutorAdapter
  /** Navegação provida pelo host; o Studio não conhece as rotas da comunidade. */
  openLesson?: (reference: StudioTutorLessonReference) => void
  /** Cooldown visual local; o rate limit autoritativo continua no BFF. */
  cooldownMs?: number
}

interface StudioTutorState {
  config: StudioTutorConfig | null
  open: boolean
  setOpen(open: boolean): void
}

const StudioTutorContext = createContext<StudioTutorState>({
  config: null,
  open: false,
  setOpen: () => undefined,
})

export function StudioTutorProvider({
  value,
  children,
}: {
  value: StudioTutorConfig | null
  children: ReactNode
}): JSX.Element {
  const [open, setOpen] = useState(false)
  const context = useMemo(() => ({ config: value, open, setOpen }), [value, open])
  return createElement(StudioTutorContext.Provider, { value: context }, children)
}

export function useStudioTutor(): StudioTutorState {
  return useContext(StudioTutorContext)
}

const MAX_BLOCKS = 600
const MAX_CODE_FILES = 24
const MAX_CODE_CHARS_PER_FILE = 20_000
const MAX_CODE_TOTAL_CHARS = 80_000
const MAX_ERROR_CHARS = 2_000

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function compactBlocks(raw: unknown): StudioTutorCompactBlock[] {
  const root = record(raw)
  const blocks = record(root?.blocks)
  const top = Array.isArray(blocks?.blocks) ? blocks.blocks : []
  const out: StudioTutorCompactBlock[] = []

  const visit = (rawBlock: unknown, parentId?: string, input?: string, topLevel = false): void => {
    if (out.length >= MAX_BLOCKS) return
    const block = record(rawBlock)
    if (!block || typeof block.type !== 'string') return
    const id =
      typeof block.id === 'string' && block.id ? block.id.slice(0, 128) : `anon-${out.length}`
    out.push({
      id,
      type: block.type.slice(0, 128),
      ...(parentId ? { parentId } : {}),
      ...(input ? { input } : {}),
      topLevel,
    })

    const inputs = record(block.inputs)
    if (inputs) {
      for (const [name, rawInput] of Object.entries(inputs)) {
        const entry = record(rawInput)
        visit(entry?.block ?? entry?.shadow, id, name.slice(0, 80))
      }
    }
    const next = record(block.next)
    visit(next?.block, parentId, input)
  }

  for (const block of top) visit(block, undefined, undefined, true)
  return out
}

function compactCode(project: Project): StudioTutorCodeFile[] {
  const candidates: StudioTutorCodeFile[] = []
  if (project.kind === 'pro' && project.tree) {
    for (const [path, node] of Object.entries(project.tree)) {
      if (node.kind === 'file') candidates.push({ path, content: node.content })
    }
  } else {
    for (const [path, content] of Object.entries(project.files)) candidates.push({ path, content })
    for (const file of project.extraFiles ?? [])
      candidates.push({ path: file.name, content: file.content })
  }

  const out: StudioTutorCodeFile[] = []
  let total = 0
  for (const file of candidates) {
    if (out.length >= MAX_CODE_FILES || total >= MAX_CODE_TOTAL_CHARS) break
    // Data URLs e binários nunca entram. Também evita mandar arquivos gerados/desnecessários.
    if (
      /^(?:data:|blob:)/i.test(file.content.trim()) ||
      /(?:^|\/)(?:node_modules|dist)\//.test(file.path) ||
      isStudioTutorSensitivePath(file.path)
    )
      continue
    const available = Math.min(MAX_CODE_CHARS_PER_FILE, MAX_CODE_TOTAL_CHARS - total)
    const withoutAssets = file.content
      .slice(0, available)
      .replace(/data:[^\s"')]+/gi, '[asset removido]')
    const content = redactStudioTutorSecrets(withoutAssets).text
    total += content.length
    out.push({ path: file.path.slice(0, 240), content })
  }
  return out
}

export function buildStudioTutorContext(input: {
  project: Project
  selectedBlockId: string | null
  lastError: string | null
}): StudioTutorProjectContext {
  const { project } = input
  const includeCode = project.mode === 'bridge' || project.kind === 'pro'
  return {
    projectId: project.id,
    mode: project.mode,
    kind: project.kind === 'pro' ? 'pro' : 'classic',
    blocks: compactBlocks(project.blocksState),
    installedExtensions: project.installedExtensions.map((ext) => ext.id),
    selectedBlockId: input.selectedBlockId,
    lastError: input.lastError?.slice(0, MAX_ERROR_CHARS) ?? null,
    ...(includeCode ? { code: compactCode(project) } : {}),
  }
}

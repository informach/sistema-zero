import type { AiCreditsView } from '@sistemazero/core/ai-credits'
import type { ReactNode } from 'react'
import { createContext, createElement, type JSX, useContext, useMemo, useState } from 'react'
import type { IDEMode, Project, ProjectKind } from '#core'
import { buildTutorBehavior, type StudioTutorBehaviorEntry } from './tutorBehavior'
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
  | 'project-review'
  /**
   * Acabou a ajuda de IA da família. É PERSISTIDO de propósito: sem ele, uma
   * recusa de ontem voltaria do histórico com cara de aula e com os botões de
   * "isso ajudou?", como se fosse conteúdo que a criança pudesse avaliar.
   */
  | 'quota'

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
  /**
   * O que o projeto FAZ, derivado da IR: valores escolhidos pela criança + em
   * que área cada coisa roda. É o que permite diagnosticar erro de LÓGICA em vez
   * de ensinar a mecânica do zero. Ausente quando não há IR (Pro, projeto antigo).
   */
  behavior?: StudioTutorBehaviorEntry[]
  /**
   * Ids das pilhas SOLTAS (fora das Áreas do projeto): estão salvas, mas nunca
   * executam. O editor já marca isso no canvas; sem mandar, o tutor trata
   * rascunho morto como código ativo.
   */
  draftBlockIds?: string[]
  /**
   * Problemas que o editor já detectou, com a frase pronta em português
   * ("A variável X ainda não foi declarada neste ponto").
   */
  semanticIssues?: Array<{ blockId?: string; message: string }>
  /** Só existe em Ponte/Pro. O modo Blocos nunca envia código. */
  code?: StudioTutorCodeFile[]
}

export interface StudioTutorBlockReference {
  /** ID de uma instância já existente no projeto, quando houver. */
  blockId?: string
  /** ID autoritativo do tipo no catálogo server-safe. */
  blockType: string
  name: string
  /** Categoria de topo na paleta (ex.: "Jogo 2D"). */
  category: string
  /** Subcategoria aninhada (ex.: "🎮 Sprites"). Ausente em respostas antigas. */
  subcategory?: string
  /**
   * Caminho completo na paleta (ex.: `['Programação','🏷️ Variáveis']`) — é o que
   * a criança realmente vê. Ausente em respostas gravadas antes de 08/2026.
   */
  palettePath?: readonly string[]
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
  /** Continuações prováveis da criança (chips que preenchem o campo, ≤3). */
  suggestions?: string[]
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

/**
 * Resposta do `ask` + o saldo FRESCO da ajuda de IA.
 *
 * ⚠️ O saldo vem no ENVELOPE, fora do `response`: aquele objeto é persistido no
 * histórico, e crédito é volátil. `credits` ausente/nulo = "nada mudou agora"
 * (resposta determinística, replay) — quem renderiza MANTÉM o valor anterior.
 */
export interface StudioTutorAskResult {
  response: StudioTutorResponse
  credits?: AiCreditsView | null
}

/** I/O do host. O Studio nunca conhece sessão, provedor, quota ou banco. */
export interface StudioTutorAdapter {
  loadHistory(projectId: string, before?: string): Promise<StudioTutorHistoryPage>
  deleteHistory(projectId: string): Promise<void>
  ask(input: StudioTutorAskInput): Promise<StudioTutorAskResult>
  feedback(input: StudioTutorFeedbackInput): Promise<void>
}

export interface StudioTutorConfig {
  adapter: StudioTutorAdapter
  /** Navegação provida pelo host; o Studio não conhece as rotas da comunidade. */
  openLesson?: (reference: StudioTutorLessonReference) => void
  /** Cooldown visual local; o rate limit autoritativo continua no BFF. */
  cooldownMs?: number
  /**
   * Saldo inicial (o host lê no Server Component). `null`/ausente = "não sei" →
   * o medidor não aparece. NUNCA passe zeros para significar indisponibilidade.
   */
  credits?: AiCreditsView | null
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
    const withoutAssets = file.content.replace(/data:[^\s"')]+/gi, '[asset removido]')
    // Redija o valor inteiro antes do corte: uma aspa de fechamento fora do
    // orçamento não pode transformar uma credencial em texto aparentemente comum.
    const content = redactStudioTutorSecrets(withoutAssets).text.slice(0, available)
    total += content.length
    out.push({ path: file.path.slice(0, 240), content })
  }
  return out
}

export function buildStudioTutorContext(input: {
  project: Project
  selectedBlockId: string | null
  lastError: string | null
  /** Diagnósticos que o editor já calculou (pilhas soltas, problemas da IR). */
  draftBlockIds?: readonly string[]
  semanticIssues?: readonly { blockId?: string; message: string }[]
}): StudioTutorProjectContext {
  const { project } = input
  const includeCode = project.mode === 'bridge' || project.kind === 'pro'
  const behavior = buildTutorBehavior(project.ir)
  return {
    projectId: project.id,
    mode: project.mode,
    kind: project.kind === 'pro' ? 'pro' : 'classic',
    blocks: compactBlocks(project.blocksState),
    installedExtensions: project.installedExtensions.map((ext) => ext.id),
    selectedBlockId: input.selectedBlockId,
    lastError: input.lastError?.slice(0, MAX_ERROR_CHARS) ?? null,
    ...(behavior?.length ? { behavior } : {}),
    ...(input.draftBlockIds?.length
      ? { draftBlockIds: [...input.draftBlockIds].slice(0, 40) }
      : {}),
    ...(input.semanticIssues?.length
      ? { semanticIssues: input.semanticIssues.slice(0, 5).map((issue) => ({ ...issue })) }
      : {}),
    ...(includeCode ? { code: compactCode(project) } : {}),
  }
}

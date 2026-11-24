import type { AiCreditsView } from '@sistemazero/core/ai-credits'
import { isStudioProTemplateId } from '@sistemazero/core/studio/pro-templates'
import {
  isStudioTutorSourcePath,
  type StudioTutorCodeFile,
  type StudioTutorDiagnostic,
  type StudioTutorFileReference,
  type StudioTutorIntent,
  type StudioTutorSelection,
} from '@sistemazero/core/studio/pro-tutor'
import { isStudioDocumentTemplateId } from '@sistemazero/core/studio/project-format'
import type { StudioPythonAnalysisAuthorization } from '@sistemazero/core/studio/python-language-authorization'
import type { StudioTutorEnvironment } from '@sistemazero/core/studio/tutor-environment'
import type { ReactNode } from 'react'
import {
  createContext,
  createElement,
  type JSX,
  type RefObject,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { IDEMode, ProjectKind } from '#core'
import { type EditableStudioProject, isPythonProject } from '../core/editableProject'
import { boundedProAssistanceSummary, getProAssistance } from '../core/proAssistance'
import { readPythonWorkspaceDraft } from '../python/blocks/workspaceDraft'
import { buildTutorBehavior, type StudioTutorBehaviorEntry } from './tutorBehavior'
import { buildStudioTutorEnvironment } from './tutorEnvironment'
import { createStudioTutorExcerpts, isCurrentStudioTutorSelection } from './tutorProContext'
import {
  isStudioTutorSensitivePath,
  redactStudioTutorSecrets,
  studioTutorSourceHash,
} from './tutorSafety'

export type {
  StudioTutorCodeFile,
  StudioTutorFileReference,
  StudioTutorIntent,
  StudioTutorSelection,
} from '@sistemazero/core/studio/pro-tutor'

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

export interface StudioTutorProEditorContext {
  projectId: string
  activeFile?: string
  selection?: StudioTutorSelection
  synchronization?: 'ready' | 'conflict'
  diagnostics?: StudioTutorDiagnostic[]
  installation?: 'unavailable' | 'indexing' | 'ready' | 'error'
  installedPackages?: Array<{ name: string; version: string }>
}

/** Read on demand from the live Python workspace; never persisted or treated as source. */
export interface StudioTutorClassicEditorContext {
  projectId: string
  path: string
  sourceHash: string
  workspace?: unknown
  synchronization: 'ready' | 'pending' | 'unavailable'
}

/** Snapshot efêmero e deliberadamente pequeno enviado ao BFF a cada pergunta. */
export interface StudioTutorProjectContext {
  projectId: string
  environment?: StudioTutorEnvironment
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
  /** Só existe no Pro. O modo normal, inclusive a Ponte, ensina com blocos. */
  code?: StudioTutorCodeFile[]
  /** Python source is authoritative; a pending visual buffer has not executed yet. */
  python?: {
    activeFile: string
    workspace: 'ready' | 'pending' | 'unavailable'
    source: StudioTutorCodeFile[]
  }
  pro?: Omit<StudioTutorProEditorContext, 'projectId'> & {
    revision: number
    intent?: StudioTutorIntent
    templateId?: string
    decisions?: { version: 1; summary: string }
  }
  /** O que a aba Investigar mostra agora; só vai quando a criança ligou a aba (seção 15). */
  investigation?: StudioTutorInvestigation
  /** O que a aba Desempenho mediu nos últimos segundos; só com a aba ligada (seção 15). */
  performance?: StudioTutorPerformance
  /**
   * Quais das duas abas a criança ligou. Aba ligada sem o campo dela = ainda sem leitura (o jogo
   * não está rodando, acabou de começar ou a medida não vale para este programa): o Zappy pede
   * para rodar, não para ligar o que já está ligado (revisão do lote 5).
   */
  observing?: StudioTutorObservedTabs
}

/** As abas que a criança ligou na gaveta. */
export interface StudioTutorObservedTabs {
  investigate: boolean
  performance: boolean
}

/** Um valor do jogo como a aba Investigar mostra: o nome e o valor em texto. */
export interface StudioTutorObservedValue {
  name: string
  text: string
}

/**
 * Lote 5 da missão (seção 15, 21/11/2026): o Zappy explica a execução com os valores REAIS que a
 * aba Investigar mostra, em vez de adivinhar. Vai só quando a criança ligou a aba (sob demanda) e
 * nunca a cada tecla: é lido no momento da pergunta.
 */
export interface StudioTutorInvestigation {
  frame: number | null
  paused: boolean
  values: StudioTutorObservedValue[]
  /** O jogo parou com erro: o quadro e os valores daquele momento. */
  stopped?: { frame: number | null; values: StudioTutorObservedValue[] }
}

/** O resumo da aba Desempenho (os mesmos números que a criança vê nos cartões). */
export interface StudioTutorPerformance {
  /** Quantos segundos a medida cobre. */
  seconds: number
  fpsNow: number
  fpsMin: number
  /** Quantas vezes o jogo ficou abaixo de 30 quadros por segundo. */
  slowEpisodes: number
  /** O maior intervalo entre dois quadros na janela, em ms. */
  slowestFrameMs: number
  sprites: number | null
  objects: number | null
  draws: number | null
}

export const STUDIO_TUTOR_OBSERVED_VALUES_MAX = 20
const OBSERVED_NAME_MAX = 60
const OBSERVED_TEXT_MAX = 160
// Os tetos do esquema do member-shell (`routes/studio-zappy.ts`): um valor fora deles recusaria a
// pergunta inteira, e uma fatia forjada pelo próprio jogo consegue passar deles (revisão do lote 5).
const OBSERVED_FRAME_MAX = 1_000_000_000
const OBSERVED_FPS_MAX = 1000
const OBSERVED_EPISODES_MAX = 1000
const OBSERVED_FRAME_MS_MAX = 600_000
const OBSERVED_COUNT_MAX = 10_000_000

function boundedObservedValues(
  values: readonly StudioTutorObservedValue[],
): StudioTutorObservedValue[] {
  return values
    .filter((value) => value.name.length > 0)
    .slice(0, STUDIO_TUTOR_OBSERVED_VALUES_MAX)
    .map((value) => ({
      name: value.name.slice(0, OBSERVED_NAME_MAX),
      // O valor pode ser um texto que a criança digitou no jogo: passa pela mesma limpeza do erro.
      text: redactStudioTutorSecrets(value.text).text.slice(0, OBSERVED_TEXT_MAX),
    }))
}

const boundedFrame = (frame: number | null) =>
  frame === null || !Number.isFinite(frame)
    ? null
    : Math.min(OBSERVED_FRAME_MAX, Math.max(0, Math.round(frame)))

function boundedInvestigation(
  investigation: StudioTutorInvestigation | undefined,
): StudioTutorInvestigation | undefined {
  if (!investigation) return undefined
  const values = boundedObservedValues(investigation.values)
  const stopped = investigation.stopped
    ? {
        frame: boundedFrame(investigation.stopped.frame),
        values: boundedObservedValues(investigation.stopped.values),
      }
    : undefined
  if (values.length === 0 && !stopped) return undefined
  return {
    frame: boundedFrame(investigation.frame),
    paused: investigation.paused,
    values,
    ...(stopped ? { stopped } : {}),
  }
}

const finiteOrZero = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0)
const roundedUpTo = (value: number, max: number) => Math.min(max, Math.round(finiteOrZero(value)))
const countOrNull = (value: number | null) =>
  value === null || !Number.isFinite(value) ? null : roundedUpTo(value, OBSERVED_COUNT_MAX)

function boundedPerformance(
  performance: StudioTutorPerformance | undefined,
): StudioTutorPerformance | undefined {
  if (!performance || !(performance.seconds > 0)) return undefined
  return {
    seconds: Math.min(120, finiteOrZero(performance.seconds)),
    fpsNow: roundedUpTo(performance.fpsNow, OBSERVED_FPS_MAX),
    fpsMin: roundedUpTo(performance.fpsMin, OBSERVED_FPS_MAX),
    slowEpisodes: roundedUpTo(performance.slowEpisodes, OBSERVED_EPISODES_MAX),
    slowestFrameMs: roundedUpTo(performance.slowestFrameMs, OBSERVED_FRAME_MS_MAX),
    sprites: countOrNull(performance.sprites),
    objects: countOrNull(performance.objects),
    draws: countOrNull(performance.draws),
  }
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

/** Um tutorial do "Como fazer" (biblioteca de ajuda do Kids) que a resposta cita. */
export interface StudioTutorHelpReference {
  slug: string
  title: string
}

export interface StudioTutorResponse {
  programmingLanguage?: 'javascript' | 'python'
  id: string
  intent?: StudioTutorIntent
  /** Original pedagogy; absent only in legacy responses. */
  kind?: 'classic' | 'pro'
  fileReferences?: StudioTutorFileReference[]
  sourceRevision?: number
  text: string
  scope: StudioTutorScope
  blockReferences: StudioTutorBlockReference[]
  lessonReferences?: StudioTutorLessonReference[]
  /** Chips "Passo a passo: …"; o host abre `/como-fazer/<slug>`. */
  helpReferences?: StudioTutorHelpReference[]
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
export interface StudioTutorRequestTransport {
  send(
    operation: (
      authorization: StudioPythonAnalysisAuthorization,
      signal: AbortSignal,
    ) => Promise<Response>,
  ): Promise<Response>
}

export interface StudioTutorAdapter {
  loadCredits?(signal?: AbortSignal): Promise<AiCreditsView | null>
  builder?: import('@sistemazero/core/studio').StudioProBuilderAdapter
  loadHistory(
    projectId: string,
    before?: string,
    transport?: StudioTutorRequestTransport,
  ): Promise<StudioTutorHistoryPage>
  deleteHistory(projectId: string, transport?: StudioTutorRequestTransport): Promise<void>
  ask(
    input: StudioTutorAskInput,
    transport?: StudioTutorRequestTransport,
  ): Promise<StudioTutorAskResult>
  feedback(input: StudioTutorFeedbackInput, transport?: StudioTutorRequestTransport): Promise<void>
}

export interface StudioTutorConfig {
  renderListen?: (projectId: string, messageId: string) => import('react').ReactNode
  renderVoiceInput?: (input: {
    value: string
    onChange(value: string): void
    onBusyChange(busy: boolean): void
    textareaId: string
    disabled: boolean
  }) => import('react').ReactNode
  adapter: StudioTutorAdapter
  /** Navegação provida pelo host; o Studio não conhece as rotas da comunidade. */
  openLesson?: (reference: StudioTutorLessonReference) => void
  /** Abre um tutorial do "Como fazer" (o host conhece a rota; abre em outra aba). */
  openHelp?: (reference: StudioTutorHelpReference) => void
  /** Cooldown visual local; o rate limit autoritativo continua no BFF. */
  cooldownMs?: number
  /**
   * Saldo inicial (o host lê no Server Component). `null`/ausente = "não sei" →
   * o medidor não aparece. NUNCA passe zeros para significar indisponibilidade.
   */
  credits?: AiCreditsView | null
  /**
   * Para quem o medidor fala: `kids` (padrão) explica que a franquia é da família; `adult`
   * (comunidade adulta) fala com o dono da conta, em "pedidos". O cálculo é o mesmo.
   */
  audience?: 'kids' | 'adult'
}

export interface StudioTutorProRequest {
  id: string
  projectId: string
  intent: StudioTutorIntent | 'change'
  question: string
  selection?: StudioTutorSelection
}

interface StudioTutorState {
  config: StudioTutorConfig | null
  open: boolean
  setOpen(open: boolean): void
  proEditor: RefObject<StudioTutorProEditorContext | null>
  proNavigate: RefObject<((reference: StudioTutorFileReference) => void) | null>
  /** Capture only on a request, not on every keystroke. Call after flushing project operations. */
  proCapture: RefObject<(() => StudioTutorProEditorContext | null) | null>
  classicCapture: RefObject<(() => StudioTutorClassicEditorContext | null) | null>
  proValidateReference: RefObject<
    ((reference: StudioTutorFileReference) => StudioTutorFileReference | null) | null
  >
  proRequest: StudioTutorProRequest | null
  requestProHelp(
    request: Omit<StudioTutorProRequest, 'id' | 'question'> & { question?: string },
  ): void
  clearProRequest(id: string): void
}

const StudioTutorContext = createContext<StudioTutorState | null>(null)

export function StudioTutorProvider({
  value,
  children,
}: {
  value: StudioTutorConfig | null
  children: ReactNode
}): JSX.Element {
  const [open, setOpen] = useState(false)
  const proEditor = useRef<StudioTutorProEditorContext | null>(null)
  const proNavigate = useRef<((reference: StudioTutorFileReference) => void) | null>(null)
  const proCapture = useRef<(() => StudioTutorProEditorContext | null) | null>(null)
  const classicCapture = useRef<(() => StudioTutorClassicEditorContext | null) | null>(null)
  const proValidateReference = useRef<
    ((reference: StudioTutorFileReference) => StudioTutorFileReference | null) | null
  >(null)
  const [proRequest, setProRequest] = useState<StudioTutorProRequest | null>(null)
  const requestProHelp = useCallback<StudioTutorState['requestProHelp']>((request) => {
    setProRequest({
      ...request,
      id: crypto.randomUUID(),
      question:
        request.question ??
        (request.intent === 'change'
          ? ''
          : request.intent === 'investigate'
            ? 'Me ajude a investigar este trecho.'
            : 'Me explique este trecho.'),
    })
    setOpen(true)
  }, [])
  const clearProRequest = useCallback((id: string) => {
    setProRequest((request) => (request?.id === id ? null : request))
  }, [])
  const context = useMemo(
    () => ({
      config: value,
      open,
      setOpen,
      proEditor,
      proNavigate,
      proCapture,
      classicCapture,
      proValidateReference,
      proRequest,
      requestProHelp,
      clearProRequest,
    }),
    [value, open, proRequest, requestProHelp, clearProRequest],
  )
  return createElement(StudioTutorContext.Provider, { value: context }, children)
}

export function useStudioTutor(): StudioTutorState {
  const context = useContext(StudioTutorContext)
  const proEditor = useRef<StudioTutorProEditorContext | null>(null)
  const proNavigate = useRef<((reference: StudioTutorFileReference) => void) | null>(null)
  const proCapture = useRef<(() => StudioTutorProEditorContext | null) | null>(null)
  const classicCapture = useRef<(() => StudioTutorClassicEditorContext | null) | null>(null)
  const proValidateReference = useRef<
    ((reference: StudioTutorFileReference) => StudioTutorFileReference | null) | null
  >(null)
  return useMemo(
    () =>
      context ?? {
        config: null,
        open: false,
        setOpen: () => undefined,
        proEditor,
        proNavigate,
        proCapture,
        classicCapture,
        proValidateReference,
        proRequest: null,
        requestProHelp: () => undefined,
        clearProRequest: () => undefined,
      },
    [context],
  )
}

const MAX_BLOCKS = 600
const MAX_CODE_FILES = 24
const MAX_CODE_CHARS_PER_FILE = 4_000
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

function compactCode(
  project: EditableStudioProject,
  question = '',
  editor?: StudioTutorProEditorContext,
  selected?: StudioTutorSelection,
): StudioTutorCodeFile[] {
  const candidates: StudioTutorCodeFile[] = []
  if (project.kind === 'pro' && project.tree) {
    for (const [path, node] of Object.entries(project.tree)) {
      if (node.kind === 'file') candidates.push({ path, content: node.content })
    }
  } else {
    for (const [path, content] of Object.entries(project.files ?? {}))
      candidates.push({ path, content })
    for (const file of project.extraFiles ?? [])
      candidates.push({ path: file.name, content: file.content })
  }

  const terms = (question.toLowerCase().match(/[\p{L}\d_./-]{3,}/gu) ?? []).slice(0, 16)
  const diagnosticPaths = new Set(editor?.diagnostics?.map((item) => item.path) ?? [])
  const score = (file: StudioTutorCodeFile) => {
    const lowerPath = file.path.toLowerCase()
    const lowerContent = file.content.toLowerCase()
    return (
      (file.path === editor?.activeFile ? 1000 : 0) +
      (file.path === selected?.path ? 2000 : 0) +
      (diagnosticPaths.has(file.path) ? 500 : 0) +
      (/^(?:package|tsconfig|jsconfig)\.json$/.test(file.path) ? 100 : 0) +
      terms.reduce(
        (total, term) =>
          total + (lowerPath.includes(term) ? 20 : 0) + (lowerContent.includes(term) ? 1 : 0),
        0,
      )
    )
  }
  const ranked = candidates
    .filter((file) => isStudioTutorSourcePath(file.path) && !isStudioTutorSensitivePath(file.path))
    .map((file) => ({ file, score: score(file) }))
    .sort((a, b) => b.score - a.score)
    .map(({ file }) => file)

  const out: StudioTutorCodeFile[] = []
  let total = 0
  for (const file of ranked) {
    if (out.length >= MAX_CODE_FILES || total >= MAX_CODE_TOTAL_CHARS) break
    // Data URLs e binários nunca entram. Também evita mandar arquivos gerados/desnecessários.
    if (
      /^(?:data:|blob:)/i.test(file.content.trim()) ||
      /(?:^|\/)(?:node_modules|dist)\//.test(file.path) ||
      isStudioTutorSensitivePath(file.path)
    )
      continue
    const available = Math.min(MAX_CODE_CHARS_PER_FILE, MAX_CODE_TOTAL_CHARS - total)
    const excerpts = createStudioTutorExcerpts(file, {
      selection: selected ?? editor?.selection,
      diagnosticLine: editor?.diagnostics?.find((item) => item.path === file.path)?.line,
      maxChars: available,
    })
    for (const excerpt of excerpts) {
      if (out.length >= MAX_CODE_FILES) break
      total += excerpt.content.length
      out.push(excerpt)
    }
  }
  return out
}

export function buildStudioTutorContext(input: {
  project: EditableStudioProject
  selectedBlockId: string | null
  lastError: string | null
  question?: string
  proEditor?: StudioTutorProEditorContext | null
  proSelection?: StudioTutorSelection
  classicEditor?: StudioTutorClassicEditorContext | null
  intent?: StudioTutorIntent
  /** Diagnósticos que o editor já calculou (pilhas soltas, problemas da IR). */
  draftBlockIds?: readonly string[]
  semanticIssues?: readonly { blockId?: string; message: string }[]
  /** As abas Investigar e Desempenho, quando a criança as ligou (`readZappyObservation`). */
  investigation?: StudioTutorInvestigation
  performance?: StudioTutorPerformance
  observing?: StudioTutorObservedTabs
}): StudioTutorProjectContext {
  const { project } = input
  const python = isPythonProject(project)
  const includeCode = project.kind === 'pro'
  const editor =
    input.proEditor?.projectId === project.id
      ? {
          ...input.proEditor,
          diagnostics: input.proEditor.diagnostics?.filter((item) => {
            const file = project.tree?.[item.path]
            return (
              isStudioTutorSourcePath(item.path) &&
              !isStudioTutorSensitivePath(item.path) &&
              (!item.sourceHash ||
                (file?.kind === 'file' && item.sourceHash === studioTutorSourceHash(file.content)))
            )
          }),
        }
      : undefined
  const requestedSelection = input.proSelection ?? editor?.selection
  const selectedFile = requestedSelection ? project.tree?.[requestedSelection.path] : undefined
  const selection =
    requestedSelection &&
    isStudioTutorSourcePath(requestedSelection.path) &&
    !isStudioTutorSensitivePath(requestedSelection.path) &&
    selectedFile?.kind === 'file' &&
    isCurrentStudioTutorSelection(requestedSelection, selectedFile.content)
      ? requestedSelection
      : undefined
  // Python AST/cache is never SZIR. In Python every top-level statement of the file runs (the
  // project areas are sections of the file, in source order), so the JavaScript draft/area
  // diagnostics have no equivalent authority.
  const behavior = includeCode || python ? undefined : buildTutorBehavior(project.ir)
  const storedDraft =
    python && project.kind === 'classic' ? readPythonWorkspaceDraft(project) : undefined
  const visualDraft =
    storedDraft &&
    isStudioTutorSourcePath(storedDraft.path) &&
    !isStudioTutorSensitivePath(storedDraft.path)
      ? storedDraft
      : undefined
  const classicEditor =
    python &&
    project.kind === 'classic' &&
    input.classicEditor?.projectId === project.id &&
    input.classicEditor.path.endsWith('.py') &&
    isStudioTutorSourcePath(input.classicEditor.path) &&
    !isStudioTutorSensitivePath(input.classicEditor.path) &&
    project.files[input.classicEditor.path] !== undefined &&
    studioTutorSourceHash(project.files[input.classicEditor.path]!) ===
      input.classicEditor.sourceHash
      ? input.classicEditor
      : undefined
  const pythonFile =
    python && project.kind === 'classic'
      ? (classicEditor?.path ?? visualDraft?.path ?? project.python.entrypoint)
      : undefined
  const templateId = python
    ? isStudioDocumentTemplateId(project.proMeta?.templateId)
      ? project.proMeta.templateId
      : undefined
    : isStudioProTemplateId(project.proMeta?.templateId)
      ? project.proMeta.templateId
      : undefined
  const investigation = boundedInvestigation(input.investigation)
  const performance = boundedPerformance(input.performance)
  const blocks = includeCode
    ? []
    : compactBlocks(
        python
          ? classicEditor
            ? classicEditor.workspace
            : visualDraft?.workspace
          : project.blocksState,
      )
  return {
    projectId: project.id,
    environment: buildStudioTutorEnvironment(project),
    mode: project.mode,
    kind: project.kind === 'pro' ? 'pro' : 'classic',
    blocks,
    installedExtensions: includeCode ? [] : project.installedExtensions.map((ext) => ext.id),
    selectedBlockId:
      includeCode || (python && !blocks.some((block) => block.id === input.selectedBlockId))
        ? null
        : input.selectedBlockId,
    lastError: input.lastError
      ? redactStudioTutorSecrets(input.lastError).text.slice(0, MAX_ERROR_CHARS)
      : null,
    ...(pythonFile && python && project.kind === 'classic'
      ? {
          python: {
            activeFile: pythonFile,
            workspace:
              classicEditor?.synchronization ??
              (visualDraft
                ? visualDraft.pending
                  ? ('pending' as const)
                  : ('ready' as const)
                : ('unavailable' as const)),
            source: createStudioTutorExcerpts(
              { path: pythonFile, content: project.files[pythonFile] ?? '' },
              { maxChars: MAX_CODE_CHARS_PER_FILE },
            ),
          },
        }
      : {}),
    ...(behavior?.length ? { behavior } : {}),
    ...(investigation ? { investigation } : {}),
    ...(performance ? { performance } : {}),
    ...(input.observing && (input.observing.investigate || input.observing.performance)
      ? {
          observing: {
            investigate: input.observing.investigate,
            performance: input.observing.performance,
          },
        }
      : {}),
    ...(!includeCode && !python && input.draftBlockIds?.length
      ? { draftBlockIds: [...input.draftBlockIds].slice(0, 40) }
      : {}),
    ...(!includeCode && !python && input.semanticIssues?.length
      ? { semanticIssues: input.semanticIssues.slice(0, 5).map((issue) => ({ ...issue })) }
      : {}),
    ...(includeCode
      ? {
          code: compactCode(project, input.question, editor, selection),
          pro: {
            revision: project.updatedAt,
            decisions: {
              version: 1,
              summary: redactStudioTutorSecrets(
                boundedProAssistanceSummary(getProAssistance(project)),
              ).text,
            },
            intent: input.intent ?? 'explain',
            ...(selection ? { selection } : {}),
            ...(editor?.synchronization ? { synchronization: editor.synchronization } : {}),
            ...(templateId ? { templateId } : {}),
            ...(editor?.activeFile && !isStudioTutorSensitivePath(editor.activeFile)
              ? { activeFile: editor.activeFile }
              : {}),
            diagnostics: (editor?.diagnostics ?? [])
              .filter((item) => !isStudioTutorSensitivePath(item.path))
              .slice(0, 20)
              .map((item) => ({
                ...item,
                message: redactStudioTutorSecrets(item.message).text.slice(0, 600),
              })),
            installation: editor?.installation ?? 'unavailable',
            installedPackages: (editor?.installedPackages ?? []).slice(0, 40),
          },
        }
      : {}),
  }
}

/** Pure synchronous assembly; the caller owns flush, epoch checks and network I/O. */
export function buildStudioTutorRequest(
  input: Parameters<typeof buildStudioTutorContext>[0] & { question: string },
): { question: string; context: StudioTutorProjectContext } {
  const question = input.question.trim()
  return { question, context: buildStudioTutorContext({ ...input, question }) }
}

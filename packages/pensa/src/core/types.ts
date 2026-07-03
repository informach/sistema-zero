/**
 * Tipos do contrato Pensa (Fase 0) — espelham 1:1 os shapes JSON servidos pelo
 * members via member-shell (datas SEMPRE como ISO string). Este arquivo é a
 * fonte dos tipos públicos re-exportados em src/index.ts.
 */
import type { ReactNode } from 'react'

// ── Enums do domínio ─────────────────────────────────────────────────────────

export type PensaStage = 'z' | 'e' | 'r' | 'o' | 'done'
export type PensaProjectKind = 'game' | 'webapp'
export type PensaArtifactType =
  | 'idea'
  | 'prd'
  | 'friendly_spec'
  | 'identity'
  | 'mission_plan'
  | 'checklist_seed'
export type PensaTaskColumn = 'backlog' | 'doing' | 'review' | 'done'
export type PensaChecklistCategory = 'test' | 'polish' | 'publish' | 'share'
/**
 * Onde a criança constrói o jogo (por PROJETO): 'embedded' = Estúdio junto da
 * missão (split), 'studio' = Estúdio Completo (aba/rota do host), 'external' =
 * no computador dela (sem Estúdio). `null` no detail = ainda não escolheu.
 */
export type PensaBuildEnv = 'embedded' | 'studio' | 'external'

// ── Views (respostas HTTP) ───────────────────────────────────────────────────

export interface PensaCycleView {
  id: string
  number: number
  goal: string | null
  stage: PensaStage
  zCompletedAt: string | null
  eCompletedAt: string | null
  rCompletedAt: string | null
  oCompletedAt: string | null
}

export interface PensaProjectListView {
  id: string
  name: string
  kind: PensaProjectKind
  status: 'active' | 'archived'
  /** Do ciclo corrente (maior number). */
  cycleNumber: number
  stage: PensaStage
  createdAt: string
  updatedAt: string
}

export interface PensaArtifactIndexEntry {
  type: PensaArtifactType
  stage: PensaStage
  version: number
  status: 'draft' | 'validated'
  createdAt: string
}

export interface PensaProjectDetailView {
  id: string
  name: string
  kind: PensaProjectKind
  status: 'active' | 'archived'
  studioProjectId: string | null
  /** Onde construir (etapa R). `null` = o chooser ainda não foi respondido. */
  buildEnv: PensaBuildEnv | null
  /** Quando o snapshot do Estúdio foi salvo na nuvem (o conteúdo NÃO vem aqui). */
  studioSnapshotAt: string | null
  createdAt: string
  updatedAt: string
  /** Ordenados por number ASC. */
  cycles: PensaCycleView[]
  /** O de maior number. */
  currentCycle: PensaCycleView
  /** Latest por type, do ciclo CORRENTE. */
  artifactsIndex: PensaArtifactIndexEntry[]
}

export interface PensaChatMessage {
  role: 'user' | 'assistant'
  content: string
  at: string
}

export interface PensaZState {
  answered: {
    who: boolean
    problem: boolean
    action: boolean
    screens: boolean
    success: boolean
  }
  ready: boolean
}

export interface PensaArtifactView {
  id: string
  stage: PensaStage
  type: PensaArtifactType
  version: number
  status: 'draft' | 'validated'
  content: unknown
  createdAt: string
}

export interface PensaStageView {
  stage: PensaStage
  conversation: {
    messages: PensaChatMessage[]
    summary: string | null
    messageCount: number
  }
  /** Etapa z → PensaZState; demais {}. */
  state: Record<string, unknown>
  /** Latest por type DESTA etapa. */
  artifacts: PensaArtifactView[]
  /**
   * Estado VIVO do kanban/checklist do CICLO (vêm em TODA etapa): o reload da UI
   * re-hidrata o quadro sem re-gerar o plano (que zeraria as colunas).
   */
  tasks: PensaTaskView[]
  checklist: PensaChecklistItemView[]
}

export interface PensaMissionStep {
  text: string
  hint?: string
}

/**
 * Contexto que a missão de ARTE leva ao Pinta (07/2026): o host abre o ateliê
 * pré-configurado (tipo de desenho + nome do jogo + paleta da identidade).
 */
export interface PensaPintaIntent {
  pensaProjectId: string
  projectName: string
  artKind?: 'sprite' | 'background' | 'tileset'
  palette?: string[]
}

export interface PensaMission {
  story?: string
  /** 1–12 passos. */
  steps: PensaMissionStep[]
  studioHints?: { categories: string[]; blocks: string[] }
  /** 1–3 critérios observáveis. */
  doneWhen: string[]
  /** Missão de ARTE (07/2026): "Desenhar no Pinta" vira o botão em destaque. */
  artKind?: 'sprite' | 'background' | 'tileset'
  /** Paleta do jogo (hex) que acompanha a missão de arte ao Pinta. */
  palette?: string[]
}

export interface PensaTaskView {
  id: string
  title: string
  summary: string | null
  taskType: string | null
  column: PensaTaskColumn
  position: number
  mission: PensaMission
  notes: string | null
}

export interface PensaChecklistItemView {
  id: string
  category: PensaChecklistCategory
  title: string
  description: string | null
  required: boolean
  position: number
  done: boolean
  doneAt: string | null
}

// ── Transport / adapter (injetados pelo HOST) ────────────────────────────────

/**
 * Erro que o transport DEVE lançar quando o servidor responde com erro —
 * carrega o status HTTP e o código de domínio (ex.: PENSA_QUOTA_EXCEEDED).
 */
export class PensaApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(message: string, status: number, code: string) {
    super(message)
    this.name = 'PensaApiError'
    this.status = status
    this.code = code
  }
}

export interface PensaChatInput {
  projectId: string
  cycleId: string
  stage: 'z' | 'e'
  message: string
}

export interface PensaChatHandlers {
  onDelta(text: string): void
  onState?(state: Record<string, unknown>): void
  onDone(): void
  onError(error: Error): void
}

export interface PensaTransport {
  /**
   * path RELATIVO (ex. '/projects', `/cycles/${id}/stages/z`) — o HOST prefixa
   * /api/pensa. Erros HTTP devem virar `PensaApiError` lançado.
   */
  request<T>(
    path: string,
    init?: { method?: 'GET' | 'POST' | 'PATCH' | 'PUT'; body?: unknown },
  ): Promise<T>
  /** Fase 1; na Fase 0 pode lançar 'not implemented'. Devolve fn de abort. */
  streamChat(input: PensaChatInput, handlers: PensaChatHandlers): () => void
}

/** Poses do mascote que o host pode fornecer (URLs de imagem, ex. WebP). */
export type PensaMascotPose = 'happy' | 'thinking' | 'celebrating' | 'sleeping'

export interface PensaHostAdapter {
  transport: PensaTransport
  mode: 'kids' | 'adult'
  /** default 'game' */
  projectKind?: PensaProjectKind
  /** host fixa; ausente = 'light' */
  theme?: 'light' | 'dark'
  /**
   * Identificador do VIEWER (perfil/conta) p/ "continuar de onde parou": o
   * pacote lembra o projeto aberto em localStorage namespaced por esta chave
   * e o reabre no próximo mount. Ausente = não lembra (comportamento antigo).
   */
  stateKey?: string
  /**
   * Ponte com o ateliê: mostra "Desenhar no Pinta" na missão aberta — a
   * criança desenha os assets do jogo e volta. Ausente = botão some (o HOST
   * só deve passar quando a criança POSSUI o Pinta — produto à parte). O
   * `intent` (07/2026) leva projeto/artKind/paleta p/ abrir pré-configurado.
   */
  onOpenPinta?: (intent?: PensaPintaIntent) => void
  /**
   * Imagens do mascote (Zappy) por pose — ausente (ou pose faltando), a UI cai
   * no emoji de fallback de cada ponto (modo adulto/host sem assets).
   */
  mascotImages?: Partial<Record<PensaMascotPose, string>>
  onOpenStudio?: (seed: {
    pensaProjectId: string
    studioProjectId: string | null
    name: string
  }) => void
  /**
   * Modo Missão: o host devolve o editor do Estúdio embarcado no projeto
   * semeado. O 2º arg é ADITIVO (host antigo com 1 param segue válido) e
   * permite ao host amarrar o snapshot na nuvem ao projeto do Pensa.
   */
  renderStudio?: (studioProjectId: string, pensaProjectId: string) => ReactNode
  /**
   * Semeadura (fase R): o HOST cria o projeto no armazenamento do Estúdio (namespace
   * do perfil) com o nome do jogo e devolve o id (charset [A-Za-z0-9_-], sem `:`).
   * O PACOTE então persiste o id via PATCH `/projects/:id { studioProjectId }`.
   */
  createStudioProject?: (name: string) => Promise<string>
  /**
   * Sync OPORTUNISTA fire-and-forget do snapshot do Estúdio (host): compara o
   * updatedAt local (IndexedDB) com o snapshotAt do servidor e sobe/restaura.
   * O pacote chama ao abrir o ProjectView quando `detail.studioProjectId`
   * existe e buildEnv é 'embedded' ou 'studio' (uma vez por abertura).
   */
  syncStudioSnapshot?: (args: { pensaProjectId: string; studioProjectId: string }) => void
}

// ── Pensa (planejador de jogos — metodologia ZERO) ─────────────────────────
// Tipos PUROS do módulo. Projeto → versões → z/e/r/o/done; a execução acontece
// somente no Pinta ou no Estúdio. Datas são Date no domínio e ISO nas views.

import type { CourseAudience } from '../course/course'

export const PENSA_ACCESS_REF = 'pensa'
export const PENSA_PINTA_ACCESS_REF = 'pinta'
export const PENSA_STUDIO_ACCESS_REF = 'estudio-completo'

export type PensaStage = 'z' | 'e' | 'r' | 'o' | 'done'
export type PensaWorkStage = Exclude<PensaStage, 'done'>
export type PensaProjectKind = 'game'
export type PensaProjectStatus = 'active' | 'archived'
export type PensaArtifactType =
  | 'idea'
  | 'game_design'
  | 'visual_direction'
  | 'task_plan'
  | 'plan_review'
export type PensaArtifactStatus = 'draft' | 'validated'

export type PensaGameDimension = '2d' | '3d'
export type PensaTaskDestination = 'pinta' | 'studio'
export type PensaTaskStatus = 'planned' | 'in_progress' | 'completed'
export type PensaTaskCategory = 'art' | 'setup' | 'gameplay' | 'scene' | 'ui' | 'polish'
export type PensaArtKind = 'sprite' | 'background' | 'tileset' | 'tilemap'

export const MAX_ACTIVE_PROJECTS = 20
export const MAX_CYCLES_PER_PROJECT = 20
export const MAX_TASKS_PER_CYCLE = 80
export const MAX_CONVERSATION_MESSAGES = 80
export const MAX_CONVERSATION_CHARS = 262_144
export const MAX_ARTIFACT_CONTENT_CHARS = 262_144

export interface PensaProject {
  id: string
  userId: string
  accountId: string
  audience: CourseAudience
  kind: PensaProjectKind
  name: string
  status: PensaProjectStatus
  createdAt: Date
  updatedAt: Date
}

export interface PensaCycle {
  id: string
  projectId: string
  number: number
  goal: string | null
  stage: PensaStage
  zCompletedAt: Date | null
  eCompletedAt: Date | null
  rCompletedAt: Date | null
  oCompletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface PensaChatMessage {
  role: 'user' | 'assistant'
  content: string
  at: string
}

export interface PensaZState {
  answered: {
    idea: boolean
    objective: boolean
    controls: boolean
    outcome: boolean
    dimension: boolean
  }
  ready: boolean
}

export interface PensaConversation {
  cycleId: string
  stage: PensaStage
  messages: PensaChatMessage[]
  summary: string | null
  state: Record<string, unknown>
  messageCount: number
}

export interface PensaArtifact {
  id: string
  cycleId: string
  stage: PensaStage
  type: PensaArtifactType
  version: number
  content: unknown
  status: PensaArtifactStatus
  createdAt: Date
}

export interface PensaGuideItem {
  /** ID estável gerado no plano e usado nas sincronizações das ferramentas. */
  id: string
  text: string
  hint?: string
  required: boolean
}

export interface PensaTaskGuide {
  steps: PensaGuideItem[]
  criteria: PensaGuideItem[]
}

export interface PensaPintaTaskContext {
  kind: 'pinta'
  /** ID do item correspondente no inventário da Bíblia Visual. */
  assetId: string
  artKind: PensaArtKind
  style: 'pixel' | 'vector' | 'either'
  preset?: string
  palette: Array<{ role: string; color: string }>
  appearance: string
  animations: string[]
  states: string[]
  usage: string
  /** Quando true, criar/vincular o asset não basta: a ponte com o Estúdio deve concluir. */
  requiresStudioUse: boolean
}

export interface PensaStudioBlockReference {
  id: string
  label: string
  category: string
  subcategory: string
  area: 'structure' | 'appearance' | 'start' | 'events' | 'loops' | 'value'
  extension: string | null
}

export interface PensaStudioTaskContext {
  kind: 'studio'
  dimension: PensaGameDimension
  /** Modelos, mundo ou materiais da Bíblia Visual criados por este cartão. */
  visualAssetIds: string[]
  blockIds: string[]
  blocks: PensaStudioBlockReference[]
  mechanicDocumentIds: string[]
  extensionIds: string[]
}

export type PensaTaskContext = PensaPintaTaskContext | PensaStudioTaskContext

export type PensaTaskOutputRef =
  | {
      kind: 'pinta_asset'
      assetId: string
      assetName?: string
      usedInStudioAt?: string
    }
  | { kind: 'studio_project'; projectId: string; saveRevision?: string }

export interface PensaTaskProgress {
  status: PensaTaskStatus
  completedStepIds: string[]
  completedCriteriaIds: string[]
  outputRef: PensaTaskOutputRef | null
  startedAt: Date | null
  completedAt: Date | null
  updatedAt: Date | null
}

/** Cartão de Criação compartilhado por Pensa, Pinta e Estúdio. */
export interface PensaTask {
  id: string
  cycleId: string
  title: string
  summary: string | null
  destination: PensaTaskDestination
  category: PensaTaskCategory
  estimatedMinutes: number
  /** Ordem global do plano, não uma posição de coluna. */
  position: number
  dependencies: string[]
  guide: PensaTaskGuide
  context: PensaTaskContext
  progress: PensaTaskProgress
  revision: number
  supersedesTaskId: string | null
  archivedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface PensaPlanReviewContent {
  approved: boolean
  auditedAt: string
  revision: number
  issues: Array<{ code: string; message: string; taskId?: string }>
}

// ── Pensa (planejamento guiado — metodologia ZERO) ──────────────────────────
// Tipos PUROS do módulo, mirror 1:1 do contrato entre camadas
// (members/gateway/member-shell/packages/pensa). Projeto → ciclos (1 = MVP) →
// etapas `z → e → r → o → done`; artefatos versionados por etapa; kanban de
// missões; checklist de lançamento. Datas aqui são `Date` — a borda usa os
// mappers (Date→ISO) de `application/mappers/pensa-views.ts`.

import type { CourseAudience } from '../course/course'

/** Ref/slug do PRODUTO Pensa no catálogo — gate de criação de projeto. */
export const PENSA_ACCESS_REF = 'pensa'

export type PensaStage = 'z' | 'e' | 'r' | 'o' | 'done'
/** Etapas de TRABALHO (as que aceitam conteúdo e podem avançar). */
export type PensaWorkStage = 'z' | 'e' | 'r' | 'o'
export type PensaProjectKind = 'game' | 'webapp'
export type PensaProjectStatus = 'active' | 'archived'
export type PensaArtifactType =
  | 'idea'
  | 'prd'
  | 'friendly_spec'
  | 'identity'
  | 'mission_plan'
  | 'checklist_seed'
export type PensaArtifactStatus = 'draft' | 'validated'
export type PensaTaskColumn = 'backlog' | 'doing' | 'review' | 'done'
export type PensaChecklistCategory = 'test' | 'polish' | 'publish' | 'share'
/**
 * "Onde você vai construir?" — preferência de UX por PROJETO (fase R):
 * `embedded` = Estúdio junto da missão (split) · `studio` = Estúdio Completo
 * (painel + "Abrir o Estúdio") · `external` = no computador (guia puro, sem
 * semeadura). `null` = ainda não escolheu (a etapa R mostra o chooser).
 * Validado no APP (union do DTO), não com enum pg — é preferência, não integridade.
 */
export type PensaBuildEnv = 'embedded' | 'studio' | 'external'

// ── Cotas e limites (enforçados nos USE CASES, não no banco) ────────────────
export const MAX_ACTIVE_PROJECTS = 20
export const MAX_CYCLES_PER_PROJECT = 10
export const MAX_TASKS_PER_CYCLE = 60
export const MAX_CHECKLIST_ITEMS_PER_CYCLE = 40
export const MAX_CONVERSATION_MESSAGES = 80
export const MAX_CONVERSATION_CHARS = 262_144
export const MAX_ARTIFACT_CONTENT_CHARS = 262_144
/** Snapshot do Estúdio na nuvem: teto do JSON SERIALIZADO (jogo inteiro da criança). */
export const MAX_STUDIO_SNAPSHOT_CHARS = 1_800_000

export interface PensaProject {
  id: string
  userId: string
  /** Conta responsável (kids: o pai; adulto: = userId). IMUTÁVEL (só no INSERT). */
  accountId: string
  audience: CourseAudience
  kind: PensaProjectKind
  name: string
  status: PensaProjectStatus
  /** Id do projeto semeado no IndexedDB do Estúdio (fase R). */
  studioProjectId: string | null
  /** Onde construir (fase R) — `null` = chooser pendente. */
  buildEnv: PensaBuildEnv | null
  /**
   * Quando o snapshot do Estúdio foi salvo por último (`null` = nunca). O BLOB
   * (`studio_snapshot`, ≤1.8M chars) NÃO vive aqui — só nas leituras dedicadas
   * do snapshot (é pesado demais p/ pegar carona em detail/ownership).
   */
  studioSnapshotAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface PensaCycle {
  id: string
  projectId: string
  /** 1 = MVP ("Versão 1"). */
  number: number
  /** Objetivo do ciclo (ciclos ≥2). */
  goal: string | null
  stage: PensaStage
  zCompletedAt: Date | null
  eCompletedAt: Date | null
  rCompletedAt: Date | null
  oCompletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/** Mensagem do chat guiado — `at` já é ISO string (persistida assim no jsonb). */
export interface PensaChatMessage {
  role: 'user' | 'assistant'
  content: string
  at: string
}

/** Estado da etapa z (perguntas respondidas) — shape do contrato; vive no jsonb `state`. */
export interface PensaZState {
  answered: { who: boolean; problem: boolean; action: boolean; screens: boolean; success: boolean }
  ready: boolean
}

/** 1 linha por (ciclo, etapa) — upsert por turno. */
export interface PensaConversation {
  cycleId: string
  stage: PensaStage
  messages: PensaChatMessage[]
  /** Sumarização quando o cap corta mensagens antigas. */
  summary: string | null
  /** Etapa z: PensaZState; demais etapas `{}`. */
  state: Record<string, unknown>
  /** Contagem TOTAL histórica (não encolhe no trim). */
  messageCount: number
}

/** Artefato versionado append-only; "latest" = MAX(version) por (cycle, type). */
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

export interface PensaMissionStep {
  text: string
  hint?: string
}

/** Missão de um card do kanban (shape do contrato — jsonb opaco validado na borda). */
export interface PensaMission {
  story?: string
  /** 1–12 passos. */
  steps: PensaMissionStep[]
  studioHints?: { categories: string[]; blocks: string[] }
  /** 1–3 critérios observáveis. */
  doneWhen: string[]
  /** Missão de ARTE (07/2026): o kids abre o Pinta pré-configurado. */
  artKind?: 'sprite' | 'background' | 'tileset'
  /** Paleta do jogo (hex, ≤8) que acompanha a missão de arte. */
  palette?: string[]
}

/** Card do kanban (missão). `position` = ordem DENTRO da coluna (densa, re-sequenciada). */
export interface PensaTask {
  id: string
  cycleId: string
  title: string
  summary: string | null
  /** Ex.: 'setup' | 'gameplay' | 'polish' | 'fix'. */
  taskType: string | null
  mission: PensaMission
  column: PensaTaskColumn
  position: number
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface PensaChecklistItem {
  id: string
  cycleId: string
  category: PensaChecklistCategory
  title: string
  description: string | null
  /** Itens opcionais (ex.: Toque de Brilho) = false — não travam o o→done. */
  required: boolean
  position: number
  done: boolean
  doneAt: Date | null
}

/**
 * Read-model de USO das ferramentas por aprendiz (ficha admin) — contagens e
 * "última atividade" em LOTE (GROUP BY user), nunca N+1. `userId` é o aprendiz
 * (a conta no adulto; o PERFIL da criança no kids), como em todo dado de uso.
 */
export interface LearnerPensaUsage {
  /** Projetos do Pensa (qualquer status — criou é criou). */
  projects: number
  /** Ciclos que chegaram ao `done` (o "Grande Lançamento"). */
  cyclesCompleted: number
  /** Max `updated_at` dos projetos — quando mexeu por último. */
  lastActivityAt: Date | null
}

export interface LearnerCreationsUsage {
  /** Criações VIVAS na nuvem ("Guardado na sua conta"): `deleted_at is null`. */
  count: number
  /** Max `item_updated_at` (relógio do CLIENTE — quando a criança mexeu). */
  lastActivityAt: Date | null
}

export interface LearnerDeliveriesUsage {
  /** Entregas de aula (`studio_submissions`) cujo BLOCO é do kind pedido. */
  count: number
  /** Max `submitted_at`. */
  lastActivityAt: Date | null
}

export interface ToolUsageRepository {
  pensaUsageByUsers(userIds: string[]): Promise<Map<string, LearnerPensaUsage>>
  creationsUsageByUsers(
    userIds: string[],
    tool: 'studio' | 'pinta',
  ): Promise<Map<string, LearnerCreationsUsage>>
  submissionsUsageByUsers(
    userIds: string[],
    kind: 'studio' | 'pinta',
  ): Promise<Map<string, LearnerDeliveriesUsage>>
}

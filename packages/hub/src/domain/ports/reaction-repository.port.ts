export type ReactionTarget = 'thread' | 'comment'

/** Resumo agregado de um emoji num alvo (p/ exibição). */
export interface ReactionSummaryItem {
  emoji: string
  count: number
  /** O usuário atual reagiu com este emoji? */
  reactedByMe: boolean
}

export interface ReactionRepository {
  /** Idempotente (ON CONFLICT DO NOTHING na unicidade target+user+emoji). */
  add(
    target: ReactionTarget,
    targetId: string,
    userId: string,
    emoji: string,
    now: Date,
  ): Promise<void>
  /** `false` se não havia a reação. */
  remove(target: ReactionTarget, targetId: string, userId: string, emoji: string): Promise<boolean>
  /**
   * Agrega as reações de um conjunto de alvos numa só query (GROUP BY) — evita
   * N+1 ao montar uma página de tópicos/comentários. `reactedByMe` é por `userId`.
   */
  summarize(
    target: ReactionTarget,
    targetIds: string[],
    userId: string,
  ): Promise<Map<string, ReactionSummaryItem[]>>
}

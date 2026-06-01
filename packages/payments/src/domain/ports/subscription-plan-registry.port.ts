/**
 * Port (driven) do registro de planos de recorrência. Planos da Efí são
 * **reutilizáveis** e chaveados por (intervalo em meses, repetições) — criar um
 * plano por assinatura poluiria a conta. O registro mapeia a chave → `plan_id`
 * da Efí, para reaproveitar entre assinaturas.
 */
export interface SubscriptionPlanRegistry {
  /** Retorna o `plan_id` já mapeado para (provider, intervalMonths, repeats), ou null. */
  find(provider: string, intervalMonths: number, repeats: number | null): Promise<string | null>

  /**
   * Persiste o mapeamento (INSERT ... ON CONFLICT DO NOTHING) e retorna o
   * `plan_id` **vencedor**: o nosso, ou — numa corrida — o do concorrente que
   * inseriu primeiro (nesse caso o nosso plano recém-criado na Efí fica órfão,
   * o que é aceitável e logado). Garante um único plano compartilhado por chave.
   */
  register(input: {
    provider: string
    intervalMonths: number
    repeats: number | null
    providerPlanId: string
    name: string
  }): Promise<string>
}

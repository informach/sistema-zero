/** Uso de quota por provedor/dia (YouTube: dia civil em America/Los_Angeles). */
export interface QuotaUsage {
  units: number
  uploads: number
}

export interface QuotaUsageRepository {
  get(provider: string, day: string): Promise<QuotaUsage>
  /** Incremento ATÔMICO (upsert on conflict) — devolve os totais novos. */
  add(provider: string, day: string, units: number, uploads: number): Promise<QuotaUsage>
}

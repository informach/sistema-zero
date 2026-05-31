/**
 * Métricas em processo (por réplica): contagem de requisições por classe de
 * status e latência média. Exposto em GET /metrics (JSON e texto Prometheus).
 */
export class MetricsRegistry {
  private total = 0
  private readonly byStatusClass = new Map<string, number>()
  private latencySum = 0

  record(status: number, latencyMs: number): void {
    this.total++
    const cls = `${Math.floor(status / 100)}xx`
    this.byStatusClass.set(cls, (this.byStatusClass.get(cls) ?? 0) + 1)
    this.latencySum += latencyMs
  }

  snapshot(): { total: number; byStatusClass: Record<string, number>; avgLatencyMs: number } {
    return {
      total: this.total,
      byStatusClass: Object.fromEntries(this.byStatusClass),
      avgLatencyMs: this.total > 0 ? Math.round((this.latencySum / this.total) * 100) / 100 : 0,
    }
  }

  prometheus(): string {
    const lines = [
      '# HELP gateway_requests_total Total de requisições processadas',
      '# TYPE gateway_requests_total counter',
      `gateway_requests_total ${this.total}`,
    ]
    for (const [cls, count] of this.byStatusClass) {
      lines.push(`gateway_requests_by_status{class="${cls}"} ${count}`)
    }
    lines.push(`gateway_request_latency_ms_avg ${this.snapshot().avgLatencyMs}`)
    return `${lines.join('\n')}\n`
  }
}

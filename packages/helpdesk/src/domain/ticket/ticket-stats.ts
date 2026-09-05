/**
 * Estatísticas do painel (F5) — PURO, sem I/O. As janelas de tempo e a série
 * densa vivem aqui para que Drizzle e in-memory calculem o MESMO recorte e o
 * teste unitário fixe as bordas sem banco.
 *
 * Fuso: São Paulo é UTC-3 fixo (sem horário de verão desde 2019) — o mesmo
 * offset que o helpdesk-app usa. Um dia civil vai de 03:00Z a 03:00Z.
 */

/** Quantos dias a série de volume cobre (hoje + os N-1 anteriores). */
export const STATS_WINDOW_DAYS = 14

const SP_OFFSET_MS = 3 * 60 * 60_000

/** Dia civil de São Paulo de um instante (`YYYY-MM-DD`). */
export function spDayKey(at: Date): string {
  return new Date(at.getTime() - SP_OFFSET_MS).toISOString().slice(0, 10)
}

/** Início (00:00 SP) do dia civil `dayKey`, como instante UTC. */
export function spDayStart(dayKey: string): Date {
  return new Date(`${dayKey}T00:00:00.000-03:00`)
}

export interface StatsWindows {
  /** Início do dia de HOJE (SP), ISO UTC — janela "hoje". */
  todayStartIso: string
  /** Início de 6 dias atrás (SP), ISO UTC — janela "7 dias" = hoje + 6 anteriores. */
  weekStartIso: string
  /** Início do 1º dia da série (SP), ISO UTC — corta o volume dos últimos N dias. */
  seriesStartIso: string
  /** Dias SP da série, ASCENDENTE (os N últimos, terminando em hoje). */
  dayKeys: string[]
}

/** Bordas das janelas do painel a partir de "agora". */
export function statsWindows(now: Date, days = STATS_WINDOW_DAYS): StatsWindows {
  const todayStart = spDayStart(spDayKey(now))
  const dayKeys: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    dayKeys.push(spDayKey(new Date(todayStart.getTime() - i * 86_400_000)))
  }
  const seriesStart = spDayStart(dayKeys[0] as string)
  return {
    todayStartIso: todayStart.toISOString(),
    weekStartIso: new Date(todayStart.getTime() - 6 * 86_400_000).toISOString(),
    seriesStartIso: seriesStart.toISOString(),
    dayKeys,
  }
}

/** Um ponto da série de volume: tickets recebidos no dia. */
export interface DailyVolumePoint {
  /** Dia civil SP (`YYYY-MM-DD`). */
  date: string
  created: number
}

/** Estatísticas completas do painel (contrato do `GET /helpdesk/tickets/stats`). */
export interface TicketStats {
  /** Fila de trabalho atual por status. */
  counts: { new: number; open: number; waiting: number }
  /** Tickets resolvidos/fechados hoje (proxy: `updated_at` na última transição). */
  resolvedToday: number
  resolved7d: number
  /** Exceções operacionais que merecem a atenção da equipe primeiro. */
  sla: { atRisk: number; breached: number; unassigned: number }
  /** Série densa dos últimos {@link STATS_WINDOW_DAYS} dias, ascendente. */
  volume: DailyVolumePoint[]
}

/**
 * Preenche a série com TODOS os dias da janela (dias sem ticket viram 0) — sem
 * isso o gráfico saltaria dias vazios e mentiria sobre a cadência.
 */
export function densifyVolume(
  dayKeys: string[],
  createdByDay: Map<string, number>,
): DailyVolumePoint[] {
  return dayKeys.map((date) => ({
    date,
    created: createdByDay.get(date) ?? 0,
  }))
}

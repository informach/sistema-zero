type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void
  info(message: string, context?: Record<string, unknown>): void
  warn(message: string, context?: Record<string, unknown>): void
  error(message: string, context?: Record<string, unknown>): void
}

/**
 * Logger estruturado (JSON) simples. Em produção pode ser trocado por
 * pino/winston sem afetar os consumidores (dependem da interface `Logger`).
 * Nunca logue dados sensíveis (PAN, segredos, tokens).
 *
 * Em `pretty` (dev) os campos de contexto aparecem inline (`[INFO] msg {…}`);
 * em produção é uma linha JSON por evento (parseável por agregadores).
 */
export function createLogger(opts: { level?: LogLevel; pretty?: boolean } = {}): Logger {
  const order: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }
  const minLevel = order[opts.level ?? 'info']

  const sink = (level: LogLevel, line: string) => {
    if (level === 'error') console.error(line)
    else if (level === 'warn') console.warn(line)
    else console.log(line)
  }

  const log = (level: LogLevel, message: string, context?: Record<string, unknown>) => {
    if (order[level] < minLevel) return
    if (opts.pretty) {
      const ctx = context && Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : ''
      sink(level, `[${level.toUpperCase()}] ${message}${ctx}`)
      return
    }
    sink(level, JSON.stringify({ level, time: new Date().toISOString(), message, ...context }))
  }

  return {
    debug: (m, c) => log('debug', m, c),
    info: (m, c) => log('info', m, c),
    warn: (m, c) => log('warn', m, c),
    error: (m, c) => log('error', m, c),
  }
}

import type { Logger } from '../../logging/logger'
import type { PgChannel } from './channels'
import type { PgClient } from './db'

interface Subscription {
  unlisten: () => Promise<void>
}

/**
 * Escuta canais `LISTEN/NOTIFY` do Postgres e dispara um callback (acordar um
 * worker) ao receber uma notificação. postgres.js mantém UMA conexão dedicada
 * para os listens e **reconecta sozinho** (re-LISTEN) se a conexão cair.
 *
 * Tolerante a falhas: se o `LISTEN` não estiver disponível (ex.: PgBouncer em
 * modo *transaction/statement pooling* não suporta LISTEN), apenas registra um
 * aviso — o poll periódico dos workers continua garantindo o processamento.
 */
export class PgNotificationListener {
  private readonly subscriptions: Subscription[] = []

  constructor(
    private readonly sql: PgClient,
    private readonly logger: Logger,
  ) {}

  /** Assina `channel`; cada notificação chama `onNotify` (deve ser leve/síncrono). */
  async listen(channel: PgChannel, onNotify: () => void): Promise<void> {
    try {
      const meta = await this.sql.listen(
        channel,
        () => {
          try {
            onNotify()
          } catch (error) {
            this.logger.error('pg.notify.handler_failed', {
              channel,
              error: error instanceof Error ? error.message : String(error),
            })
          }
        },
        // onlisten: dispara também a cada reconexão → varre o que chegou na janela offline.
        () => {
          this.logger.info('pg.listen.subscribed', { channel })
          onNotify()
        },
      )
      this.subscriptions.push(meta)
    } catch (error) {
      // Degrada para "somente poll" — não derruba o boot.
      this.logger.warn('pg.listen.unavailable', {
        channel,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async stop(): Promise<void> {
    await Promise.all(this.subscriptions.map((s) => s.unlisten().catch(() => {})))
    this.subscriptions.length = 0
  }
}

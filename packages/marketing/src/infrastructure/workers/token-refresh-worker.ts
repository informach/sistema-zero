import type { Logger } from '@sistemazero/core/logging'
import type { AccountService } from '../../application/accounts/account.service'
import type { SocialAccountRepository } from '../../domain/ports/social-account-repository.port'

export interface TokenRefreshWorkerConfig {
  intervalMs: number
  /** Renova tokens que vencem dentro desta margem (refresh PROATIVO). */
  marginMs: number
}

export interface TokenRefreshWorkerDeps {
  accounts: SocialAccountRepository
  accountService: AccountService
  now: () => Date
  logger: Logger
  config: TokenRefreshWorkerConfig
}

/**
 * Token-refresh-worker: renova PROATIVAMENTE os access tokens das contas
 * conectadas vencendo dentro da margem. `invalid_grant` → o AccountService já
 * marca `needs_reauth` + loga error (espelho Sentry) — o card em Conexões pede
 * reconexão. Erro transitório fica p/ o próximo ciclo.
 */
export class TokenRefreshWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false
  private inFlight: Promise<void> | null = null

  constructor(private readonly deps: TokenRefreshWorkerDeps) {}

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => {
      this.inFlight = this.tick()
    }, this.deps.config.intervalMs)
    this.deps.logger.info('token_refresh.worker.started', {
      intervalMs: this.deps.config.intervalMs,
    })
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.inFlight) await this.inFlight
  }

  async tick(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      const expiring = await this.deps.accounts.listExpiring(
        this.deps.now(),
        this.deps.config.marginMs,
        20,
      )
      for (const account of expiring) {
        try {
          await this.deps.accountService.getFreshAccessToken(account, this.deps.config.marginMs)
          this.deps.logger.info('token_refresh.refreshed', { accountId: account.id })
        } catch (error) {
          // needs_reauth já foi marcado/logado pelo AccountService; transitório
          // fica p/ o próximo ciclo (o lastRefreshError aparece em Conexões).
          this.deps.logger.warn('token_refresh.failed', {
            accountId: account.id,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    } catch (error) {
      this.deps.logger.error('token_refresh.tick_failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      this.running = false
    }
  }
}

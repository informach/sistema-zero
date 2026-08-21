import type { Logger } from '@sistemazero/core/logging'
import { sha256Hex } from '@sistemazero/core/security'
import {
  InvalidImpersonationTokenError,
  TargetNotImpersonableError,
} from '../../domain/impersonation/impersonation.errors'
import type { ImpersonationTokenRepository } from '../../domain/ports/impersonation-token-repository.port'
import type { UserRepository } from '../../domain/ports/user-repository.port'
import { toUserView, type UserView } from '../mappers/user-view'
import type { AuthTokenService, AuthTokens } from '../tokens/auth-token.service'
import type { ImpersonationSessionValidator } from './impersonation-session-validator'

export interface ExchangeImpersonationTokenCommand {
  token: string
  userAgent?: string | null
  ip?: string | null
}

/**
 * Troca o token de handoff por uma SESSÃO IMPERSONADA do alvo: access com claim
 * `act` (RFC 8693 — `sub`=alvo, `act.sub`=admin) + refresh de família marcada
 * (`impersonatorUserId`, TTL curto). Consumo ATÔMICO do token (single-use de
 * verdade, mesmo sob corrida). Erros de token são INDISTINGUÍVEIS entre
 * ausente/expirado/consumido (não vaza estado a quem só tem a URL).
 */
export class ExchangeImpersonationTokenService {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: ImpersonationTokenRepository,
    private readonly authTokens: AuthTokenService,
    private readonly impersonationSessions: ImpersonationSessionValidator,
    private readonly logger: Logger,
  ) {}

  async execute(
    command: ExchangeImpersonationTokenCommand,
  ): Promise<{ user: UserView; tokens: AuthTokens }> {
    const presented = command.token?.trim()
    if (!presented) throw new InvalidImpersonationTokenError()

    const record = await this.tokens.findByHash(sha256Hex(presented))
    if (!record) throw new InvalidImpersonationTokenError()
    if (record.consumedAt || record.expiresAt.getTime() <= Date.now()) {
      throw new InvalidImpersonationTokenError()
    }

    // Consumo ATÔMICO: perder a disputa = outro exchange já usou este token.
    const consumed = await this.tokens.consume(record.id, new Date())
    if (!consumed) throw new InvalidImpersonationTokenError()

    const target = await this.users.findById(record.targetUserId)
    if (!target) throw new InvalidImpersonationTokenError()
    if (!target.isActive()) throw new TargetNotImpersonableError()

    // Ator sumido/desativado entre o pedido e o exchange → handoff morre junto.
    const actor = await this.impersonationSessions.validateActor(record.actorId, target)
    if (!actor) throw new InvalidImpersonationTokenError()

    const tokens = await this.authTokens.issueForUser(target, {
      userAgent: command.userAgent,
      ip: command.ip,
      impersonation: {
        actorId: actor.id,
        act: {
          sub: actor.id,
          email: actor.email,
          name: actor.fullName,
          mode: 'readonly',
        },
      },
    })

    // Trilha de auditoria: a sessão impersonada FOI emitida (par ator→alvo + ip).
    this.logger.info('auth.impersonation.exchanged', {
      actorId: actor.id,
      targetUserId: target.id,
      ip: command.ip ?? null,
    })

    return { user: toUserView(target), tokens }
  }
}

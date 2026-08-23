import { randomUUID } from 'node:crypto'
import type { Logger } from '@sistemazero/core/logging'
import { sha256Hex } from '@sistemazero/core/security'
import type { ImpersonationMode } from '../../domain/impersonation/impersonation-mode'
import type { ProfileRepository } from '../../domain/ports/profile-repository.port'
import type { RefreshTokenRepository } from '../../domain/ports/refresh-token-repository.port'
import type { ProfileClaim } from '../../domain/ports/token-issuer.port'
import type { UserRepository } from '../../domain/ports/user-repository.port'
import { InvalidRefreshTokenError } from '../../domain/user/user.errors'
import type {
  AuthSessionAccessToken,
  AuthTokenService,
  IssueContext,
} from '../tokens/auth-token.service'
import type { ImpersonationSessionValidator } from './impersonation-session-validator'

export interface ChangeImpersonationModeCommand {
  refreshToken: string
  mode: ImpersonationMode
  userAgent?: string | null
  ip?: string | null
}

/**
 * Troca a capacidade canônica da família sem consumir o refresh. Assim retries
 * do mesmo pedido são idempotentes e não disputam uma rotação artificial.
 */
export class ChangeImpersonationModeService {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly profiles: ProfileRepository,
    private readonly tokens: AuthTokenService,
    private readonly impersonationSessions: ImpersonationSessionValidator,
    private readonly logger: Logger,
  ) {}

  async execute(command: ChangeImpersonationModeCommand): Promise<AuthSessionAccessToken> {
    const presented = command.refreshToken?.trim()
    if (!presented) throw new InvalidRefreshTokenError()

    const record = await this.refreshTokens.findByHash(sha256Hex(presented))
    if (!record?.impersonatorUserId) throw new InvalidRefreshTokenError()
    if (
      record.rotatedAt ||
      record.revokedAt ||
      record.familyRevokedAt ||
      record.expiresAt.getTime() <= Date.now() ||
      record.familyExpiresAt.getTime() <= Date.now()
    ) {
      // Mudar modo não é rotação. Perder uma corrida com refresh/logout nega esta
      // chamada, mas não transforma o uso legítimo do token em reuse-detection.
      throw new InvalidRefreshTokenError()
    }

    const target = await this.users.findById(record.userId)
    if (!target) throw new InvalidRefreshTokenError()
    const actor = await this.impersonationSessions.validateActor(record.impersonatorUserId, target)
    if (!actor) {
      await this.refreshTokens.revokeFamily(record.familyId)
      throw new InvalidRefreshTokenError()
    }

    let profile: IssueContext['profile'] = null
    if (record.activeProfileId) {
      const active = await this.profiles.findById(record.activeProfileId)
      if (!active?.belongsTo(target.id) || active.isArchived) {
        await this.refreshTokens.revokeFamily(record.familyId)
        throw new InvalidRefreshTokenError()
      }
      const claim: ProfileClaim = {
        accountId: target.id,
        name: active.name,
        pub: active.publicProfileEnabled,
      }
      profile = { profileId: active.id, claim }
    }

    // Prepara o access antes de alterar estado. Em especial no downgrade, uma
    // falha tardia do signer não pode deixar o cliente usando o access write antigo.
    const access = await this.tokens.issueAccessForUser(target, {
      impersonation: {
        actorId: actor.id,
        familyExpiresAt: record.familyExpiresAt,
        act: {
          sub: actor.id,
          email: actor.email,
          name: actor.fullName,
          mode: command.mode,
        },
      },
      profile,
    })

    const audit = {
      id: randomUUID(),
      actorId: target.id,
      actorEmail: target.email,
      actorRole: target.role,
      impersonatorId: actor.id,
      action: `auth.impersonation.mode.${command.mode}`,
      method: 'POST',
      path: '/auth/impersonate/mode',
      targetId: profile?.profileId ?? target.id,
      status: 200,
      ip: command.ip ?? null,
      userAgent: command.userAgent ?? null,
      requestId: null,
    }
    let updated: boolean
    try {
      // O adapter grava o modo e este sucesso auditável na MESMA transação. Se
      // o CAS perder para refresh/logout, nenhum log mentiroso é publicado.
      updated = await this.refreshTokens.setImpersonationMode(
        record.id,
        record.familyId,
        command.mode === 'write',
        audit,
      )
    } catch (error) {
      // Elevação falha fechada sem trilha. No downgrade, uma segunda transação
      // reduz a capacidade sem auditoria e o erro operacional fica alertável.
      if (command.mode === 'write') throw error
      this.logger.error('auth.impersonation.mode_audit_failed', {
        actorId: actor.id,
        targetUserId: target.id,
        mode: command.mode,
        error: error instanceof Error ? error.message : String(error),
      })
      updated = await this.refreshTokens.setImpersonationMode(record.id, record.familyId, false)
    }
    if (!updated) throw new InvalidRefreshTokenError()

    const refreshExpiresIn = Math.max(
      1,
      Math.ceil((record.familyExpiresAt.getTime() - Date.now()) / 1000),
    )
    this.logger.info('auth.impersonation.mode_changed', {
      actorId: actor.id,
      targetUserId: target.id,
      profileId: profile?.profileId ?? null,
      mode: command.mode,
    })
    return { ...access, refreshExpiresIn }
  }
}

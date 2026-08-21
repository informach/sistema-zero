import type { Logger } from '@sistemazero/core/logging'
import { sha256Hex } from '@sistemazero/core/security'
import type { ProfileRepository } from '../../domain/ports/profile-repository.port'
import type { RefreshTokenRepository } from '../../domain/ports/refresh-token-repository.port'
import type { ProfileClaim } from '../../domain/ports/token-issuer.port'
import type { UserRepository } from '../../domain/ports/user-repository.port'
import { InvalidRefreshTokenError, UserNotActiveError } from '../../domain/user/user.errors'
import type { ImpersonationSessionValidator } from '../impersonation/impersonation-session-validator'
import type { AuthTokenService, AuthTokens, IssueContext } from '../tokens/auth-token.service'

export interface RefreshCommand {
  refreshToken: string
  userAgent?: string | null
  ip?: string | null
}

/**
 * Caso de uso de renovação (rotação) de tokens. Detecta REUSO: se um refresh já
 * rotacionado/revogado for apresentado, revoga a família inteira (mitiga roubo).
 */
export class RefreshService {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly tokens: AuthTokenService,
    private readonly profiles: ProfileRepository,
    private readonly impersonationSessions: ImpersonationSessionValidator,
    private readonly logger: Logger,
  ) {}

  async execute(command: RefreshCommand): Promise<AuthTokens> {
    const presented = command.refreshToken?.trim()
    if (!presented) throw new InvalidRefreshTokenError()

    const record = await this.refreshTokens.findByHash(sha256Hex(presented))
    if (!record) throw new InvalidRefreshTokenError()

    // A família é a autoridade canônica. Isso fecha a corrida em que uma linha
    // sucessora era criada depois de as linhas antigas terem sido revogadas.
    if (record.familyRevokedAt || record.familyExpiresAt.getTime() <= Date.now()) {
      throw new InvalidRefreshTokenError()
    }

    // Reuse-detection (fast-path): um token já consumido (rotacionado) ou revogado
    // reaparecendo indica vazamento → revoga a família inteira e nega.
    if (record.rotatedAt || record.revokedAt) {
      await this.refreshTokens.revokeFamily(record.familyId)
      this.logger.warn('auth.refresh.reuse_detected', {
        userId: record.userId,
        familyId: record.familyId,
      })
      throw new InvalidRefreshTokenError()
    }

    if (record.expiresAt.getTime() <= Date.now()) throw new InvalidRefreshTokenError()

    const user = await this.users.findById(record.userId)
    if (!user) {
      if (record.impersonatorUserId) await this.refreshTokens.revokeFamily(record.familyId)
      throw new InvalidRefreshTokenError()
    }
    if (!user.isActive()) {
      if (record.impersonatorUserId) {
        await this.refreshTokens.revokeFamily(record.familyId)
        throw new InvalidRefreshTokenError()
      }
      throw new UserNotActiveError()
    }

    // Sessão de IMPERSONAÇÃO: re-deriva a claim `act` do ATOR a cada rotação
    // (o access é re-emitido do UserAggregate do ALVO e a perderia). Ator sumido
    // ou desativado → a sessão de suporte morre junto (revoga a família).
    let impersonation: IssueContext['impersonation'] = null
    if (record.impersonatorUserId) {
      const actor = await this.impersonationSessions.validateActor(record.impersonatorUserId, user)
      if (!actor) {
        await this.refreshTokens.revokeFamily(record.familyId)
        this.logger.warn('auth.impersonation.actor_gone', {
          userId: record.userId,
          actorId: record.impersonatorUserId,
          familyId: record.familyId,
        })
        throw new InvalidRefreshTokenError()
      }
      impersonation = {
        actorId: actor.id,
        familyExpiresAt: record.familyExpiresAt,
        act: {
          sub: actor.id,
          email: actor.email,
          name: actor.fullName,
          mode: record.impersonationWritable ? 'write' : 'readonly',
        },
      }
    }

    // Sessão de PERFIL: re-deriva a claim `pfl` do perfil ativo a cada rotação (o
    // access é re-emitido da CONTA e a perderia). Perfil arquivado/sumido → a sessão
    // CAI para a conta (sem `pfl`): a criança volta à grade na próxima carga (em vez
    // de uma sessão presa a um perfil que não existe mais).
    let profileSession: { profileId: string; claim: ProfileClaim } | null = null
    if (record.activeProfileId) {
      const profile = await this.profiles.findById(record.activeProfileId)
      if (profile?.belongsTo(user.id) && !profile.isArchived) {
        // Re-deriva a flag a cada rotação → o pai liga/desliga e a próxima carga reflete.
        profileSession = {
          profileId: profile.id,
          claim: { accountId: user.id, name: profile.name, pub: profile.publicProfileEnabled },
        }
      }
    }

    // Rotaciona com claim ATÔMICO: consome o token atual e emite um novo na MESMA
    // família. Perder o claim = outra requisição rotacionou este token entre o
    // findByHash e aqui — semanticamente é REUSO (o fast-path acima não enxerga a
    // corrida), então recebe o mesmo tratamento: revoga a família e nega.
    const claimed = await this.refreshTokens.claimForRotation(record.id, new Date())
    if (!claimed) {
      await this.refreshTokens.revokeFamily(record.familyId)
      this.logger.warn('auth.refresh.reuse_detected', {
        userId: record.userId,
        familyId: record.familyId,
        race: true,
      })
      throw new InvalidRefreshTokenError()
    }
    return this.tokens.rotate(user, record.familyId, {
      userAgent: command.userAgent,
      ip: command.ip,
      impersonation,
      profile: profileSession,
    })
  }
}

import type { Logger } from '@sistemazero/core/logging'
import type { MessagingClient } from '../../../domain/ports/messaging-client.port'
import type { UserRepository } from '../../../domain/ports/user-repository.port'
import { UserNotFoundError } from '../../../domain/user/user.errors'
import type { CreatePasswordTokenService } from '../../password-reset/create-password-token.service'
import { type Platform, type PlatformUrls, resolvePlatformUrl } from '../../platform'
import { sendInviteEmail } from '../send-invite-email'

export interface ResendInviteOptions {
  /** Bases do link por plataforma (`COMMUNITY_URL`/`KIDS_COMMUNITY_URL`). */
  urls: PlatformUrls
  /** TTL (min) do token do convite — LONGO (`INVITE_TOKEN_TTL_MINUTES`, 14 dias). */
  inviteTokenTtlMinutes: number
}

export interface ResendInviteCommand {
  targetId: string
  /** Plataforma de destino do link (`main`/`kids`). Ausente → main. */
  platform?: Platform
}

/** `sent: false` = o e-mail não saiu (conta inativa ou falha do messaging). */
export interface ResendInviteResult {
  sent: boolean
}

/**
 * REENVIA o convite (link de 1º acesso) de um usuário existente pelo painel admin:
 * regenera o token de definição de senha com o TTL LONGO (o link antigo pode ter
 * expirado) e reenvia o e-mail `welcome`. É o caminho do operador quando o cliente
 * perdeu/expirou o link e ainda não definiu a senha. NÃO exige a senha atual (o
 * ator é o admin). Regenerar o token CONSOME os pendentes (o link antigo morre).
 */
export class ResendInviteService {
  constructor(
    private readonly users: UserRepository,
    private readonly createPasswordToken: CreatePasswordTokenService,
    private readonly messaging: MessagingClient,
    private readonly opts: ResendInviteOptions,
    private readonly logger: Logger,
  ) {}

  async execute(command: ResendInviteCommand): Promise<ResendInviteResult> {
    // Resolve a base ANTES de emitir: kids sem `KIDS_COMMUNITY_URL` → 400 sem efeito.
    const linkBase = resolvePlatformUrl(this.opts.urls, command.platform)

    const user = await this.users.findById(command.targetId)
    if (!user) throw new UserNotFoundError()

    // Emite SEM cooldown (é ação do operador, não o forgot-password público). `null`
    // = conta inativa (o token só é emitido p/ conta ativa) → nada foi enviado.
    const issued = await this.createPasswordToken.execute({
      email: user.email,
      ttlMinutes: this.opts.inviteTokenTtlMinutes,
    })
    if (!issued) return { sent: false }

    const sent = await sendInviteEmail(this.messaging, this.logger, {
      issued,
      linkBase,
      userId: user.id,
    })
    this.logger.info('admin.user.invite_resent', { userId: user.id, sent })
    return { sent }
  }
}

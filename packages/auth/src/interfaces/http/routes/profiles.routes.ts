import { ValidationError } from '@sistemazero/core/errors'
import { ForbiddenError, UnauthorizedError } from '@sistemazero/core/http'
import { Elysia } from 'elysia'
import type { ArchiveProfileService } from '../../../application/profiles/archive-profile.service'
import type { CreateProfileService } from '../../../application/profiles/create-profile.service'
import type { ExitProfileSessionService } from '../../../application/profiles/exit-profile-session.service'
import type { ListProfilesService } from '../../../application/profiles/list-profiles.service'
import type { SelectProfileService } from '../../../application/profiles/select-profile.service'
import type { UpdateProfileDetailsService } from '../../../application/profiles/update-profile.service'
import { type AuthContext, resolveClientIp, resolveGatewayActor } from '../auth'
import {
  CreateProfileBody,
  ExitProfileSessionBody,
  ProfileIdParams,
  UpdateProfileBody,
} from '../dtos'
import { PayloadTooLargeError } from '../errors'
import { requireInternalToken } from '../internal-auth'
import { isOversizeBody } from '../raw-body'

export interface ProfilesRoutesDeps {
  listProfiles: ListProfilesService
  createProfile: CreateProfileService
  updateProfile: UpdateProfileDetailsService
  archiveProfile: ArchiveProfileService
  selectProfile: SelectProfileService
  exitProfileSession: ExitProfileSessionService
  trustProxy: boolean
  trustedProxyHops: number
  /**
   * `AUTH_INTERNAL_TOKEN` — o gateway o injeta (prova de origem). Sem ele os
   * `X-Auth-User-*`/`x-auth-account-id` seriam forjáveis por quem alcançasse o
   * serviço direto na rede interna.
   */
  internalToken: string | undefined
}

/**
 * Perfis (estilo Netflix) + ciclo da SESSÃO de perfil. Duas posturas de guarda:
 * - **Gestão** (criar/editar/arquivar): exige sessão da CONTA — RECUSA sessão de
 *   perfil (a criança não mexe na grade). Detecta a sessão de perfil pela presença
 *   do `x-auth-account-id` (o gateway só o injeta quando o token tem a claim `pfl`).
 * - **Entrar/trocar de perfil e listar**: aceita AMBAS as sessões (um clique, sem
 *   PIN). O `accountUserId` é o `x-auth-account-id` (sessão de perfil) OU o
 *   `x-auth-user-id` (sessão da conta).
 * - **Sair do perfil** (`/profile-session/exit`): volta à conta, gateado pela senha.
 */
export function profilesRoutes(deps: ProfilesRoutesDeps) {
  const clientIp = (ctx: AuthContext): string =>
    resolveClientIp(ctx, deps.trustProxy, deps.trustedProxyHops)

  // Prova de origem (gateway) + ator ativo. Devolve a identidade efetiva do token.
  const ensureOrigin = (headers: Record<string, string | undefined>) => {
    requireInternalToken(headers, deps.internalToken)
    const actor = resolveGatewayActor(headers)
    if (!actor) throw new UnauthorizedError('Identidade do gateway ausente')
    if (actor.status !== 'active') throw new ForbiddenError('Conta sem acesso (status)')
    return actor
  }

  // Conta dona, aceitando AMBAS as sessões (perfil → x-auth-account-id; conta → id).
  const accountContext = (headers: Record<string, string | undefined>): string => {
    ensureOrigin(headers)
    const account = headers['x-auth-account-id']?.trim()
    return account && account.length > 0 ? account : (headers['x-auth-user-id'] as string).trim()
  }

  // Gestão: exige sessão da CONTA (sem `pfl`). Sessão de perfil → 403 (área dos pais).
  const requireAccountSession = (headers: Record<string, string | undefined>): string => {
    const actor = ensureOrigin(headers)
    if (headers['x-auth-account-id']?.trim()) {
      throw new ForbiddenError('Gerencie os perfis na área dos pais (saia do perfil primeiro)')
    }
    return actor.id
  }

  return (
    new Elysia({ prefix: '/auth' })
      .get('/profiles', ({ headers }) => deps.listProfiles.execute(accountContext(headers)))
      .post(
        '/profiles',
        async ({ headers, body, request, set }) => {
          if (isOversizeBody(request)) throw new PayloadTooLargeError()
          const accountUserId = requireAccountSession(headers)
          const profile = await deps.createProfile.execute({
            accountUserId,
            name: body.name,
            avatarUrl: body.avatarUrl,
            whatsapp: body.whatsapp,
          })
          set.status = 201
          return { profile }
        },
        { body: CreateProfileBody },
      )
      .patch(
        '/profiles/:id',
        async ({ headers, params, body, request }) => {
          if (isOversizeBody(request)) throw new PayloadTooLargeError()
          const accountUserId = requireAccountSession(headers)
          const profile = await deps.updateProfile.execute({
            accountUserId,
            profileId: params.id,
            name: body.name,
            avatarUrl: body.avatarUrl,
            whatsapp: body.whatsapp,
          })
          return { profile }
        },
        { body: UpdateProfileBody, params: ProfileIdParams },
      )
      .delete(
        '/profiles/:id',
        async ({ headers, params }) => {
          const accountUserId = requireAccountSession(headers)
          await deps.archiveProfile.execute({ accountUserId, profileId: params.id })
          return { archived: true }
        },
        { params: ProfileIdParams },
      )
      // Entrar/trocar de perfil (um clique, sem PIN) — aceita conta OU outra sessão de
      // perfil (trocar de irmão direto). Emite a sessão de perfil (o BFF troca cookies).
      .post(
        '/profiles/:id/select',
        async ({ headers, params, request, server }) => {
          const accountUserId = accountContext(headers)
          return deps.selectProfile.execute({
            accountUserId,
            profileId: params.id,
            userAgent: headers['user-agent'] ?? null,
            ip: clientIp({ request, server, headers }),
          })
        },
        { params: ProfileIdParams },
      )
      // Sair do perfil para a área dos pais — gateado pela SENHA do responsável.
      .post(
        '/profile-session/exit',
        async ({ headers, body, request, server }) => {
          if (isOversizeBody(request)) throw new PayloadTooLargeError()
          ensureOrigin(headers)
          const accountUserId = headers['x-auth-account-id']?.trim()
          if (!accountUserId) throw new ValidationError('Não está em uma sessão de perfil')
          return deps.exitProfileSession.execute({
            accountUserId,
            password: body.password,
            userAgent: headers['user-agent'] ?? null,
            ip: clientIp({ request, server, headers }),
          })
        },
        { body: ExitProfileSessionBody },
      )
  )
}

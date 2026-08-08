import { ValidationError } from '@sistemazero/core/errors'
import { ForbiddenError, UnauthorizedError } from '@sistemazero/core/http'
import { Elysia } from 'elysia'
import type { ArchiveProfileService } from '../../../application/profiles/archive-profile.service'
import type { CreateProfileService } from '../../../application/profiles/create-profile.service'
import type { ExitProfileSessionService } from '../../../application/profiles/exit-profile-session.service'
import type { GetPublicProfileService } from '../../../application/profiles/get-public-profile.service'
import type { ListProfilesService } from '../../../application/profiles/list-profiles.service'
import type { SelectProfileService } from '../../../application/profiles/select-profile.service'
import type { UpdateProfileDetailsService } from '../../../application/profiles/update-profile.service'
import { type AuthContext, isPrivilegedRole, resolveClientIp, resolveGatewayActor } from '../auth'
import {
  CreateProfileBody,
  ExitProfileSessionBody,
  ProfileIdParams,
  UpdateProfileBody,
} from '../dtos'
import { requireInternalToken } from '../internal-auth'

export interface ProfilesRoutesDeps {
  listProfiles: ListProfilesService
  createProfile: CreateProfileService
  updateProfile: UpdateProfileDetailsService
  archiveProfile: ArchiveProfileService
  selectProfile: SelectProfileService
  exitProfileSession: ExitProfileSessionService
  getPublicProfile: GetPublicProfileService
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
  // Devolve o ATOR (id + role) — o role decide o teto de perfis (equipe = ilimitado).
  const requireAccountSession = (headers: Record<string, string | undefined>) => {
    const actor = ensureOrigin(headers)
    if (headers['x-auth-account-id']?.trim()) {
      throw new ForbiddenError('Gerencie os perfis na área dos pais (saia do perfil primeiro)')
    }
    return actor
  }

  // Edição de UM perfil: a CONTA edita qualquer perfil dela; a sessão de PERFIL edita
  // SÓ o próprio (auto-serviço da criança — nome/foto/telefone). O alvo precisa ser o
  // perfil ATIVO (`x-auth-user-id` = sub); editar o perfil de um IRMÃO → 403. Criar/
  // arquivar seguem só da conta (`requireAccountSession`). Devolve o accountUserId dono
  // (o serviço ainda confere `belongsTo`). Espelha o `accountContext`, mas com o trava
  // do "só o próprio" na sessão de perfil.
  const ownProfileEditContext = (
    headers: Record<string, string | undefined>,
    targetProfileId: string,
  ): string => {
    const actor = ensureOrigin(headers)
    const accountId = headers['x-auth-account-id']?.trim()
    if (accountId) {
      if (targetProfileId !== actor.id) {
        throw new ForbiddenError('Você só pode editar o seu próprio perfil')
      }
      return accountId
    }
    return actor.id
  }

  return (
    new Elysia({ prefix: '/auth' })
      .get('/profiles', ({ headers }) => deps.listProfiles.execute(accountContext(headers)))
      .post(
        '/profiles',
        async ({ headers, body, set }) => {
          const actor = requireAccountSession(headers)
          const profile = await deps.createProfile.execute({
            accountUserId: actor.id,
            // Equipe interna (superadmin/admin/staff) cria perfis ILIMITADOS p/ testar.
            privileged: isPrivilegedRole(actor.role),
            name: body.name,
            avatarUrl: body.avatarUrl,
            whatsapp: body.whatsapp,
            // Data de nascimento só entra na CRIAÇÃO pela conta (rota já é parent-only).
            birthDate: body.birthDate,
            // Idem: o opt-in de perfil público na criação é parent-only por construção.
            publicProfileEnabled: body.publicProfileEnabled,
          })
          set.status = 201
          return { profile }
        },
        { body: CreateProfileBody },
      )
      .patch(
        '/profiles/:id',
        async ({ headers, params, body }) => {
          // A criança edita o PRÓPRIO perfil (sessão de perfil); a conta edita qualquer um.
          const accountUserId = ownProfileEditContext(headers, params.id)
          // Data de nascimento é EDITÁVEL SÓ PELOS PAIS (sessão da conta). Numa sessão
          // de perfil (a criança) o gateway injeta `x-auth-account-id` → recusa a alteração.
          if (body.birthDate !== undefined && headers['x-auth-account-id']?.trim()) {
            throw new ForbiddenError('A data de nascimento só pode ser editada pelos responsáveis')
          }
          // Visibilidade pública: idem (segurança infantil — opt-in só dos pais).
          if (body.publicProfileEnabled !== undefined && headers['x-auth-account-id']?.trim()) {
            throw new ForbiddenError(
              'A visibilidade do perfil só pode ser alterada pelos responsáveis',
            )
          }
          const profile = await deps.updateProfile.execute({
            accountUserId,
            profileId: params.id,
            name: body.name,
            avatarUrl: body.avatarUrl,
            whatsapp: body.whatsapp,
            birthDate: body.birthDate,
            publicProfileEnabled: body.publicProfileEnabled,
          })
          return { profile }
        },
        { body: UpdateProfileBody, params: ProfileIdParams },
      )
      .delete(
        '/profiles/:id',
        async ({ headers, params }) => {
          const accountUserId = requireAccountSession(headers).id
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
            // Sessão de impersonação: o gateway injeta o ATOR (claim `act.sub`) como
            // `x-auth-impersonator-id` — propaga o vínculo p/ a sessão de perfil.
            impersonatorUserId: headers['x-auth-impersonator-id']?.trim() || null,
          })
        },
        { params: ProfileIdParams },
      )
      // Sair do perfil para a área dos pais — gateado pela SENHA do responsável.
      .post(
        '/profile-session/exit',
        async ({ headers, body, request, server }) => {
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
      // Identidade PÚBLICA de um perfil (S2S — só `x-internal-token`): nome + flag de
      // visibilidade, p/ o BFF do perfil público kids. NUNCA e-mail/telefone/nascimento/
      // conta. Perfil inexistente/arquivado/privado → 404.
      .get(
        '/internal/profiles/:id/public',
        ({ headers, params }) => {
          requireInternalToken(headers, deps.internalToken)
          return deps.getPublicProfile.execute(params.id)
        },
        { params: ProfileIdParams },
      )
  )
}

import { isUserRole, type UserRole } from '../../domain/user/user.role'
import { isUserStatus, type UserStatus } from '../../domain/user/user.status'

/** Subconjunto do contexto Elysia necessário para resolver o IP de origem. */
export interface AuthContext {
  request: Request
  server: { requestIP(request: Request): { address: string } | null } | null
  headers: Record<string, string | undefined>
}

/** Identidade de quem chama, resolvida dos headers `X-Auth-User-*` do gateway. */
export interface GatewayActor {
  id: string
  role: UserRole
  status: UserStatus
}

/**
 * Resolve o usuário que faz a chamada a partir dos headers `X-Auth-User-*` que o
 * GATEWAY injeta após verificar o JWT (confiáveis — o gateway remove os de entrada,
 * anti-spoof, e só os injeta quando resolve o usuário das claims). Retorna `null`
 * se faltarem campos essenciais ou se papel/status forem inválidos. As rotas admin
 * exigem, além disso, role ∈ {superadmin, admin} (re-checagem na borda).
 */
export function resolveGatewayActor(
  headers: Record<string, string | undefined>,
): GatewayActor | null {
  const id = headers['x-auth-user-id']?.trim()
  const role = headers['x-auth-user-role']?.trim()
  const status = headers['x-auth-user-status']?.trim()
  if (!id || !isUserRole(role) || !isUserStatus(status)) return null
  return { id, role, status }
}

/**
 * Resolve o IP de origem. Atrás de proxy confiável, NUNCA confie na entrada mais
 * à esquerda do `X-Forwarded-For` (forjável pelo cliente): pega a entrada que o
 * proxy confiável anexou — a `trustedProxyHops`-ésima a partir do fim. Fail-closed.
 */
export function resolveClientIp(
  ctx: AuthContext,
  trustProxy: boolean,
  trustedProxyHops: number,
): string {
  const socketIp = ctx.server?.requestIP(ctx.request)?.address ?? ''
  if (!trustProxy) return socketIp

  const forwarded = ctx.headers['x-forwarded-for']
  if (!forwarded) return socketIp

  const chain = forwarded
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
  if (chain.length === 0) return socketIp

  const hops = Math.max(1, trustedProxyHops)
  const idx = chain.length - hops
  // Fail-closed: cadeia mais curta que os hops confiáveis → usa o IP do socket
  // (não-forjável), nunca a entrada mais à esquerda (controlada pelo cliente).
  if (idx < 0) return socketIp
  return chain[idx] ?? socketIp
}

/** Extrai o token de um header `Authorization: Bearer <token>`. */
export function extractBearer(header: string | undefined): string | undefined {
  if (!header || !/^Bearer\s+/i.test(header)) return undefined
  const token = header.replace(/^Bearer\s+/i, '').trim()
  return token.length > 0 ? token : undefined
}

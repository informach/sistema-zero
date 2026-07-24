import { timingSafeEqual } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import { ForbiddenError, UnauthorizedError } from '@sistemazero/core/http'

// Os ids de identidade vão a colunas `uuid` (gamification_profiles.user_id/account_id,
// lesson_progress, course_ratings, …). Validar o FORMATO na borda (como os params em
// dtos.ts) — um id lixo chegaria ao Postgres como 22P02 e viraria 500 em vez de 400.
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

/**
 * Papéis com acesso ao painel admin. O RBAC REAL é do gateway (JWT + `authorize.roles`);
 * aqui conferimos os headers `X-Auth-User-*` confiáveis injetados pelo gateway — defesa
 * em profundidade (o serviço nunca deve ser exposto direto, só atrás do gateway).
 */
const ADMIN_ROLES = new Set(['superadmin', 'admin', 'staff'])

/**
 * Garante que a requisição vem de um admin/staff ativo. Desligada (`requireAdminEnabled=false`,
 * dev fora do gateway) → passa direto. Espelha o `requireAdmin` do catálogo.
 */
export function requireAdmin(
  headers: Record<string, string | undefined>,
  requireAdminEnabled: boolean,
): void {
  if (!requireAdminEnabled) return
  const role = headers['x-auth-user-role']
  if (!role) throw new UnauthorizedError('Autenticação necessária')
  // Status AUSENTE = não-confiável → trata como inativo (o gateway SEMPRE injeta
  // `x-auth-user-status`; a falta dele indica chamada que não passou pela borda).
  const status = headers['x-auth-user-status']
  if (status !== 'active') throw new ForbiddenError('Conta inativa')
  if (!ADMIN_ROLES.has(role)) throw new ForbiddenError('Permissão insuficiente')
}

/**
 * Equipe interna com acesso IRRESTRITO aos cursos (decisão 06/2026): superadmin/
 * admin/staff na área do aluno enxergam TODO curso publicado como se tivessem uma
 * chave-mestra `all_courses` virtual (rascunho continua 404 — mesma régua do aluno).
 * O header `x-auth-user-role` é confiável pelo mesmo motivo do `x-auth-user-id`:
 * o gateway o injeta após verificar o JWT (e o `x-internal-token` prova a origem).
 */
const PRIVILEGED_ROLES = new Set(['superadmin', 'admin', 'staff'])

/** Requisição vem de equipe interna (superadmin/admin/staff)? Status já é `active` (gateway). */
export function isPrivilegedActor(headers: Record<string, string | undefined>): boolean {
  const role = headers['x-auth-user-role']
  return (
    headers['x-auth-user-status'] === 'active' && role !== undefined && PRIVILEGED_ROLES.has(role)
  )
}

/**
 * Identidade confiável do aluno. O gateway VERIFICA o JWT e injeta `x-auth-user-id`
 * (removendo qualquer um de entrada — anti-spoof), então o serviço só lê o header.
 * Em dev/local sem gateway, passe o header manualmente. Ausente → 401.
 */
export function resolveUserId(headers: Record<string, string | undefined>): string {
  const id = headers['x-auth-user-id']
  if (!id || id.trim().length === 0) {
    throw new UnauthorizedError('Identidade ausente (x-auth-user-id)')
  }
  // Trim (como `resolveAccountId`): o id vira chave de DADOS (progresso/XP/conclusões).
  const trimmed = id.trim()
  if (!UUID_RE.test(trimmed)) {
    throw new ValidationError('Identidade inválida (x-auth-user-id não é um uuid)')
  }
  return trimmed
}

/** Identidade OPCIONAL (auditoria leve, colunas `updated_by`): ausente ou
 * inválida → null, nunca lança — a operação não depende do ator. */
export function resolveOptionalUserId(headers: Record<string, string | undefined>): string | null {
  const id = headers['x-auth-user-id']?.trim()
  return id && UUID_RE.test(id) ? id : null
}

/**
 * Conta do responsável para resolver o ACESSO (matrícula/entitlement). Em sessão de
 * PERFIL (estilo Netflix) o gateway injeta `x-auth-account-id` (a conta) ALÉM do
 * `x-auth-user-id` (o perfil de criança, usado para atribuir DADOS — progresso/XP).
 * Ausente (sessão normal da conta / community adulto) → cai no `x-auth-user-id`
 * (a conta É o próprio id), preservando o comportamento atual.
 */
export function resolveAccountId(headers: Record<string, string | undefined>): string {
  const account = headers['x-auth-account-id']
  if (account && account.trim().length > 0) {
    const trimmed = account.trim()
    if (!UUID_RE.test(trimmed)) {
      throw new ValidationError('Conta inválida (x-auth-account-id não é um uuid)')
    }
    return trimmed
  }
  return resolveUserId(headers)
}

/**
 * O gateway URI-encoda valores de header com não-ASCII (`headerSafeValue` —
 * "André" chega como `Andr%C3%A9`). Decodifica de volta; se não for encoding válido,
 * devolve o valor cru (defensivo). Somos o 1º consumidor a LER o nome do aluno.
 */
function decodeHeaderValue(value: string): string {
  if (!value.includes('%')) return value
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * Nome de EXIBIÇÃO confiável do aluno para o certificado (snapshot imutável). Em sessão
 * de PERFIL (kids) o gateway injeta `x-auth-profile-name` (nome da criança); senão usa o
 * `x-auth-user-name` da conta (`firstName lastName`). Ambos URI-encodados pelo gateway.
 * Vazio se nenhum existir (o serviço barra a emissão sem nome).
 */
export function resolveStudentName(headers: Record<string, string | undefined>): string {
  const raw = headers['x-auth-profile-name'] ?? headers['x-auth-user-name'] ?? ''
  return decodeHeaderValue(raw).trim()
}

/** Comparação em tempo constante (evita timing attack no token interno). */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

/**
 * Defesa em profundidade: confirma que a chamada veio do gateway. O gateway injeta
 * `x-internal-token` (header-inject, sobrescrevendo qualquer valor do cliente); o
 * members o exige nas rotas do aluno. Sem `expected` (dev/local sem gateway) → no-op.
 * O `x-auth-user-id` só é confiável porque passou pelo gateway — este token prova isso.
 */
export function assertInternalCaller(
  provided: string | undefined,
  expected: string | undefined,
): void {
  if (!expected) {
    // Sem token configurado: no-op SÓ fora de produção (dev/local sem gateway). Em
    // produção é fail-CLOSED — defesa em profundidade que NÃO depende só do refine do
    // env: um deploy que perdesse o token jamais deve aceitar `X-Auth-*` forjado vindo
    // direto da rede interna (o gateway é a única origem confiável dessas claims).
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedError('Token interno não configurado — chamada rejeitada em produção')
    }
    return
  }
  if (!provided || !safeEqual(provided, expected)) {
    throw new UnauthorizedError('Chamada não autorizada (token interno ausente/inválido)')
  }
}

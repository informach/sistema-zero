/**
 * Configuração de acesso de um `space` (servidor) ou `channel` (canal). Define
 * QUEM enxerga/usa o recurso. Armazenada como `jsonb` (snapshot — sem FK aos
 * cursos/roles de outros serviços).
 *
 * - `public`         → qualquer aluno com conta ativa.
 * - `course_gated`   → quem tem matrícula ativa em ALGUM dos `courses` (slugs no
 *                      members) OU a chave-mestra da audiência (`all_courses` adult,
 *                      `all_kids_courses` kids).
 * - `community_gated`→ quem tem o ACESSO de comunidade de ALGUMA das `communities`
 *                      (chave do produto de comunidade — entitlement `community` no members).
 * - `role_gated`     → quem tem um dos `roles` (RBAC do auth: superadmin/admin/staff/…).
 *
 * No CANAL o `accessConfig` pode ser `null` = HERDA o do space. Quando definido,
 * o veredito do canal é feito em **AND** com o do space (canal só ESTREITA o
 * acesso, nunca amplia — invariante de segurança).
 */
export const VISIBILITIES = ['public', 'course_gated', 'community_gated', 'role_gated'] as const
export type Visibility = (typeof VISIBILITIES)[number]

export interface AccessConfig {
  visibility: Visibility
  /** Slugs de curso (members) quando `visibility = 'course_gated'`. */
  courses: string[]
  /**
   * Chaves de comunidade (produto) quando `visibility = 'community_gated'`. Opcional
   * (configs antigas/literais não têm) — o `normalizeAccessConfig` e o runtime tratam
   * ausência como `[]`. Sempre presente após normalizar na leitura.
   */
  communities?: string[]
  /** Papéis (auth) quando `visibility = 'role_gated'`. */
  roles: string[]
}

/** Acesso público padrão (usado quando o admin não especifica nada). */
export const PUBLIC_ACCESS: AccessConfig = {
  visibility: 'public',
  courses: [],
  communities: [],
  roles: [],
}

/** É um valor de visibilidade conhecido? */
export function isVisibility(v: unknown): v is Visibility {
  return typeof v === 'string' && (VISIBILITIES as readonly string[]).includes(v)
}

/**
 * Normaliza um `accessConfig` recebido na borda: garante arrays e coerência com a
 * `visibility` (course_gated sem cursos / role_gated sem roles seriam acessos
 * impossíveis — quem valida na borda é o DTO; aqui é o saneamento de leitura).
 */
export function normalizeAccessConfig(input: AccessConfig): AccessConfig {
  return {
    visibility: input.visibility,
    courses: input.visibility === 'course_gated' ? [...new Set(input.courses)] : [],
    communities:
      input.visibility === 'community_gated' ? [...new Set(input.communities ?? [])] : [],
    roles: input.visibility === 'role_gated' ? [...new Set(input.roles)] : [],
  }
}

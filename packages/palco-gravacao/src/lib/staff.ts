import { isPrivilegedRole } from '@sistemazero/member-shell/lib/studio-tier'

export interface StaffUser {
  id: string
  email: string
  role: string
}

/** A equipe pelo conteúdo do token; nulo para qualquer outra sessão. */
export function staffFromClaims(payload: Record<string, unknown>): StaffUser | null {
  const { sub, email, role, status, typ, act, kids, pfl } = payload
  if (typ !== undefined && typ !== 'access') return null
  if (typeof sub !== 'string' || typeof role !== 'string' || status !== 'active') return null
  if (act !== undefined || kids !== undefined || pfl !== undefined) return null
  if (!isPrivilegedRole(role)) return null
  return { id: sub, email: typeof email === 'string' ? email : '', role }
}

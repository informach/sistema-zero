import { isPrivilegedRole } from '@sistemazero/member-shell/lib/studio-tier'

export interface StaffUser {
  id: string
  email: string
  role: string
}

/** A equipe pelo conteúdo do token; nulo para qualquer outra sessão. */
export function staffFromClaims(payload: Record<string, unknown>): StaffUser | null {
  const { sub, email, role, status, typ, act, kids, pfl, desktop } = payload
  // Só o token de acesso do auth, nunca outro tipo assinado pela mesma chave.
  if (typ !== 'access') return null
  if (typeof sub !== 'string' || typeof role !== 'string' || status !== 'active') return null
  // Nem impersonação, nem perfil do Kids, nem sessão do aplicativo de computador (cuja revogação
  // o auth confere por outro caminho).
  if (act !== undefined || kids !== undefined || pfl !== undefined || desktop !== undefined)
    return null
  if (!isPrivilegedRole(role)) return null
  return { id: sub, email: typeof email === 'string' ? email : '', role }
}

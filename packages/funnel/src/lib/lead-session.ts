// Sessão do lead via cookie HttpOnly (o servidor confia nele; sobrevive ao SSR
// das páginas /resultado e /checkout). Trabalhamos com Request/Set-Cookie crus
// (em vez da API de cookies do Astro) para manter os handlers testáveis.

export const LEAD_COOKIE = 'funil_lead'
const MAX_AGE = 60 * 60 * 24 * 30 // 30 dias

export function getLeadId(request: Request): string | null {
  const header = request.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    const name = part.slice(0, eq).trim()
    if (name === LEAD_COOKIE) {
      try {
        const value = decodeURIComponent(part.slice(eq + 1).trim())
        return value || null
      } catch {
        return null
      }
    }
  }
  return null
}

export function leadCookie(leadId: string, secure: boolean): string {
  const base = `${LEAD_COOKIE}=${encodeURIComponent(leadId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}`
  return secure ? `${base}; Secure` : base
}

/**
 * Set-Cookie que EXPIRA a sessão do lead (Max-Age=0). Usado na `/obrigado` após a
 * compra: o próximo checkout começa do zero (sem CPF/dados antigos; nome/e-mail/
 * telefone voltam pela URL do pré-checkout).
 */
export function clearLeadCookie(secure: boolean): string {
  const base = `${LEAD_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  return secure ? `${base}; Secure` : base
}

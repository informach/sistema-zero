/**
 * Divide o nome completo (campo único do form) em first/last name. O auth exige
 * ambos com ≥1 char (máx 100). Nome único → lastName placeholder; vazio →
 * fallback. Cópia fiel do `splitName` do funil (mesmo contrato do ensure-buyer).
 */
export function splitName(nome: string | null): { firstName: string; lastName: string } {
  const parts = (nome ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: 'Cliente', lastName: '—' }
  if (parts.length === 1) return { firstName: parts[0]!.slice(0, 100), lastName: '—' }
  return {
    firstName: parts[0]!.slice(0, 100),
    lastName: parts.slice(1).join(' ').slice(0, 100),
  }
}

/** Só dígitos do telefone, ≤20 chars (limite do auth). Vazio → null. */
export function normalizePhone(tel: string | null | undefined): string | null {
  const digits = (tel ?? '').replace(/\D/g, '').slice(0, 20)
  return digits.length > 0 ? digits : null
}

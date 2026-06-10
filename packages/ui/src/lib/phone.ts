// Utilitários de telefone BR — módulo PURO (sem React), compartilhado entre os
// apps (community/admin/funil). Import: `@sistemazero/ui/phone`.
// Convenção do monorepo: o auth guarda o telefone como SÓ DÍGITOS locais
// (DDD + número, 10–11 — é o que o funil grava via ensure-buyer); a máscara é
// só de exibição/digitação.

/** Só os dígitos do valor (remove máscara, espaços e qualquer não-dígito). */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Dígitos do telefone SEM o DDI 55 (12–13 dígitos começando com 55 → remove).
 * Defensivo p/ dado legado gravado em formato livre (ex.: "+55 11 99999-9999").
 */
export function brLocalDigits(value: string): string {
  const digits = phoneDigits(value)
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    return digits.slice(2)
  }
  return digits
}

/** Máscara pt-BR: "(11) 99999-9999" (aceita fixo de 10 dígitos também). */
export function formatTelefone(value: string): string {
  const d = phoneDigits(value).slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

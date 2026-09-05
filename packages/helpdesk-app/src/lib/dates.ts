// São Paulo não tem horário de verão desde 2019; o produto usa o dia operacional UTC-3.
const SP_OFFSET_MS = 3 * 60 * 60_000

/** ISO curto amigável em SP (dd/mm HH:mm) para listas compactas. */
export function formatShortSp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const sp = new Date(date.getTime() - SP_OFFSET_MS)
  const dd = String(sp.getUTCDate()).padStart(2, '0')
  const mm = String(sp.getUTCMonth() + 1).padStart(2, '0')
  const hh = String(sp.getUTCHours()).padStart(2, '0')
  const min = String(sp.getUTCMinutes()).padStart(2, '0')
  return `${dd}/${mm} ${hh}:${min}`
}

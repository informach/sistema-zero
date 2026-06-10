/** Formata centavos (inteiro) em BRL. Dinheiro SEMPRE trafega em centavos. */
export function formatCents(cents: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(cents / 100)
}

/**
 * Formata centavos vindos como STRING (bigint serializado do @sistemazero/payments)
 * em BRL. `Number()` é seguro para valores reais (bem abaixo de MAX_SAFE_INTEGER).
 */
export function formatCentsStr(value: string | number, currency = 'BRL'): string {
  const cents = typeof value === 'number' ? value : Number(value)
  return formatCents(Number.isFinite(cents) ? cents : 0, currency)
}

/** Converte um valor em reais (string "37,00" / "37.00" / number) para centavos inteiros. */
export function reaisToCents(value: string | number): number {
  if (typeof value === 'number') return Math.round(value * 100)
  const normalized = value.trim().replace(/\./g, '').replace(',', '.')
  const num = Number(normalized)
  return Number.isFinite(num) ? Math.round(num * 100) : Number.NaN
}

/** ISO-8601 → data curta pt-BR (ou "—" se ausente). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(d)
}

/** MIME/subtipo → rótulo curto que o aluno entende ("application/pdf" → "PDF"). */
const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: 'PDF',
  zip: 'ZIP',
  'x-zip-compressed': 'ZIP',
  msword: 'DOC',
  'vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'vnd.ms-excel': 'XLS',
  'vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'vnd.ms-powerpoint': 'PPT',
  'vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  plain: 'TXT',
  csv: 'CSV',
  jpeg: 'JPG',
  png: 'PNG',
  webp: 'WEBP',
  gif: 'GIF',
  mpeg: 'MP3',
  mp4: 'MP4',
}

/**
 * Tipo de arquivo AMIGÁVEL p/ exibição nos materiais da aula: o `fileType` do
 * anexo costuma vir como MIME do upload ("application/pdf") — informação
 * interna que confunde o aluno. MIME conhecido vira a sigla usual; desconhecido
 * exibe só o subtipo; texto livre curto do admin passa como veio (maiúsculo).
 */
export function friendlyFileType(value: string | null | undefined): string | null {
  const raw = value?.split(';')[0]?.trim() ?? ''
  if (!raw) return null
  if (!raw.includes('/')) return raw.length <= 8 ? raw.toUpperCase() : raw
  const subtype = raw.split('/')[1]?.toLowerCase() ?? ''
  if (!subtype) return null
  return FILE_TYPE_LABELS[subtype] ?? subtype.replace(/^x-/, '').toUpperCase().slice(0, 8)
}

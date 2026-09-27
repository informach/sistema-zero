/**
 * Cursor de paginação OPACO (base64url de `{t,id}`). Mantém o formato interno
 * escondido do cliente — é o que permite trocar a chave de ordenação sem quebrar
 * contrato. `t` é um timestamp ISO; `id` o desempate.
 *
 * As ordens alternativas da listagem de tópicos (09/2026, filtros do Mural) viajam
 * DENTRO do cursor: `s` diz a ordem que o gerou e `n` carrega as jogadas na ordem
 * `plays`. A ordem padrão (`activity`) continua sem `s`, byte a byte o formato de
 * antes, então cursor emitido antes do deploy segue valendo.
 */
export type CursorSort = 'recent' | 'plays'

export interface CursorPos {
  t: Date
  id: string
  /** Ordem que emitiu o cursor; ausente = a ordem padrão (atividade). */
  s?: CursorSort
  /** Jogadas do último item, só na ordem `plays`. */
  n?: number
}

export function encodeCursor(pos: CursorPos): string {
  const json = JSON.stringify({
    t: pos.t.toISOString(),
    id: pos.id,
    ...(pos.s ? { s: pos.s } : {}),
    ...(pos.s === 'plays' ? { n: pos.n ?? 0 } : {}),
  })
  return Buffer.from(json, 'utf8').toString('base64url')
}

export function decodeCursor(raw: string | undefined): CursorPos | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as {
      t?: unknown
      id?: unknown
      s?: unknown
      n?: unknown
    }
    if (typeof parsed.t !== 'string' || typeof parsed.id !== 'string') return null
    const t = new Date(parsed.t)
    if (Number.isNaN(t.getTime())) return null
    if (parsed.s === undefined) return { t, id: parsed.id }
    if (parsed.s === 'recent') return { t, id: parsed.id, s: 'recent' }
    if (parsed.s === 'plays') {
      const n = parsed.n
      if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 0) return null
      return { t, id: parsed.id, s: 'plays', n }
    }
    return null
  } catch {
    return null
  }
}

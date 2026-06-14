/**
 * Cursor de paginação OPACO (base64url de `{t,id}`). Mantém o formato interno
 * escondido do cliente — é o que permite, no futuro, trocar a chave de ordenação
 * (ou ligar SSE) sem quebrar contrato. `t` é um timestamp ISO; `id` o desempate.
 */
export interface CursorPos {
  t: Date
  id: string
}

export function encodeCursor(pos: CursorPos): string {
  const json = JSON.stringify({ t: pos.t.toISOString(), id: pos.id })
  return Buffer.from(json, 'utf8').toString('base64url')
}

export function decodeCursor(raw: string | undefined): CursorPos | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as {
      t?: unknown
      id?: unknown
    }
    if (typeof parsed.t !== 'string' || typeof parsed.id !== 'string') return null
    const t = new Date(parsed.t)
    if (Number.isNaN(t.getTime())) return null
    return { t, id: parsed.id }
  } catch {
    return null
  }
}

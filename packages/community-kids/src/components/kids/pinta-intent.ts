/**
 * Passagem de bastão Pensa → Pinta (missão de arte, 07/2026): o pensa-client
 * grava o intent em sessionStorage e navega; o pinta-client lê UMA vez e passa
 * `initialIntent` ao adapter (o "Criar novo" abre pré-configurado com o jogo).
 * sessionStorage é por aba: não vaza entre perfis nem sobrevive fechar a aba.
 */
import type { PintaInitialIntent } from '@sistemazero/pinta'

export const PINTA_INTENT_KEY = 'sz:pinta:intent'

const ART_KINDS = new Set(['sprite', 'background', 'tileset'])

/** Lê o intent salvo (sem limpar — o chamador limpa 1x num efeito de mount). */
export function readPintaIntent(): PintaInitialIntent | null {
  try {
    const raw = sessionStorage.getItem(PINTA_INTENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      projectRef?: { id?: unknown; name?: unknown; palette?: unknown }
      artKind?: unknown
    } | null
    const ref = parsed?.projectRef
    if (!ref || typeof ref.id !== 'string' || !ref.id) return null
    if (typeof ref.name !== 'string' || !ref.name.trim()) return null
    // Validação fina (hex/tetos) é do sanitize do Pinta; aqui só o shape.
    const palette = Array.isArray(ref.palette)
      ? ref.palette.filter((c): c is string => typeof c === 'string')
      : []
    const artKind =
      typeof parsed.artKind === 'string' && ART_KINDS.has(parsed.artKind)
        ? (parsed.artKind as 'sprite' | 'background' | 'tileset')
        : undefined
    return {
      projectRef: {
        id: ref.id,
        name: ref.name,
        ...(palette.length > 0 ? { palette } : {}),
      },
      ...(artKind ? { artKind } : {}),
    }
  } catch {
    return null
  }
}

export function clearPintaIntent(): void {
  try {
    sessionStorage.removeItem(PINTA_INTENT_KEY)
  } catch {
    // best-effort
  }
}

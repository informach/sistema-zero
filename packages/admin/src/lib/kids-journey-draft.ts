import type { KidsJourneyPolicy } from '@sistemazero/core/journey'

/**
 * O rascunho da Jornada do Criador guardado na aba quando a lente troca para Adultos (a página
 * redireciona e o estado da tela iria embora). Chave por comunidade; volta quando a Jornada Kids
 * monta de novo e a versão no ar é a mesma em que o rascunho foi feito.
 */
export const KIDS_JOURNEY_DRAFT_KEY = 'sz-admin:journey-draft:kids'

export interface KeptKidsJourneyDraft {
  /** Versão publicada sobre a qual o rascunho foi feito. */
  version: number
  policy: KidsJourneyPolicy
  reason: string
}

type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/** A `sessionStorage` da aba, ou `null` quando o navegador não deixa usar (aba privada, bloqueio). */
export function journeyDraftStorage(): DraftStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

/** Guarda o rascunho. Devolve `false` quando não deu para guardar (sem armazenamento ou cheio). */
export function keepKidsJourneyDraft(
  storage: DraftStorage | null,
  draft: KeptKidsJourneyDraft,
): boolean {
  if (!storage) return false
  try {
    storage.setItem(KIDS_JOURNEY_DRAFT_KEY, JSON.stringify(draft))
    return true
  } catch {
    return false
  }
}

/**
 * Tira o rascunho guardado (lê e apaga, para voltar uma vez só). `null` quando não há nada ou
 * o que há não tem a forma de um rascunho.
 */
export function takeKidsJourneyDraft(storage: DraftStorage | null): KeptKidsJourneyDraft | null {
  if (!storage) return null
  let raw: string | null
  try {
    raw = storage.getItem(KIDS_JOURNEY_DRAFT_KEY)
    storage.removeItem(KIDS_JOURNEY_DRAFT_KEY)
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (
      typeof value === 'object' &&
      value !== null &&
      'version' in value &&
      typeof value.version === 'number' &&
      Number.isSafeInteger(value.version) &&
      'reason' in value &&
      typeof value.reason === 'string' &&
      'policy' in value &&
      typeof value.policy === 'object' &&
      value.policy !== null
    ) {
      // O rascunho pode estar no meio de uma edição que o esquema ainda recusa (o editor mostra
      // o aviso de validação), por isso volta como estava, sem passar pelo `parse`.
      return {
        version: value.version,
        reason: value.reason,
        policy: value.policy as KidsJourneyPolicy,
      }
    }
  } catch {
    // Texto que não é JSON: nada para restaurar.
  }
  return null
}

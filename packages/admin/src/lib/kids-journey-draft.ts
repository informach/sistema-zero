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
    const previous = decodeDraft(storage.getItem(KIDS_JOURNEY_DRAFT_KEY))
    if (previous && previous.version !== draft.version) return false
    storage.setItem(KIDS_JOURNEY_DRAFT_KEY, JSON.stringify(draft))
    return true
  } catch {
    return false
  }
}

/**
 * Consome só o rascunho da versão esperada. Uma base diferente permanece guardada até a
 * pessoa escolher recuperar ou descartar; não pode sumir só porque a versão no ar mudou.
 */
export function takeKidsJourneyDraft(
  storage: DraftStorage | null,
  expectedVersion: number,
): KeptKidsJourneyDraft | null {
  if (!storage) return null
  try {
    const draft = decodeDraft(storage.getItem(KIDS_JOURNEY_DRAFT_KEY))
    if (!draft || draft.version === expectedVersion) storage.removeItem(KIDS_JOURNEY_DRAFT_KEY)
    return draft
  } catch {
    return null
  }
}

function decodeDraft(raw: string | null): KeptKidsJourneyDraft | null {
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

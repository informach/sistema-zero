export const RENOVATION_CAMPAIGN = 'platform-renovation-2026-09'
const prefix = `sz:kids:notice:${RENOVATION_CAMPAIGN}:`
const dismissedInMemory = new Set<string>()

/** Session storage pertence à aba. Nenhuma credencial ou preferência permanente é gravada. */
export function isRenovationDismissed(profileId: string): boolean {
  if (dismissedInMemory.has(profileId)) return true
  try {
    return sessionStorage.getItem(prefix + profileId) === 'dismissed'
  } catch {
    return false
  }
}

export function dismissRenovation(profileId: string): void {
  dismissedInMemory.add(profileId)
  try {
    sessionStorage.setItem(prefix + profileId, 'dismissed')
  } catch {
    // O fechamento continua valendo durante a navegação, mesmo sem storage.
  }
}

/** Chamar só após a seleção bem-sucedida do perfil, antes da navegação de documento. */
export function startRenovationVisit(profileId: string): void {
  dismissedInMemory.delete(profileId)
  try {
    sessionStorage.removeItem(prefix + profileId)
  } catch {
    // Uma seleção continua funcionando com storage indisponível.
  }
}

export function endRenovationVisits(): void {
  dismissedInMemory.clear()
  try {
    const keys = Array.from({ length: sessionStorage.length }, (_, index) =>
      sessionStorage.key(index),
    )
    for (const key of keys) if (key?.startsWith(prefix)) sessionStorage.removeItem(key)
  } catch {
    // Logout e saída para a área dos pais não dependem do storage.
  }
}

export interface ExtensionCompatibilityEntry {
  id: string
  conflictsWith: readonly string[] | undefined
}

/**
 * Retorna o primeiro conflito, verificando os dois lados da relação. A função é
 * pura para ser compartilhada pela UI de instalação e pelas fronteiras de
 * importação/persistência.
 */
export function findExtensionConflict(
  candidate: ExtensionCompatibilityEntry,
  installed: readonly ExtensionCompatibilityEntry[],
): string | undefined {
  return installed.find(
    (entry) =>
      candidate.conflictsWith?.includes(entry.id) === true ||
      entry.conflictsWith?.includes(candidate.id) === true,
  )?.id
}

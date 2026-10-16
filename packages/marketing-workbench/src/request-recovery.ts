/** Preserve the exact unreadable value before starting a fresh request. If storage
 * fails, throw before replacing anything; recovery must never silently discard it. */
export function preserveInvalidRequest(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  key: string,
): string | null {
  const original = storage.getItem(key)
  if (original === null) return null
  const backupKey = `${key}:recovery:${crypto.randomUUID()}`
  storage.setItem(backupKey, original)
  storage.setItem(
    key,
    JSON.stringify({
      instruction: '',
      provider: 'codex',
      intent: 'adjust',
      request: null,
      capability: 'copy',
      protectedIds: [],
    }),
  )
  return original
}

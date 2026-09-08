/** Read local work first. A deep link must never manufacture an empty replacement. */
export async function resumeExistingCreation<T>(
  id: string,
  load: (id: string) => Promise<T | null>,
  restore: ((id: string) => Promise<boolean>) | null,
): Promise<T | null> {
  const local = await load(id)
  if (local) return local
  if (!restore) return null
  await restore(id)
  // A simultaneous local save can make restore decline; reread the authoritative local copy.
  return load(id)
}

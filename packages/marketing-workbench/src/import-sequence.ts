/** Stop only between confirmed operations; an uncertain request keeps its journal identity. */
export async function applyImportSequence<T>(
  entries: readonly T[],
  apply: (entry: T) => Promise<{ status: string; message: string }>,
  stopped: () => boolean,
  progress: (completed: number) => void,
) {
  let completed = 0
  for (const entry of entries) {
    if (stopped()) break
    const result = await apply(entry)
    if (result.status === 'conflict') throw new Error(result.message)
    completed++
    progress(completed)
  }
  return { completed, stopped: completed < entries.length }
}

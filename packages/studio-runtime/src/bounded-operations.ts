/** Keep a small native I/O budget and drain every admitted operation before returning. */
export async function runBoundedOperations<T>(
  items: readonly T[],
  concurrency: number,
  operation: (item: T, index: number) => Promise<void>,
): Promise<void> {
  if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 4)
    throw new Error('Native operation concurrency must be between one and four.')
  let next = 0,
    stopped = false
  const failures: unknown[] = []
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (!stopped) {
        const index = next++
        if (index >= items.length) return
        try {
          await operation(items[index]!, index)
        } catch (error) {
          stopped = true
          failures.push(error)
        }
      }
    }),
  )
  if (failures.length === 1) throw failures[0]
  if (failures.length > 1)
    throw new AggregateError(failures, 'Native operations failed after draining.', {
      cause: failures[0],
    })
}

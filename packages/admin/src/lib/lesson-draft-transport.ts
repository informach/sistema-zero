/** Retire a local continuation without claiming that the server rolled back. The real
 * transport must receive the same signal; a late response remains observed but cannot
 * settle this request again. No timeout or retry identity is invented here. */
export function runLessonDraftRequest<T>(
  signal: AbortSignal,
  operation: () => Promise<T>,
): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason)
  return new Promise<T>((resolve, reject) => {
    let settled = false
    const finish = (commit: () => void) => {
      if (settled) return
      settled = true
      signal.removeEventListener('abort', interrupted)
      commit()
    }
    const interrupted = () => finish(() => reject(signal.reason))
    signal.addEventListener('abort', interrupted, { once: true })
    if (signal.aborted) {
      interrupted()
      return
    }
    try {
      void operation().then(
        (value) => finish(() => resolve(value)),
        (error: unknown) => finish(() => reject(error)),
      )
    } catch (error) {
      finish(() => reject(error))
    }
  })
}

/** Bounds a non-cooperative asynchronous port and retires resources that arrive after cancellation. */
export function awaitWithSignal<Value>(
  operation: () => Promise<Value>,
  signal: AbortSignal,
  retire?: (value: Value) => void,
): Promise<Value> {
  return new Promise<Value>((resolve, reject) => {
    let settled = false
    const abort = () => {
      if (settled) return
      settled = true
      signal.removeEventListener('abort', abort)
      reject(signal.reason)
    }
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) {
      abort()
      return
    }
    Promise.resolve()
      .then(() => {
        signal.throwIfAborted()
        return operation()
      })
      .then(
        (value) => {
          signal.removeEventListener('abort', abort)
          if (settled || signal.aborted) {
            // Cleanup callbacks must request disposal without blocking the cancelled operation.
            try {
              retire?.(value)
            } catch {
              /* The operation already rejected with the original reason. */
            }
            if (!settled) {
              settled = true
              reject(signal.reason)
            }
            return
          }
          settled = true
          resolve(value)
        },
        (error) => {
          signal.removeEventListener('abort', abort)
          if (!settled) {
            settled = true
            reject(error)
          }
        },
      )
  })
}

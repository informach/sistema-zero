/** Controlled I/O boundary for lifecycle tests; no timer or production test hook. */
export function deferred<T = void>() {
  let resolve: ((value: T | PromiseLike<T>) => void) | undefined
  let reject: ((reason?: unknown) => void) | undefined
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  if (!resolve || !reject) throw new Error('Promise executor did not run synchronously')
  return { promise, resolve, reject }
}

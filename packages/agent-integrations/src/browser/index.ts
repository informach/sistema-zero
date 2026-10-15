declare const ZERO_BROWSER_WORKER: string | undefined

export * from './schema'
export function browserWorkerUrl() {
  return new URL(
    typeof ZERO_BROWSER_WORKER === 'undefined' ? './browser-worker.ts' : ZERO_BROWSER_WORKER,
    import.meta.url,
  )
}

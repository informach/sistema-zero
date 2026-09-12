import { retryAfterMs } from '../../lib/retry-after'

let workerReady = false
export async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist')
  if (!workerReady) {
    pdfjs.GlobalWorkerOptions.workerPort = new Worker(
      new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url),
      { type: 'module' },
    )
    workerReady = true
  }
  return pdfjs
}

export async function fetchPdf(url: string, signal: AbortSignal): Promise<Response> {
  let response = await fetch(url, { signal })
  if (response.status === 503) {
    await new Promise<void>((resolve, reject) => {
      if (signal.aborted) {
        reject(signal.reason)
        return
      }
      const abort = () => {
        clearTimeout(timer)
        reject(signal.reason)
      }
      const timer = setTimeout(
        () => {
          signal.removeEventListener('abort', abort)
          resolve()
        },
        retryAfterMs(response.headers.get('retry-after')),
      )
      signal.addEventListener('abort', abort, { once: true })
    })
    response = await fetch(url, { signal })
  }
  if (!response.ok) throw new Error('O material não está disponível agora. Tente novamente.')
  return response
}

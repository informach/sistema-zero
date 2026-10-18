import { awaitWithSignal } from '@sistemazero/core/http'
import {
  studioPythonDeploymentRoute,
  studioPythonRuntimeRoute,
} from '@sistemazero/core/studio/python-runtime-distribution'
import { createPythonBootResourceManifest } from './bootResourceManifest'
import { createPythonBootResourceStore, type PythonBootCacheStorage } from './bootResourceStore'
import { readPythonWebBytes } from './webFiles'

const metadataBytes = 2 * 1024 * 1024

/** The caller has already approved this frame and pin; neither comes from a child message. */
export function pythonBootResourceURLs(frameURL: URL, expectedRuntimeHash: string) {
  const frame = new URL(frameURL.href)
  if (
    !/^[a-f0-9]{64}$/.test(expectedRuntimeHash) ||
    frame.username ||
    frame.password ||
    frame.search ||
    frame.hash ||
    frame.href.length > 2048 ||
    (frame.protocol !== 'https:' &&
      !(
        frame.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(frame.hostname)
      )) ||
    !['frame.html', 'analysis.html'].includes(frame.pathname.split('/').at(-1) ?? '')
  )
    throw new Error('Endereço de boot Python não autorizado.')
  const directory = new URL('./', frame)
  if (directory.pathname === studioPythonRuntimeRoute(expectedRuntimeHash))
    return {
      directory,
      metadataURL: new URL(studioPythonDeploymentRoute(expectedRuntimeHash), frame.origin),
    }
  if (directory.pathname.endsWith(`/runtime/${expectedRuntimeHash}/`))
    return { directory, metadataURL: new URL('../../runtime-deployment.json', directory) }
  throw new Error('O endereço não pertence à distribuição Python esperada.')
}

/** Public immutable metadata only. This does not grant catalog approval or execution authority. */
export async function preparePythonBootResourceHost(options: {
  frameURL: URL
  runtimeManifestSha256: string
  signal: AbortSignal
  cacheStorage?: PythonBootCacheStorage
  request?(url: URL, init: RequestInit): Promise<Response>
}) {
  const hash = options.runtimeManifestSha256
  const { directory, metadataURL } = pythonBootResourceURLs(options.frameURL, hash)
  const { signal } = options
  const request = options.request ?? globalThis.fetch.bind(globalThis)
  const cacheStorage = options.cacheStorage ?? globalThis.caches
  signal.throwIfAborted()
  if (!cacheStorage) throw new Error('O navegador não oferece armazenamento de boot Python.')
  const retireResponse = (response: Response) => {
    // Revocation already rejected preparation. Request cleanup without waiting for a network ACK;
    // a late cancellation rejection must not replace the owner's original withdrawal reason.
    void response.body?.cancel(signal.reason).catch(() => {})
  }
  return awaitWithSignal(async () => {
    const response = await awaitWithSignal(
      () =>
        request(metadataURL, {
          credentials: 'omit',
          redirect: 'error',
          referrerPolicy: 'no-referrer',
          signal,
        }),
      signal,
      retireResponse,
    )
    if (signal.aborted) {
      retireResponse(response)
      signal.throwIfAborted()
    }
    const bytes = await readPythonWebBytes(response, metadataBytes, signal)
    const raw: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    const manifest = await createPythonBootResourceManifest(raw, hash)
    signal.throwIfAborted()
    const store = createPythonBootResourceStore({
      directory,
      manifest,
      cacheStorage,
      fetch: request,
    })
    return { manifest, store }
  }, signal)
}

// Preload do bun test (ver bunfig.toml): registra um DOM global via happy-dom
// e o cleanup do Testing Library entre testes — mesmo modelo do packages/pensa.
import { GlobalRegistrator } from '@happy-dom/global-registrator'

// IndexedDB clones native Blobs. The DOM shim's Blob becomes an ordinary object
// under Bun's structuredClone; keep the binary producer and its Blob coherent.
const platformBlob = globalThis.Blob
const platformResponse = globalThis.Response
GlobalRegistrator.register()
globalThis.Blob = platformBlob
globalThis.Response = platformResponse
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const { cleanup } = await import('@testing-library/react')
const { afterEach } = await import('bun:test')
afterEach(cleanup)

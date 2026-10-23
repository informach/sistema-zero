// Preload do bun test (ver bunfig.toml): registra um DOM global via happy-dom
// e o cleanup do Testing Library entre testes — mesmo modelo do packages/pinta.
import { GlobalRegistrator } from '@happy-dom/global-registrator'

// Desktop is the primary authoring/test viewport; compact behavior has explicit browser coverage.
GlobalRegistrator.register({ width: 1366, height: 768 })
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const { cleanup, configure } = await import('@testing-library/react')
// Integration tests use real workers and IndexedDB. Their cold starts can exceed
// Testing Library's 1 s default under the full suite; Bun still bounds each test at 20 s.
configure({ asyncUtilTimeout: 5000 })
const { afterEach } = await import('bun:test')
afterEach(cleanup)

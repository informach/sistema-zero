// Preload do bun test (ver bunfig.toml): registra um DOM global via happy-dom
// e o cleanup do Testing Library entre testes — mesmo modelo do packages/studio.
import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const { cleanup } = await import('@testing-library/react')
const { afterEach } = await import('bun:test')
afterEach(cleanup)

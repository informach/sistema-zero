import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const { cleanup } = await import('@testing-library/react')
const { afterEach } = await import('bun:test')
afterEach(cleanup)

/**
 * O mascote Zappy animado (Rive) fora dos testes: o `dynamic(ssr:false)` resolve
 * mesmo no happy-dom, o runtime tenta buscar `/rive/rive.wasm` — que nenhum servidor
 * serve aqui — e cada suíte que monta uma celebração cospe
 * `Aborted(both async and sync fetching of the wasm failed)`. Nada QUEBRA (é
 * exatamente o caminho de falha que devolve o WebP, e ver isso funcionando foi
 * tranquilizador), mas é ruído por cima de toda saída e trabalho jogado fora.
 *
 * ⚠️ O que fica de fora é só o CANVAS. O `KidsMascotAnimated` — fallback, `key` por
 * pose, régua evento × estado — segue sendo exercitado de verdade em
 * `tests/mascot-rive.test.tsx`; o que não dá para testar daqui é o desenho, que
 * precisa de WebGL e mora no e2e.
 */
const { mock } = await import('bun:test')
mock.module('./src/components/kids/mascot-rive-canvas', () => ({
  MascotRiveCanvas: () => null,
  aquecerRuntimeRive: () => {},
}))

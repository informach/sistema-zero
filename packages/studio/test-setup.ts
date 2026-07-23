// Preload do bun test (ver bunfig.toml): registra um DOM global via happy-dom
// (substitui o `environment: 'jsdom'` do vitest no repo de origem) e o cleanup
// do Testing Library entre testes.
import { GlobalRegistrator } from '@happy-dom/global-registrator'

// ⚠️ NÃO deixe o happy-dom NAVEGAR/CARREGAR páginas de iframe. Vários testes
// renderizam `<iframe src="http://…">` (ProPreview aponta p/ um dev-server falso
// `fake.webcontainer.dev`, o preview do jogo tem srcdoc, etc.). Se o page-loading
// do iframe fica ligado, o happy-dom dispara um `fetch()` REAL da URL do iframe
// que rejeita ASSÍNCRONO (ECONNREFUSED) DEPOIS do teste que o criou — e a rejeição
// não-tratada cai no teste que estiver rodando na hora (visto em CI Linux atribuído
// ao NewProjectModal, um espectador inocente). Desligar o carregamento corta a rede
// na raiz; os testes só leem o atributo `src`, nunca o conteúdo carregado.
GlobalRegistrator.register({ settings: { disableIframePageLoading: true } })
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const { cleanup } = await import('@testing-library/react')
const { afterEach } = await import('bun:test')
afterEach(cleanup)

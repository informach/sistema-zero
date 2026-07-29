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

// ⚠️ Os RUNTIMES dos jogos (game-2d/3d + advanced + world-3d) são código que RODA
// dentro do iframe do preview e por design DONO do document.body: eles injetam no
// `document.body`/`<head>` GLOBAL um canvas de palco (`#tela`/`[data-sz-game-2d-stage]`),
// regiões vivas de acessibilidade (`<p role="status" id="sz-game-…">`) e `<style>`
// de foco (`#sz-game-…-focus-style`). Nos testes, o happy-dom tem UM document
// compartilhado por todo o processo — o `cleanup()` da testing-library só remove os
// containers que ELA renderizou, então esses nós VAZAM p/ os testes seguintes. O
// sintoma clássico: um teste posterior faz `getByRole('status')` e recebe
// "Found multiple elements with the role status" (o aviso do próprio componente + o
// `sz-game-…` órfão) — flake não-determinística de CI, dependente da ordem dos testes
// (visto atribuído ao NewProjectModal). Varre os artefatos por PREFIXO de id (cobre
// todos os runtimes) + o canvas de palco. Espelha o fix de `disableIframePageLoading`
// acima: poluição do document GLOBAL curada na camada de setup.
afterEach(() => {
  for (const node of document.querySelectorAll(
    '[id^="sz-game"], canvas[data-sz-game-2d-stage], canvas#tela',
  )) {
    node.remove()
  }
})

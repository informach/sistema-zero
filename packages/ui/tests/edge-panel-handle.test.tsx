import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { EdgePanelHandle } from '../src/components/ui/edge-panel-handle'

describe('EdgePanelHandle', () => {
  test('menu esquerdo fechado fica na borda da tela e anuncia a ação', () => {
    const html = renderToStaticMarkup(
      <EdgePanelHandle
        side="left"
        open={false}
        openOffset="var(--kids-menu-width)"
        label="Mostrar menu"
        controlsId="kids-app-sidebar"
        onToggle={() => {}}
      />,
    )
    expect(html).toContain('aria-label="Mostrar menu"')
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('aria-controls="kids-app-sidebar"')
    expect(html).toContain('data-side="left"')
    expect(html).toContain('left:0')
    expect(html).not.toContain('title=')
  })

  test('menu esquerdo aberto acompanha a largura real do painel', () => {
    const html = renderToStaticMarkup(
      <EdgePanelHandle
        side="left"
        open
        openOffset="var(--kids-menu-width)"
        label="Esconder menu"
        controlsId="kids-app-sidebar"
        onToggle={() => {}}
      />,
    )
    expect(html).toContain('left:var(--kids-menu-width)')
    expect(html).toContain('aria-pressed="false"')
    expect(html).toContain('data-open="true"')
  })

  test('lista direita aberta acompanha sua largura e espelha o formato da alça', () => {
    const html = renderToStaticMarkup(
      <EdgePanelHandle
        side="right"
        open
        openOffset="var(--lesson-outline-width)"
        label="Esconder lista de aulas"
        controlsId="kids-lesson-outline"
        onToggle={() => {}}
      />,
    )
    expect(html).toContain('right:var(--lesson-outline-width)')
    expect(html).toContain('aria-controls="kids-lesson-outline"')
    expect(html).toContain('data-side="right"')
    expect(html).toContain('rounded-l-xl')
  })

  test('lista direita fechada permanece disponível na borda da tela', () => {
    const html = renderToStaticMarkup(
      <EdgePanelHandle
        side="right"
        open={false}
        openOffset="var(--lesson-outline-width)"
        label="Mostrar lista de aulas"
        controlsId="adult-lesson-outline"
        onToggle={() => {}}
      />,
    )
    expect(html).toContain('right:0')
    expect(html).toContain('aria-controls="adult-lesson-outline"')
    expect(html).toContain('aria-label="Mostrar lista de aulas"')
  })
})

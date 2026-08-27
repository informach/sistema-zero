import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, render } from '@testing-library/react'

/**
 * Contrato de LAYOUT do `MainContainer` para apps embarcados (full review
 * 26/08): "app embarcado NÃO rola a janela" só se prova em browser (happy-dom
 * não faz layout), mas as CLASSES são o mecanismo — e classe some em limpeza
 * sem ninguém perceber. Trava:
 *  - o regime de altura das rotas embarcadas (mobile calc + `md:h-dvh` +
 *    `md:min-h-[36rem]` + `overflow-hidden`) — sem o min-height, janela
 *    desktop < ~560px CLIPA o pé do app (a barra de seleção do Pinta ficava
 *    inalcançável, medido em 500px);
 *  - o ramo normal SEM o regime (páginas comuns rolam a janela, como sempre);
 *  - o PAR main ↔ frames: o `md:min-h-[36rem]` do main = piso `min-h-[34rem]`
 *    dos frames + 2rem de `md:py-4` — mexeu num, mexa no outro.
 *
 * ⚠️ `mock.module` não é isolado por arquivo no bun: o mock ESPALHA o módulo
 * atual (receita do focus-mode.test.tsx) para nenhum outro arquivo perder
 * export.
 */
const nav = await import('next/navigation')
let pathname = '/pinta'
mock.module('next/navigation', () => ({
  ...nav,
  usePathname: () => pathname,
}))

const { MainContainer } = await import('../src/components/kids/main-container')
const { FocusModeProvider } = await import('../src/components/kids/focus-mode')
const { EMBEDDED_APP_FRAME, EMBEDDED_STUDIO_FRAME } = await import(
  '../src/components/kids/embedded-app-loading'
)

/** happy-dom não implementa `matchMedia`; o FocusModeToggle (dentro do main) usa. */
Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
})

afterEach(cleanup)

function mainFor(path: string): HTMLElement {
  pathname = path
  const { container } = render(
    <FocusModeProvider viewerId="perfil-teste">
      <MainContainer>
        <div>conteudo</div>
      </MainContainer>
    </FocusModeProvider>,
  )
  const main = container.querySelector('main')
  if (!main) throw new Error('main não renderizou')
  return main
}

describe('MainContainer: regime de altura dos apps embarcados', () => {
  it('rota embarcada trava a altura (mobile calc + md:h-dvh + piso md:min-h-[36rem])', () => {
    for (const path of ['/pinta', '/estudio', '/estudio/pro/abc', '/pensa']) {
      const main = mainFor(path)
      const cls = main.className
      expect(cls).toContain('h-[calc(100dvh-3.5rem)]')
      expect(cls).toContain('md:h-dvh')
      expect(cls).toContain('md:min-h-[36rem]')
      expect(cls).toContain('md:flex-none')
      expect(cls).toContain('overflow-hidden')
      expect(cls).toContain('min-h-0')
      cleanup()
    }
  })

  it('página comum fica FORA do regime (a janela rola, como sempre)', () => {
    const main = mainFor('/perfil')
    expect(main.className).toContain('max-w-5xl')
    expect(main.className).toContain('flex-1')
    expect(main.className).not.toContain('overflow-hidden')
    expect(main.className).not.toContain('md:h-dvh')
  })

  it('o PAR main ↔ frames: os dois frames carregam o piso min-h-[34rem] + overflow-hidden', () => {
    // 34rem (frame) + 2rem (md:py-4 do main) = o md:min-h-[36rem] travado acima.
    for (const frame of [EMBEDDED_APP_FRAME, EMBEDDED_STUDIO_FRAME]) {
      expect(frame).toContain('min-h-[34rem]')
      expect(frame).toContain('flex-1')
      expect(frame).toContain('overflow-hidden')
    }
  })
})

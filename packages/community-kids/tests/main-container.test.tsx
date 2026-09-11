import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, render } from '@testing-library/react'

/**
 * Contrato de LAYOUT do `MainContainer` para apps embarcados. "App embarcado NÃO rola a
 * janela" e "é de borda a borda" só se provam em browser (happy-dom não faz layout), mas
 * as CLASSES são o mecanismo — e classe some em limpeza sem ninguém perceber. Trava:
 *  - o regime de altura das rotas embarcadas (mobile calc + `md:h-dvh` + `md:min-h-[34rem]`
 *    + `overflow-hidden`) — sem o min-height, janela desktop < ~544px CLIPA o pé do app;
 *  - BORDA A BORDA (07/09/2026): nenhum padding lateral/superior, nenhuma calha, nenhum
 *    puxador dentro do <main> — o botão do menu e o selo vivem na barra da ferramenta;
 *  - o ramo normal SEM o regime (páginas comuns rolam a janela, como sempre);
 *  - o PAR main ↔ frames: `md:min-h-[34rem]` do main = piso `min-h-[34rem]` dos frames + zero
 *    de padding — mexeu num, mexa no outro;
 *  - o Molda no MESMO regime desde o lote 6b (11/09/2026): a calha e o puxador saíram.
 *
 * ⚠️ `mock.module` não é isolado por arquivo no bun: o mock ESPALHA o módulo atual (receita
 * do focus-mode.test.tsx) para nenhum outro arquivo perder export.
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

/** happy-dom não implementa `matchMedia`; o FocusModeProvider usa. */
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

const EMBEDDED = ['/pinta', '/estudio', '/estudio/pro/abc', '/pensa', '/molda']

describe('MainContainer: regime de altura + borda a borda dos apps embarcados', () => {
  it('rota embarcada trava a altura e fica de borda a borda (sem padding, calha ou puxador)', () => {
    for (const path of EMBEDDED) {
      const main = mainFor(path)
      const cls = main.className.split(' ')
      for (const token of [
        'flex',
        'h-[calc(100dvh-3.5rem)]',
        'min-h-0',
        'w-full',
        'flex-col',
        'overflow-hidden',
        'pb-24',
        'md:h-dvh',
        'md:min-h-[34rem]',
        'md:flex-none',
        'md:pb-0',
      ]) {
        expect(cls).toContain(token)
      }
      for (const token of [
        'relative',
        'px-2',
        'pt-4',
        'md:py-4',
        'md:pr-4',
        'md:pl-9',
        'md:min-h-[36rem]',
      ]) {
        expect(cls).not.toContain(token)
      }
      // Nenhum padding de topo/lado (só o `pb-*` do mobile é permitido).
      expect(cls.filter((t) => /^(md:)?p[xytlr]-/.test(t))).toEqual([])
      // O puxador saiu do host: o botão do menu mora na barra da ferramenta.
      expect(main.querySelector('button')).toBeNull()
      cleanup()
    }
  })

  it('página comum fica FORA do regime (a janela rola, como sempre)', () => {
    const main = mainFor('/perfil')
    expect(main.className).toContain('flex-1')
    expect(main.className).not.toContain('overflow-hidden')
    expect(main.className).not.toContain('md:h-dvh')
  })

  it('página comum é em FAIXAS: largura toda e ZERO padding lateral', () => {
    // O `max-w-5xl` que travava aqui não sumiu, desceu um nível: quem centraliza
    // na largura de leitura agora é a `KidsBand` de cada seção (mesmo
    // `mx-auto w-full max-w-5xl px-4 md:px-8`). O <main> precisa ser mais LARGO que
    // o texto para a cor da faixa sangrar até a borda — é a mudança estrutural do
    // redesenho de 09/2026, e é a única razão pela qual a régua saiu daqui.
    const main = mainFor('/perfil')
    expect(main.className).toContain('w-full')
    expect(main.className).not.toContain('max-w-5xl')
    expect(main.className).not.toContain('mx-auto')
    // Nenhum padding lateral nem de topo: só o `pb-*` que reserva a barra de abas.
    const cls = main.className.split(' ')
    expect(cls.filter((t) => /^(md:)?p[xytlr]?-/.test(t) && !t.includes('pb-'))).toEqual([])
  })

  it('a AULA guarda o padding: ela não foi convertida em faixas', () => {
    const main = mainFor('/cursos/meu-curso/aulas/aula-1')
    expect(main.className).toContain('w-full')
    // Fundo LISO (telas-modelo de 11/09/2026): a textura de pontinhos saiu.
    expect(main.className).not.toContain('kids-field')
    // A PELE da aula (fundo azul-claro + cartas brancas) pende inteira deste gancho:
    // a aula é do member-shell e o kids só a veste por CSS a partir daqui.
    expect(main.className).toContain('kids-aula')
    expect(main.className).toContain('px-4')
    expect(main.className).not.toContain('max-w-5xl')
  })

  it('o PAR main ↔ frames: os dois frames carregam o piso min-h-[34rem] + overflow-hidden', () => {
    // 34rem (frame) + 0 de padding = o md:min-h-[34rem] travado acima.
    for (const frame of [EMBEDDED_APP_FRAME, EMBEDDED_STUDIO_FRAME]) {
      expect(frame).toContain('min-h-[34rem]')
      expect(frame).toContain('flex-1')
      expect(frame).toContain('overflow-hidden')
    }
  })
})

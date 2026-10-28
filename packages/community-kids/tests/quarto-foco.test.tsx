import { afterAll, afterEach, describe, expect, it, mock } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cleanup, render, screen } from '@testing-library/react'

/**
 * O Quarto e o configurador de avatar entraram no modo foco em 19/09/2026: o menu da esquerda
 * nasce recolhido e o shell desenha uma única alça presa à borda. Aqui ficam as duas pontas
 * que os testes de régua (`focus-route`, `focus-mode`, `main-container`) não alcançam: a alça
 * funcionar com o cabeçalho do Quarto e a faixa dele ocupar a área toda.
 *
 * ⚠️ `mock.module` não é isolado por arquivo no bun: espalhar o módulo atual é a receita do
 * `focus-mode.test.tsx`, para nenhum outro arquivo perder export.
 */
const source = (relativePath: string) =>
  readFileSync(resolve(import.meta.dir, '..', relativePath), 'utf8')

const nav = await import('next/navigation')
let pathname = '/quarto'
mock.module('next/navigation', () => ({ ...nav, usePathname: () => pathname }))

const { FocusModeProvider } = await import('../src/components/kids/focus-mode')
const { FocusModeToggle } = await import('../src/components/kids/focus-mode-toggle')
const { QUARTO_FAIXA, QuartoHeader } = await import('../src/app/(app)/quarto/quarto-header')

const matchMediaOriginal = Object.getOwnPropertyDescriptor(window, 'matchMedia')
function setViewportWidth(width: number) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => {
      const min = /\(min-width:\s*(\d+)px\)/.exec(query)
      return {
        matches: min ? width >= Number(min[1]) : false,
        addEventListener: () => {},
        removeEventListener: () => {},
      }
    },
  })
}
afterAll(() => {
  if (matchMediaOriginal) Object.defineProperty(window, 'matchMedia', matchMediaOriginal)
  else Reflect.deleteProperty(window, 'matchMedia')
})
afterEach(cleanup)

function renderHeader() {
  return render(
    <FocusModeProvider viewerId="perfil-1">
      <QuartoHeader />
      <FocusModeToggle target="nav" />
    </FocusModeProvider>,
  )
}

describe('o Quarto no shell Kids', () => {
  it('traz uma única alça de mostrar o menu, que nasce recolhido', () => {
    pathname = '/quarto'
    setViewportWidth(1280)
    renderHeader()
    expect(screen.getByRole('button', { name: 'Mostrar menu' })).toBeDefined()
    expect(screen.getAllByRole('button', { name: 'Mostrar menu' })).toHaveLength(1)
    // A seta de volta ao Meu espaço continua lá: a alça do menu não a substitui.
    expect(screen.getByRole('link', { name: /Meu espaço/i })).toBeDefined()
  })

  it('no celular o botão some: lá a barra da esquerda nem existe', () => {
    pathname = '/quarto'
    setViewportWidth(390)
    renderHeader()
    expect(screen.queryByRole('button', { name: 'Mostrar menu' })).toBeNull()
  })
})

describe('o configurador de avatar dentro do layout', () => {
  // O componente monta three/fiber e um `<Canvas>`: happy-dom não tem WebGL, então o que dá
  // para travar aqui é a MARCAÇÃO. E é justamente ela o mecanismo.
  it('é imersivo no celular e entra no fluxo a partir do `md`, nos DOIS ramos', () => {
    const configurator = source(
      '../member-shell/src/components/cosmetics/avatar3d/configurator.tsx',
    )
    const client = source(
      '../member-shell/src/components/cosmetics/avatar3d/configurator-client.tsx',
    )
    const raiz =
      'fixed inset-0 z-50 flex flex-col bg-background md:static md:z-auto md:h-full md:min-h-0 md:flex-1'

    expect(configurator).not.toContain('<FocusModeToggle target="nav" />')
    expect(source('src/app/(app)/layout.tsx')).toContain('<FocusModeToggle target="nav" />')
    // ⚠️⚠️ O par é load-bearing e foi MEDIDO. Em fluxo no celular, o painel de baixo mede a
    // JANELA (`max-h-[26vh]`) enquanto a caixa perdeu 152px para a barra de cima e a de abas:
    // a cena 3D, que é `flex-1` sem piso, encolhia a ~66px sem erro nenhum — e a foto do avatar
    // é um recorte do canvas escalado para 512², então ela passaria a ser salva BORRADA a partir
    // do celular. Sem o `md:static`, o desktop perderia o menu de vista.
    const ramos = configurator.split(raiz).length - 1
    expect(ramos).toBe(2)
    // O esqueleto do `dynamic` segue a mesma regra, senão cobre a barra enquanto o 3D carrega.
    expect(client).toContain('md:static')
    expect(client).toContain('fixed inset-0 z-50')
  })

  it('a página mora no grupo `(app)`: é o que faz existir um menu para mostrar', () => {
    expect(() => source('src/app/(app)/meu-avatar/page.tsx')).not.toThrow()
    expect(() => source('src/app/meu-avatar/page.tsx')).toThrow()
  })
})

describe('o quarto ocupa a área toda, como o avatar', () => {
  it('a página e o esqueleto usam a MESMA faixa, sem o teto de largura das outras páginas', () => {
    // 27/10/2026, pedido dela: o quarto cresce até onde a tela deixa e só encolhe quando o menu
    // abre. A régua de largura das páginas (73,25rem) e a regra da faixa de foco saíram.
    expect(QUARTO_FAIXA).toContain('max-w-none')
    for (const arquivo of ['src/app/(app)/quarto/page.tsx', 'src/app/(app)/quarto/loading.tsx']) {
      const texto = source(arquivo)
      // ⚠️ O esqueleto com outra faixa faria a página saltar quando os dados chegam.
      expect(texto).toContain('innerClassName={QUARTO_FAIXA}')
      expect(texto).not.toContain('className="kids-band-foco"')
    }
    // Ninguém mais usa a regra; se ela voltasse, prenderia o quarto em 73,25rem + o menu.
    expect(source('src/app/globals.css')).not.toContain('.kids-band-foco')
  })
})

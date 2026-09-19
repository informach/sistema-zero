import { afterAll, afterEach, describe, expect, it, mock } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cleanup, render, screen } from '@testing-library/react'

/**
 * O Quarto e o configurador de avatar entraram no modo foco em 19/09/2026: o menu da esquerda
 * nasce recolhido e o shell desenha uma única alça presa à borda. Aqui ficam as duas pontas
 * que os testes de régua (`focus-route`, `focus-mode`, `main-container`) não alcançam: a alça
 * funcionar com o cabeçalho do Quarto e a faixa dele crescer quando o menu some.
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
const { QuartoHeader } = await import('../src/app/(app)/quarto/quarto-header')

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
    const configurator = source('src/components/kids/avatar3d/configurator.tsx')
    const client = source('src/components/kids/avatar3d/configurator-client.tsx')
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

describe('a faixa de foco aproveita o espaço do menu recolhido', () => {
  it('as DUAS faixas do quarto levam a classe, na página e no esqueleto', () => {
    // Só o palco crescendo deixaria o cabeçalho 134px indentado em relação à borda do quarto; e
    // o esqueleto sem a classe faria a página saltar 268px de largura quando os dados chegam.
    for (const arquivo of ['src/app/(app)/quarto/page.tsx', 'src/app/(app)/quarto/loading.tsx']) {
      const texto = source(arquivo)
      // ⚠️ Pelo ATRIBUTO, nunca pelo nome solto: os dois arquivos citam a classe em comentário,
      // então `toContain('kids-band-foco')` passaria com o `className` apagado.
      expect(texto.split('className="kids-band-foco"').length - 1).toBe(2)
    }
  })

  it('o CSS lê o estado pelo `aria-hidden` da barra, e FORA de camada', () => {
    const css = source('src/app/globals.css')
    const regra = '.kids-shell-row:has(aside.kids-menu[aria-hidden="true"]) .kids-band-foco > div'
    expect(css).toContain(regra)
    expect(css).toContain('max-width: calc(73.25rem + var(--kids-menu-width))')
    // Sem a transição, a faixa salta de largura no meio da animação de 300ms da barra.
    expect(css).toContain('transition: max-width 0.3s ease-in-out')

    // ⚠️⚠️ A CAMADA é o modo de falha desta casa: "CSS sem camada vence QUALQUER camada,
    // inclusive `@layer utilities`". A régua que esta regra precisa derrotar é a utilitária
    // `max-w-[73.25rem]` do `KidsBand`. Dentro de `@layer components` a regra seria emitida,
    // legível e MUDA — a faixa nunca cresceria, sem erro nenhum. Contamos as camadas ABERTAS
    // antes da regra: tem de ser zero.
    const antes = css.slice(0, css.indexOf(regra))
    const abre = (antes.match(/@layer [a-z, ]+\{/g) ?? []).length
    const fecha = contarFechamentosDeCamada(antes)
    expect(abre).toBe(fecha)
  })
})

/** Quantos `@layer … {` já fecharam em `texto`, contando chaves de verdade. */
function contarFechamentosDeCamada(texto: string) {
  let fechadas = 0
  let i = 0
  for (const abertura of texto.matchAll(/@layer [a-z, ]+\{/g)) {
    i = (abertura.index ?? 0) + abertura[0].length
    let profundidade = 1
    while (i < texto.length && profundidade > 0) {
      if (texto[i] === '{') profundidade += 1
      else if (texto[i] === '}') profundidade -= 1
      i += 1
    }
    if (profundidade === 0) fechadas += 1
  }
  return fechadas
}

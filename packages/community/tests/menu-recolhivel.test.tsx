import { describe, expect, mock, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'

/**
 * O menu da esquerda com a alça de esconder e mostrar, e o Meu espaço 3D ocupando a tela como o
 * avatar (27/10/2026, pedido dela: o adulto tinha o mesmo cabeçalho grande do Kids e não tinha a
 * alça). O 3D não monta sem WebGL; o que dá para travar aqui é a moldura e a MARCAÇÃO.
 *
 * ⚠️ `mock.module` não é isolado por arquivo no bun: espalhar o módulo atual mantém os outros
 * exports para quem mais o importa.
 */
const source = (relative: string) => readFileSync(resolve(import.meta.dir, '..', relative), 'utf8')

const navigation = await import('next/navigation')
let pathname = '/quarto'
mock.module('next/navigation', () => ({
  ...navigation,
  usePathname: () => pathname,
  useRouter: () => ({ push() {}, replace() {}, prefetch() {}, back() {}, refresh() {} }),
}))

const { CommunityFrame } = await import('../src/components/community/community-frame')

const user = {
  id: 'conta-1',
  email: 'pessoa@exemplo.com',
  firstName: 'Ana',
  lastName: 'Lima',
  role: 'customer',
  avatarUrl: null,
} as unknown as Parameters<typeof CommunityFrame>[0]['user']

function render(path: string) {
  pathname = path
  return renderToStaticMarkup(
    <CommunityFrame user={user} banner={null}>
      <p>conteúdo</p>
    </CommunityFrame>,
  )
}

/** O `<aside>` do menu lateral, inteiro (abertura até o fechamento). */
function sidebarTag(html: string) {
  const start = html.indexOf('<aside id="community-sidebar"')
  expect(start).toBeGreaterThan(-1)
  return html.slice(start, html.indexOf('>', start) + 1)
}

describe('o menu da esquerda recolhe, como no Kids', () => {
  test('no Meu espaço 3D ele nasce recolhido, com a alça de mostrar presa à borda', () => {
    const html = render('/quarto')
    const aside = sidebarTag(html)
    expect(aside).toContain('inert=""')
    expect(aside).toContain('w-0')
    expect(html).toContain('aria-label="Mostrar menu"')
    expect(html).toContain('aria-controls="community-sidebar"')
    // Fechada, a alça fica na borda da tela; ela só existe onde o menu existe (do `lg` para cima).
    expect(html).toContain('left:0')
    expect(html).toMatch(/aria-label="Mostrar menu"[^>]*class="[^"]*\bhidden\b[^"]*\blg:flex\b/)
  })

  test('nas outras páginas o menu fica aberto e não há alça', () => {
    const html = render('/cursos')
    const aside = sidebarTag(html)
    expect(aside).not.toContain('inert')
    expect(aside).toContain('w-(--sz-menu-width)')
    expect(html).not.toContain('Mostrar menu')
    expect(html).not.toContain('Esconder menu')
  })

  test('a alça acompanha a largura real do menu', () => {
    const nav = source('src/components/community/community-nav.tsx')
    expect(nav).toContain("COMMUNITY_SIDEBAR_WIDTH = '14.4rem'")
    expect(source('src/components/community/community-frame.tsx')).toContain(
      'openOffset={menuWidth}',
    )
    expect(source('src/components/community/community-frame.tsx')).toContain(
      'const menuWidth = communitySidebarWidth(lesson)',
    )
    // A mesma medida veste a coluna e a alça, inclusive sob o tema da aula.
    for (const [path, width] of [
      ['/quarto', '14.4rem'],
      ['/cursos/curso/aulas/aula', 'calc(14.4 * 1.125rem)'],
    ] as const) {
      const html = render(path)
      expect(html).toContain(`--sz-community-sidebar-width:${width}`)
      expect(sidebarTag(html)).toContain(`--sz-menu-width:${width}`)
    }
    // ⚠️ Sem `overflow-hidden` na coluna: o menu do perfil abre mais largo que ela.
    expect(nav).not.toMatch(/<aside[\s\S]{0,400}overflow-hidden/)
  })
})

describe('o Meu espaço 3D ocupa a tela, como o avatar', () => {
  test('a página tira a faixa do topo e manda o voltar e o título para a linha do Salvar', () => {
    const page = source('src/app/(app)/quarto/page.tsx')
    expect(page).not.toContain('PageBand')
    expect(page).toContain('className="sz-cos-room-page"')
    expect(page).toContain('header={')
    expect(page).toContain('className="sz-cos-back"')
  })

  test('o editor mede o próprio contêiner e, no computador, tem a altura da janela', () => {
    const css = source('src/app/cosmetics-adult.css')
    expect(css).toContain('container: sz-cos-room / inline-size;')
    expect(css).toContain('@container sz-cos-room (min-width: 45rem)')
    expect(css).toContain('height: max(30rem, calc(100dvh - 2rem));')
    // A moldura do 3D traz o `aspect-[3/2]` do Tailwind: só uma regra FORA de camada a vence.
    const fimDaCamada = css.indexOf('\n}\n', css.indexOf('@layer components {'))
    expect(fimDaCamada).toBeGreaterThan(-1)
    const semCamada = css.slice(fimDaCamada)
    expect(semCamada).toContain('.sz-cos-room-canvas')
    expect(semCamada).toContain('aspect-ratio: auto;')
  })
})

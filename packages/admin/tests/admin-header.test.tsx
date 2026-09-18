import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (typeof document === 'undefined') GlobalRegistrator.register()
Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
  value: true,
  writable: true,
  configurable: true,
})
const React = await import('react')
const { act } = React
const { createRoot } = await import('react-dom/client')
const { AdminHeader } = await import('../src/components/admin/admin-header')

const TITULO = 'Programando o primeiro jogo com o Dino'
const SLUG = 'programando-o-primeiro-jogo-com-o-dino'

async function montar(node: React.ReactElement) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => root.render(node))
  return container
}

const acoes = React.createElement(
  'div',
  { className: 'flex flex-wrap gap-2' },
  React.createElement('button', { type: 'button' }, 'Revisar para publicar'),
)

test('o padrão mantém título e ações na mesma linha, com a ação sem encolher', async () => {
  const container = await montar(
    React.createElement(AdminHeader, { title: TITULO, description: SLUG, action: acoes }),
  )
  const raiz = container.firstElementChild as HTMLElement
  expect(raiz.className).toContain('sm:flex-row')
  // ⚠ Diz QUAL elemento: `querySelector('.shrink-0')` sozinho ficaria verde se alguém movesse
  // a classe para o bloco do título, o que INVERTE o invariante do componente (achado do full
  // review de 18/09/2026). Quem não pode encolher é o lado das ações.
  expect(container.querySelector('button')?.closest('.shrink-0')).not.toBeNull()
  expect(container.querySelector('h1')?.closest('.shrink-0')).toBeNull()
  expect(container.querySelector('h1')?.textContent).toBe(TITULO)
  expect(container.querySelector('p')?.textContent).toBe(SLUG)
})

test('com acoesAbaixo o título e o slug ficam numa linha e as ações na de baixo', async () => {
  const container = await montar(
    React.createElement(AdminHeader, {
      title: TITULO,
      description: SLUG,
      action: acoes,
      acoesAbaixo: true,
    }),
  )
  const raiz = container.firstElementChild as HTMLElement
  // Coluna sempre: nada de `sm:flex-row` devolvendo as ações para o lado do título.
  expect(raiz.className).toContain('flex-col')
  expect(raiz.className).not.toContain('sm:flex-row')
  // ⚠️ O embrulho `shrink-0` NÃO pode existir aqui: ele é o que espremia o título.
  expect(container.querySelector('button')?.closest('.shrink-0')).toBeNull()
  // A identidade vem primeiro, as ações depois — nessa ordem.
  const filhos = [...raiz.children]
  expect(filhos.length).toBe(2)
  expect(filhos[0]?.querySelector('h1')?.textContent).toBe(TITULO)
  expect(filhos[0]?.querySelector('p')?.textContent).toBe(SLUG)
  expect(filhos[1]?.querySelector('button')?.textContent).toBe('Revisar para publicar')
})

test('o bloco do título tem min-w-0 nos dois modos: título longo não estoura a linha', async () => {
  for (const acoesAbaixo of [false, true]) {
    const container = await montar(
      React.createElement(AdminHeader, {
        title: TITULO,
        description: SLUG,
        action: acoes,
        acoesAbaixo,
      }),
    )
    const identidade = container.querySelector('h1')?.parentElement as HTMLElement
    expect(identidade.className).toContain('min-w-0')
  }
})

test('sem ação nenhuma, os dois modos renderizam só a identidade', async () => {
  for (const acoesAbaixo of [false, true]) {
    const container = await montar(
      React.createElement(AdminHeader, { title: 'Painel', acoesAbaixo }),
    )
    expect(container.querySelector('h1')?.textContent).toBe('Painel')
    expect(container.querySelector('p')).toBeNull()
    expect(container.querySelector('button')).toBeNull()
  }
})

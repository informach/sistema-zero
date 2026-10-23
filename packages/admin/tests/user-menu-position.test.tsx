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
const { UserMenu } = await import('../src/components/admin/user-menu')

const USER = {
  id: 'u1',
  email: 'equipe@sistemazero.com.br',
  firstName: 'Ana',
  lastName: 'Lima',
  role: 'admin',
} as const

async function abrir(props: Record<string, unknown>) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () =>
    root.render(React.createElement(UserMenu, { user: USER, ...props } as never)),
  )
  const trigger = container.querySelector('button[aria-label="Conta"]') as HTMLButtonElement
  await act(async () => trigger.click())
  const menu = trigger.nextElementSibling as HTMLElement
  return { menu, cleanup: () => act(async () => root.unmount()) }
}

test('no rodapé do menu lateral, o menu da conta abre para cima e para dentro da tela', async () => {
  const { menu, cleanup } = await abrir({ dropdownSide: 'up', dropdownAlign: 'left' })
  const classes = menu.className.split(/\s+/)
  expect(classes).toContain('left-0')
  expect(classes).not.toContain('right-0')
  expect(classes).toContain('bottom-full')
  await cleanup()
})

test('na barra do celular, com o avatar à direita, o menu cresce para a esquerda a partir dele', async () => {
  const { menu, cleanup } = await abrir({})
  const classes = menu.className.split(/\s+/)
  expect(classes).toContain('right-0')
  expect(classes).not.toContain('left-0')
  expect(classes).not.toContain('bottom-full')
  await cleanup()
})

test('o menu mostra o papel escrito para gente', async () => {
  const { menu, cleanup } = await abrir({ roleLabel: 'Admin' })
  expect(menu.textContent).toContain('Admin')
  expect(menu.textContent).not.toContain('admin')
  await cleanup()
})

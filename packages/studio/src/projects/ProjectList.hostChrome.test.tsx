import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/**
 * Chrome do HOST no cabeçalho da lista de projetos (07/09/2026): o botão de esconder o menu
 * da comunidade vem antes do título e o selo "Guardado na sua conta" é o 1º item das ações.
 * Arquivo próprio pelo mesmo motivo dos irmãos: o mock de idb-keyval é por arquivo.
 */
type KV = Map<IDBValidKey, unknown>
const dbs = new Map<string, KV>()
const kvOf = (store?: { name?: string }): KV => {
  const key = store?.name ?? ''
  let kv = dbs.get(key)
  if (!kv) {
    kv = new Map()
    dbs.set(key, kv)
  }
  return kv
}

mock.module('idb-keyval', () => ({
  createStore: (dbName: string) => ({ name: dbName }),
  get: async (key: IDBValidKey, store?: { name?: string }) => kvOf(store).get(key),
  getMany: async (keys: IDBValidKey[], store?: { name?: string }) =>
    keys.map((key) => kvOf(store).get(key)),
  set: async (key: IDBValidKey, value: unknown, store?: { name?: string }) => {
    kvOf(store).set(key, value)
  },
  setMany: async (pairs: Array<[IDBValidKey, unknown]>, store?: { name?: string }) => {
    for (const [key, value] of pairs) kvOf(store).set(key, value)
  },
  del: async (key: IDBValidKey, store?: { name?: string }) => {
    kvOf(store).delete(key)
  },
  delMany: async (keys: IDBValidKey[], store?: { name?: string }) => {
    for (const key of keys) kvOf(store).delete(key)
  },
  keys: async (store?: { name?: string }) => [...kvOf(store).keys()],
  update: async (
    key: IDBValidKey,
    updater: (old: unknown) => unknown,
    store?: { name?: string },
  ) => {
    const kv = kvOf(store)
    kv.set(key, updater(kv.get(key)))
  },
}))

const { t } = await import('#core')
const { ProjectList } = await import('./ProjectList')
const { StudioHostChromeProvider } = await import('../studio/host-chrome')
type StudioHostChrome = import('../studio/host-chrome').StudioHostChrome

afterEach(() => {
  cleanup()
  dbs.clear()
})

describe('ProjectList × chrome do host', () => {
  it('menu antes do título (sem title) e o selo como 1º item das ações', async () => {
    const onToggle = mock(() => {})
    const chrome: StudioHostChrome = {
      menu: { hidden: false, label: 'Esconder menu', onToggle },
      status: {
        tone: 'muted',
        icon: 'download',
        label: 'Buscando…',
        text: 'Buscando o que você guardou na sua conta…',
      },
    }
    const { container } = render(
      <StudioHostChromeProvider value={chrome}>
        <ProjectList onOpenProject={() => {}} theme="light" />
      </StudioHostChromeProvider>,
    )
    await waitFor(() => {
      expect(screen.getByText(t('projects.empty'))).toBeTruthy()
    })
    const header = container.querySelector('header')
    const primeiro = header?.querySelector('button')
    expect(primeiro?.getAttribute('aria-label')).toBe('Esconder menu')
    expect(primeiro?.getAttribute('aria-pressed')).toBe('false')
    expect(primeiro?.getAttribute('title')).toBeNull()
    fireEvent.click(primeiro as HTMLButtonElement)
    expect(onToggle).toHaveBeenCalledTimes(1)
    // A lista mostra a frase INTEIRA (tem espaço; a barra do editor usa o rótulo curto).
    const selo = screen.getByRole('status', {
      name: 'Buscando o que você guardou na sua conta…',
    })
    expect(header?.contains(selo)).toBe(true)
    // Os nomes acessíveis dos e2e seguem intactos.
    // A lista vazia mostra também a vitrine (que tem o próprio "+ Novo projeto"); o do cabeçalho segue lá.
    const novos = screen.getAllByRole('button', { name: '+ Novo projeto' })
    expect(novos.some((b) => header?.contains(b))).toBe(true)
    expect(screen.getByRole('button', { name: 'Importar' })).toBeTruthy()
  })

  it('sem Provider nada do host aparece e a marca segue como sempre', async () => {
    render(<ProjectList onOpenProject={() => {}} theme="light" />)
    await waitFor(() => {
      expect(screen.getByText(t('projects.empty'))).toBeTruthy()
    })
    expect(screen.queryByRole('button', { name: /menu/i })).toBeNull()
    expect(screen.queryByText(/na sua conta/)).toBeNull()
  })
})

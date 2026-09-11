import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { fakeUseStore } from '../testing/fakeIdbStore'

/**
 * Chrome do HOST no cabeçalho da lista de projetos (07/09/2026): o botão de esconder o menu
 * da comunidade vem antes do título e o selo "Guardado na sua conta" é o 1º item das ações.
 * Desde 11/09/2026 (as telas-modelo) também a seta de volta para Criar, ao lado do menu, e a
 * nuvem da conta em repouso (a pílula e a frase do cartão da faixa lilás).
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
  createStore: (dbName: string) => fakeUseStore(dbName),
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

const { t, createEmptyProject } = await import('#core')
const { persistProject } = await import('../state/persistence')
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
      back: null,
      account: null,
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
    // A receita COMPARTILHADA das ferramentas (a mesma do Pinta e do Pensa): o quadrado das
    // telas-modelo, dentro do padding (a aba colada na sidebar saiu em 11/09/2026).
    expect(primeiro?.className).toBe('sz-tool-btn-menu')
    expect(header?.className).not.toContain('--sz-tool-inset')
    fireEvent.click(primeiro as HTMLButtonElement)
    expect(onToggle).toHaveBeenCalledTimes(1)
    // A lista mostra a frase INTEIRA (tem espaço; a barra do editor usa o rótulo curto), na
    // pílula compartilhada.
    const selo = screen.getByRole('status', {
      name: 'Buscando o que você guardou na sua conta…',
    })
    expect(header?.contains(selo)).toBe(true)
    expect(selo.className).toContain('sz-tool-status')
    // Os nomes acessíveis dos e2e seguem intactos.
    // A lista vazia mostra também a vitrine (que tem o próprio "+ Novo projeto"); o do cabeçalho segue lá.
    const novos = screen.getAllByRole('button', { name: '+ Novo projeto' })
    expect(novos.some((b) => header?.contains(b))).toBe(true)
    expect(screen.getByRole('button', { name: 'Importar' })).toBeTruthy()
  })

  it('a seta de volta para Criar vem logo depois do menu, e o clique simples é do host', async () => {
    const onNavigate = mock(() => {})
    const chrome: StudioHostChrome = {
      menu: { hidden: false, label: 'Esconder menu', onToggle: () => {} },
      status: null,
      back: { label: 'Voltar para Criar', href: '/criar', onNavigate },
      account: null,
    }
    const { container } = render(
      <StudioHostChromeProvider value={chrome}>
        <ProjectList onOpenProject={() => {}} theme="light" />
      </StudioHostChromeProvider>,
    )
    await waitFor(() => {
      expect(screen.getByText(t('projects.empty'))).toBeTruthy()
    })
    const seta = screen.getByRole('link', { name: 'Voltar para Criar' })
    // Um LINK de verdade (abre noutra aba com Ctrl), no quadrado das barras, sem `title`.
    expect(seta.getAttribute('href')).toBe('/criar')
    expect(seta.className).toBe('sz-tool-back')
    expect(seta.getAttribute('title')).toBeNull()
    // [menu][voltar], nessa ordem, no grupo antes do título.
    const nav = container.querySelector('.sz-tool-header__nav')
    expect(nav?.children[0]?.getAttribute('aria-label')).toBe('Esconder menu')
    expect(nav?.children[1]).toBe(seta)
    // Com Ctrl (ou Cmd) o navegador cuida: nada de navegação do host.
    fireEvent.click(seta, { ctrlKey: true })
    expect(onNavigate).toHaveBeenCalledTimes(0)
    const simples = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
    seta.dispatchEvent(simples)
    expect(onNavigate).toHaveBeenCalledTimes(1)
    // O clique simples não segue o `href` (a página não recarrega).
    expect(simples.defaultPrevented).toBe(true)
  })

  it('sem o menu (tela sem sidebar) a seta aparece sozinha no grupo', async () => {
    const chrome: StudioHostChrome = {
      menu: null,
      status: null,
      back: { label: 'Voltar para Criar', href: '/criar', onNavigate: () => {} },
      account: null,
    }
    const { container } = render(
      <StudioHostChromeProvider value={chrome}>
        <ProjectList onOpenProject={() => {}} theme="light" />
      </StudioHostChromeProvider>,
    )
    await waitFor(() => {
      expect(screen.getByText(t('projects.empty'))).toBeTruthy()
    })
    expect(screen.queryByRole('button', { name: /menu/i })).toBeNull()
    const nav = container.querySelector('.sz-tool-header__nav')
    expect(nav?.children).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Voltar para Criar' })).toBeTruthy()
  })

  it('a nuvem da conta em REPOUSO vira a pílula menta e a frase "na sua conta"', async () => {
    await persistProject(createEmptyProject('01J00000000000000000000AAA', 'Nave'))
    await persistProject(createEmptyProject('01J00000000000000000000BBB', 'Pong'))
    const comConta: StudioHostChrome = {
      menu: null,
      status: null,
      back: null,
      account: { label: 'Guardado na sua conta' },
    }
    const { unmount } = render(
      <StudioHostChromeProvider value={comConta}>
        <ProjectList onOpenProject={() => {}} theme="light" />
      </StudioHostChromeProvider>,
    )
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: '2 projetos guardados na sua conta' }),
      ).toBeTruthy()
    })
    // Em repouso, a mesma pílula do "guardado" (tom ok): nada acontecendo e a conta ligada.
    const pilula = screen.getByRole('status', { name: 'Guardado na sua conta' })
    expect(pilula.className).toContain('sz-tool-status--ok')
    unmount()

    // Sem a conta (sem perfil, playground), a frase não promete nuvem nenhuma.
    render(<ProjectList onOpenProject={() => {}} theme="light" />)
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: '2 projetos guardados neste aparelho' }),
      ).toBeTruthy()
    })
    expect(screen.queryByText(/na sua conta/)).toBeNull()
  })

  it('com a nuvem falhando, o cartão lilás não promete "na sua conta"; guardando, promete', async () => {
    await persistProject(createEmptyProject('01J00000000000000000000AAA', 'Nave'))
    await persistProject(createEmptyProject('01J00000000000000000000BBB', 'Pong'))
    const comStatus = (status: StudioHostChrome['status']): StudioHostChrome => ({
      menu: null,
      status,
      back: null,
      account: { label: 'Guardado na sua conta' },
    })
    const semInternet = comStatus({
      tone: 'warn',
      icon: 'offline',
      label: 'Sem internet agora',
      text: 'Sem internet agora. Vou guardar na sua conta quando voltar.',
    })
    const falhou = comStatus({
      tone: 'danger',
      icon: 'alert',
      label: 'Não consegui guardar',
      text: 'Não consegui guardar na sua conta. Vou tentar de novo.',
    })
    for (const chrome of [semInternet, falhou]) {
      const { unmount } = render(
        <StudioHostChromeProvider value={chrome}>
          <ProjectList onOpenProject={() => {}} theme="light" />
        </StudioHostChromeProvider>,
      )
      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: '2 projetos guardados neste aparelho' }),
        ).toBeTruthy()
      })
      unmount()
    }

    // Anti-vácuo: guardando (tom neutro) a nuvem está funcionando, e a frase segue "na sua conta".
    render(
      <StudioHostChromeProvider
        value={comStatus({
          tone: 'muted',
          icon: 'upload',
          label: 'Guardando…',
          text: 'Guardando na sua conta…',
        })}
      >
        <ProjectList onOpenProject={() => {}} theme="light" />
      </StudioHostChromeProvider>,
    )
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: '2 projetos guardados na sua conta' }),
      ).toBeTruthy()
    })
  })

  it('o que acontece AGORA vence a conta em repouso (o selo do host manda na pílula)', async () => {
    const chrome: StudioHostChrome = {
      menu: null,
      status: {
        tone: 'muted',
        icon: 'upload',
        label: 'Guardando…',
        text: 'Guardando na sua conta…',
      },
      back: null,
      account: { label: 'Guardado na sua conta' },
    }
    render(
      <StudioHostChromeProvider value={chrome}>
        <ProjectList onOpenProject={() => {}} theme="light" />
      </StudioHostChromeProvider>,
    )
    await waitFor(() => {
      expect(screen.getByText(t('projects.empty'))).toBeTruthy()
    })
    expect(screen.getAllByRole('status').map((s) => s.getAttribute('title'))).toEqual([
      'Guardando na sua conta…',
    ])
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

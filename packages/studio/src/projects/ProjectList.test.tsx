import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

/**
 * Fumaça da HOME do Estúdio ("Meus Jogos", padrão visual do Pinta): trava o
 * copy do cabeçalho E os nomes acessíveis que os specs e2e usam para entrar
 * ('+ Novo projeto', busca, ordenação). Arquivo próprio pelo mesmo motivo dos
 * irmãos: o mock de idb-keyval é por arquivo (registry global de mocks).
 */
type KV = Map<IDBValidKey, unknown>
const dbs = new Map<string, KV>()
/** Chaves pedidas em cada `getMany` (para provar a releitura INCREMENTAL da lista). */
const getManyCalls: IDBValidKey[][] = []
/** Atraso injetado no `getMany` do LOTE de metas (a leitura inicial da lista, com muitos projetos). */
let slowMetaBatchMs = 0
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
  getMany: async (keys: IDBValidKey[], store?: { name?: string }) => {
    getManyCalls.push([...keys])
    const allMeta =
      keys.length > 1 &&
      keys.every((k) => typeof k === 'string' && k.startsWith('sz:project-meta:'))
    if (allMeta && slowMetaBatchMs > 0) await new Promise((r) => setTimeout(r, slowMetaBatchMs))
    return keys.map((key) => kvOf(store).get(key))
  },
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
const { ProjectList } = await import('./ProjectList')
const {
  persistProject,
  PROJECT_CHANGED_EVENT,
  PROJECT_THUMB_UPDATED_EVENT,
  deleteProject,
  writeProjectThumb,
} = await import('../state/persistence')

afterEach(() => {
  cleanup()
  dbs.clear()
  slowMetaBatchMs = 0
})

/** Semeia projetos no "IndexedDB" falso (meta/files/state), como o autosave faria. */
async function seedProjects(): Promise<void> {
  const nave = createEmptyProject('01J00000000000000000000NAV', 'Nave Espacial')
  const acao = createEmptyProject('01J00000000000000000000ACA', 'Jogo de Ação')
  const codigo = {
    ...createEmptyProject('01J00000000000000000000COD', 'Meu Site'),
    mode: 'code' as const,
  }
  await persistProject(nave)
  await persistProject(acao)
  await persistProject(codigo)
}

const cardNames = () =>
  screen
    .queryAllByRole('button', { name: /^Abrir projeto / })
    .map((b) => b.getAttribute('aria-label') ?? '')

describe('ProjectList — home "Meus Jogos" (padrão Pinta)', () => {
  it('abre com o cabeçalho novo e os nomes acessíveis dos e2e intactos', async () => {
    render(<ProjectList onOpenProject={() => {}} theme="light" />)
    // Copy do cabeçalho (decisão da usuária, imagem-modelo).
    expect(screen.getByRole('heading', { name: 'Meus Jogos' })).toBeTruthy()
    expect(screen.getByText('Dê vida aos seus jogos...')).toBeTruthy()
    expect(screen.getByRole('heading', { name: t('projects.title') })).toBeTruthy()
    // Nomes que os specs e2e usam para navegar — NÃO renomear.
    expect(screen.getByRole('button', { name: '+ Novo projeto' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Importar' })).toBeTruthy()
    expect(screen.getByLabelText(t('projects.sort'))).toBeTruthy()
    expect(screen.getByLabelText(t('projects.search'))).toBeTruthy()
    // Lista vazia carregada → estado de primeiro uso (sem exemplos p/ cliente).
    await waitFor(() => {
      expect(screen.getByText(t('projects.empty'))).toBeTruthy()
    })
  })
})

describe('ProjectList — busca e filtro de modo', () => {
  it('a busca casa sem acento e por vários termos, mostra o contador e limpa; o filtro de modo se combina', async () => {
    await seedProjects()
    render(<ProjectList onOpenProject={() => {}} theme="light" />)
    await waitFor(() => {
      expect(cardNames()).toHaveLength(3)
    })
    const search = screen.getByLabelText(t('projects.search')) as HTMLInputElement
    fireEvent.change(search, { target: { value: 'ESPAÇIAL' } })
    await waitFor(() => {
      expect(cardNames()).toEqual([expect.stringContaining('Nave Espacial')])
    })
    expect(screen.getByRole('status').textContent).toBe(t('projects.searchCountOne', { total: 3 }))
    // Só símbolos ("!!!") normalizam para nenhum termo: casa tudo e NÃO conta como filtro.
    fireEvent.change(search, { target: { value: '!!!' } })
    await waitFor(() => {
      expect(cardNames()).toHaveLength(3)
    })
    expect(screen.queryByRole('status')).toBeNull()
    // Nada casa: mensagem + "limpar busca e filtros" (limpa os dois).
    fireEvent.change(search, { target: { value: 'dinossauro' } })
    await waitFor(() => {
      expect(screen.getByText(t('projects.emptySearch'))).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: t('projects.searchClearAll') }))
    await waitFor(() => {
      expect(cardNames()).toHaveLength(3)
    })
    // Modo Código: só o site; Blocos: os dois de blocos.
    const modes = screen.getByRole('group', { name: t('projects.filterMode') })
    fireEvent.click(within(modes).getByRole('button', { name: /Código/ }))
    await waitFor(() => {
      expect(cardNames()).toEqual([expect.stringContaining('Meu Site')])
    })
    fireEvent.click(within(modes).getByRole('button', { name: /Blocos/ }))
    await waitFor(() => {
      expect(cardNames()).toHaveLength(2)
    })
    // Blocos + "nave": só a nave.
    fireEvent.change(search, { target: { value: 'nave' } })
    await waitFor(() => {
      expect(cardNames()).toEqual([expect.stringContaining('Nave Espacial')])
    })
  })
})

describe('ProjectList — atualização incremental', () => {
  it('capa pronta / projeto mudou = relê SÓ aquele card (2 chaves), e apagar tira o card sem recarregar tudo', async () => {
    await seedProjects()
    render(<ProjectList onOpenProject={() => {}} theme="light" />)
    await waitFor(() => {
      expect(cardNames()).toHaveLength(3)
    })
    getManyCalls.length = 0
    // A capa da nave ficou pronta (o que a captura do exit faz): só a nave é relida.
    await writeProjectThumb('01J00000000000000000000NAV', 'data:image/jpeg;base64,AAA')
    window.dispatchEvent(
      new CustomEvent(PROJECT_THUMB_UPDATED_EVENT, { detail: '01J00000000000000000000NAV' }),
    )
    await waitFor(() => {
      const img = document.querySelector('img[src="data:image/jpeg;base64,AAA"]')
      expect(img).toBeTruthy()
    })
    const asked = getManyCalls.flat()
    expect(asked).toContain('sz:project-meta:01J00000000000000000000NAV')
    expect(asked).toContain('sz:project-thumb:01J00000000000000000000NAV')
    expect(asked).not.toContain('sz:project-meta:01J00000000000000000000ACA')
    // Apagar (o card/restauro/nuvem avisa `PROJECT_CHANGED_EVENT` com deleted): some da lista.
    await deleteProject('01J00000000000000000000ACA')
    await waitFor(() => {
      expect(cardNames()).toHaveLength(2)
    })
    expect(cardNames().some((name) => name.includes('Jogo de Ação'))).toBe(false)
    // Um projeto NOVO gravado por fora (restauro da nuvem) aparece sozinho.
    await persistProject(createEmptyProject('01J00000000000000000000NOV', 'Chegou da nuvem'), {
      silent: true,
    })
    await waitFor(() => {
      expect(cardNames().some((name) => name.includes('Chegou da nuvem'))).toBe(true)
    })
    // Evento SEM id (caminho antigo): recarrega tudo, sem quebrar.
    window.dispatchEvent(new CustomEvent(PROJECT_CHANGED_EVENT))
    await waitFor(() => {
      expect(cardNames()).toHaveLength(3)
    })
  })

  it('um projeto gravado (restauro da nuvem) ENQUANTO a primeira leitura da lista está em voo aparece assim que ela termina (não só no F5)', async () => {
    await seedProjects()
    // A leitura inicial demora (lista grande): o lote de metas leva 300 ms.
    slowMetaBatchMs = 300
    render(<ProjectList onOpenProject={() => {}} theme="light" />)
    // Enquanto a lista carrega (o `keys()` já passou, o `getMany` das metas está preso), a
    // descida da nuvem grava um projeto novo — é o fluxo "lista local primeiro, nuvem depois".
    await new Promise((r) => setTimeout(r, 50))
    await persistProject(createEmptyProject('01J00000000000000000000NOV', 'Chegou da nuvem'), {
      silent: true,
    })
    await waitFor(
      () => {
        expect(cardNames().some((name) => name.includes('Chegou da nuvem'))).toBe(true)
      },
      { timeout: 3000 },
    )
    expect(cardNames()).toHaveLength(4)
  })

  it('ordenação por nome usa o `Collator` pt-BR (acentos e maiúsculas na ordem natural, como o `localeCompare` anterior); por data, a mais recente primeiro', async () => {
    await persistProject({
      ...createEmptyProject('01J00000000000000000000ORD1', 'Ônibus'),
      updatedAt: 10,
    })
    await persistProject({
      ...createEmptyProject('01J00000000000000000000ORD2', 'abacaxi'),
      updatedAt: 30,
    })
    await persistProject({
      ...createEmptyProject('01J00000000000000000000ORD3', 'Zebra'),
      updatedAt: 20,
    })
    render(<ProjectList onOpenProject={() => {}} theme="light" />)
    await waitFor(() => {
      expect(cardNames()).toHaveLength(3)
    })
    // Padrão: mais recente primeiro.
    expect(cardNames()).toEqual([
      'Abrir projeto abacaxi',
      'Abrir projeto Zebra',
      'Abrir projeto Ônibus',
    ])
    fireEvent.change(screen.getByRole('combobox', { name: t('projects.sort') }), {
      target: { value: 'name' },
    })
    await waitFor(() => {
      expect(cardNames()).toEqual([
        'Abrir projeto abacaxi',
        'Abrir projeto Ônibus',
        'Abrir projeto Zebra',
      ])
    })
  })

  it('vários ids que chegam juntos são relidos num `getMany` só (meta + capa de cada), não um por id', async () => {
    await seedProjects()
    render(<ProjectList onOpenProject={() => {}} theme="light" />)
    await waitFor(() => {
      expect(cardNames()).toHaveLength(3)
    })
    getManyCalls.length = 0
    window.dispatchEvent(
      new CustomEvent(PROJECT_CHANGED_EVENT, { detail: { id: '01J00000000000000000000NAV' } }),
    )
    window.dispatchEvent(
      new CustomEvent(PROJECT_CHANGED_EVENT, { detail: { id: '01J00000000000000000000ACA' } }),
    )
    await waitFor(() => {
      expect(getManyCalls.length).toBeGreaterThan(0)
    })
    await new Promise((r) => setTimeout(r, 100))
    expect(getManyCalls).toHaveLength(1)
    expect(getManyCalls[0]).toHaveLength(4)
  })
})

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { fakeUseStore } from '../../testing/fakeIdbStore'

/**
 * Janela "Trazer da equipe" (Pensa em equipe, 14/10/2026) + o botão no painel de materiais.
 *
 * Arquivo à parte (molde do MoldaImportDialog.test.tsx): precisa do mock de idb-keyval, e o
 * registro de module mocks do bun é global (cada arquivo carrega o seu).
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

const { createEmptyProject } = await import('#core')
const { setPersonalAssetsNamespace } = await import('../../asset-library/personal')
const { releaseDrawingSyncProfile } = await import('../../asset-library/personalSync')
const { setStorageNamespace } = await import('../../state/persistence')
const { useProjectStore } = await import('../../state/projectStore')
const { StudioStoresContext } = await import('../../state/storesContext')
const { createStudioStores } = await import('../../state/studioStores')
const { StudioTeamLibraryProvider } = await import('../../studio/team-library')
const { StudioPintaLibraryProvider } = await import('../../studio/pinta-library')
type TeamLibraryAdapter = import('../../studio/team-library').StudioTeamLibraryAdapter
type TeamArtSummary = import('../../studio/team-library').StudioTeamArtSummary
type TeamImportResult = import('../../studio/team-library').StudioTeamImportResult
const { AssetsPanel } = await import('./AssetsPanel')
const { TeamImportDialog, filterTeamArt, teamArtNeeds3D } = await import('./TeamImportDialog')
const { addPintaCreationToProject } = await import('./addCreationToProject')

function base64DataUrl(mime: string, bytes: number[]): string {
  return `data:${mime};base64,${btoa(String.fromCharCode(...bytes))}`
}
// Assinatura GLB v2 ("glTF" + versão 2 + tamanho): o que o `isValidAssetDataUrl` confere.
const GLB_OK = base64DataUrl(
  'model/gltf-binary',
  [0x67, 0x6c, 0x54, 0x46, 0x02, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x00, 0x00],
)
const PNG = 'data:image/png;base64,AAAA'
const PNG_NOVO = 'data:image/png;base64,BBBB'

const ITEMS: TeamArtSummary[] = [
  {
    id: 'task-heroi',
    assetId: 'bia-heroi',
    name: 'heroi-da-bia',
    kind: 'drawing',
    byName: 'Bia',
    missionTitle: 'Desenhar o herói',
    thumbDataUrl: null,
  },
  {
    id: 'task-nave',
    assetId: 'leo-nave',
    name: 'nave-do-leo',
    kind: 'model',
    byName: 'Leo',
    missionTitle: 'Modelar a nave',
    thumbDataUrl: PNG,
  },
  {
    id: 'task-grama',
    assetId: 'leo-grama',
    name: 'grama-do-leo',
    kind: 'texture',
    byName: 'Leo',
    missionTitle: 'Textura do chão',
    thumbDataUrl: null,
  },
]

/** O que o host devolveria (o MESMO formato do Pinta e do Molda). */
function resultFor(id: string, dataUrl = PNG): TeamImportResult {
  if (id === 'task-heroi') {
    return {
      tool: 'pinta',
      result: {
        ok: true,
        asset: {
          id: 'bia-heroi',
          name: 'heroi-da-bia',
          dataUrl,
          width: 32,
          height: 16,
          sprite: {
            frameW: 16,
            frameH: 16,
            animations: [{ name: 'andar', from: 0, to: 1, fps: 8, loop: true }],
          },
          libRevision: 11,
        },
      },
    }
  }
  if (id === 'task-nave') {
    return {
      tool: 'molda',
      result: {
        ok: true,
        asset: {
          id: 'leo-nave',
          name: 'nave-do-leo',
          kind: 'model3d',
          dataUrl: GLB_OK,
          originalFileName: 'nave-do-leo.glb',
          libRevision: 7,
        },
      },
    }
  }
  return {
    tool: 'molda',
    result: {
      ok: true,
      asset: {
        id: 'leo-grama',
        name: 'grama-do-leo',
        kind: 'image',
        dataUrl,
        originalFileName: 'grama-do-leo.png',
        width: 16,
        height: 16,
      },
    },
  }
}

function fakeAdapter(
  overrides: Partial<TeamLibraryAdapter> = {},
): TeamLibraryAdapter & { importCalls: Array<{ id: string; review?: string }> } {
  const importCalls: Array<{ id: string; review?: string }> = []
  return {
    importCalls,
    list: async () => ITEMS,
    import: async (id, options) => {
      importCalls.push({
        id,
        ...(options?.acceptedReview ? { review: options.acceptedReview } : {}),
      })
      return resultFor(id)
    },
    ...overrides,
  }
}

function seedProject(opts: { with3D?: boolean } = {}): void {
  const project = createEmptyProject('p1', 'Meu Jogo')
  if (opts.with3D) {
    project.installedExtensions = [{ id: 'game-3d', version: '0.30.0', installedAt: 0 }]
  }
  useProjectStore.setState({ project, isDirty: false, saveError: null })
}

function renderPanel(adapter: TeamLibraryAdapter | null) {
  return render(
    <StudioTeamLibraryProvider value={adapter}>
      <AssetsPanel open onClose={() => {}} />
    </StudioTeamLibraryProvider>,
  )
}

async function click(element: Element) {
  await act(async () => {
    fireEvent.click(element)
  })
}

async function openDialog(adapter: TeamLibraryAdapter | null): Promise<void> {
  renderPanel(adapter)
  await click(await screen.findByRole('button', { name: /Trazer da equipe/ }))
}

function projectAssets() {
  return useProjectStore.getState().project?.assets ?? []
}

/** O botão de um cartão pelo nome da arte (os cartões repetem os rótulos dos botões). */
function cardButton(artName: string, label: RegExp): HTMLButtonElement {
  const card = screen.getByText(artName).closest('li') as HTMLElement
  const button = [...card.querySelectorAll('button')].find((b) => label.test(b.textContent ?? ''))
  if (!button) throw new Error(`sem botão ${label} no cartão ${artName}`)
  return button as HTMLButtonElement
}

beforeEach(() => {
  dbs.clear()
  localStorage.clear()
  releaseDrawingSyncProfile('perfil-1')
  setStorageNamespace('perfil-1')
  setPersonalAssetsNamespace('perfil-1')
  seedProject()
})

afterEach(() => {
  cleanup()
  releaseDrawingSyncProfile('perfil-1')
  setStorageNamespace('')
  setPersonalAssetsNamespace('')
  useProjectStore.setState({ project: null, isDirty: false, saveError: null })
})

describe('painel de materiais: o botão "Trazer da equipe"', () => {
  it('sem o adapter (jogo fora do Pensa, plano solo, aula): nenhum botão', async () => {
    renderPanel(null)
    await screen.findByText('Enviar imagem')
    expect(screen.queryByRole('button', { name: /Trazer da equipe/ })).toBeNull()
  })

  it('com o adapter: o botão aparece na aba das imagens, ao lado do Pinta', async () => {
    const pinta = { list: async () => [], import: async () => ({ ok: false as const, error: 'x' }) }
    render(
      <StudioPintaLibraryProvider value={pinta}>
        <StudioTeamLibraryProvider value={fakeAdapter()}>
          <AssetsPanel open onClose={() => {}} />
        </StudioTeamLibraryProvider>
      </StudioPintaLibraryProvider>,
    )
    expect(await screen.findByRole('button', { name: /Trazer da equipe/ })).not.toBeNull()
    expect(screen.getByRole('button', { name: /Trazer do Pinta/ })).not.toBeNull()
  })
})

describe('TeamImportDialog', () => {
  it('lista cada arte com o tipo, quem fez e a missão; a busca acha por quem fez', async () => {
    await openDialog(fakeAdapter())
    expect(await screen.findByText('heroi-da-bia')).not.toBeNull()
    expect(screen.getByText(/🎨 desenho · Feita por Bia/)).not.toBeNull()
    expect(screen.getByText('Missão: Desenhar o herói')).not.toBeNull()
    expect(screen.getByText(/🧊 modelo · Feita por Leo/)).not.toBeNull()
    fireEvent.change(screen.getByLabelText('Buscar artes da equipe'), { target: { value: 'BÍA' } })
    expect(screen.getByText('heroi-da-bia')).not.toBeNull()
    expect(screen.queryByText('nave-do-leo')).toBeNull()
  })

  it('o desenho entra pelo MESMO caminho do Pinta: elo pessoal, origem Pinta e as animações', async () => {
    const adapter = fakeAdapter()
    await openDialog(adapter)
    await screen.findByText('heroi-da-bia')
    await click(cardButton('heroi-da-bia', /Adicionar ao projeto/))
    await waitFor(() => expect(adapter.importCalls).toEqual([{ id: 'task-heroi' }]))
    await waitFor(() => {
      const asset = projectAssets().find((a) => a.libId === 'personal:bia-heroi')
      expect(asset?.name).toBe('heroi-da-bia')
      expect(asset?.libOrigin).toBe('pinta')
      expect(asset?.libRevision).toBe(11)
      expect(asset?.sprite?.animations[0]?.name).toBe('andar')
    })
    // Já no jogo: o selinho + o "Trazer de novo" (a colega pode ter mudado a arte).
    expect(await screen.findByText('✓ no projeto')).not.toBeNull()
    expect(cardButton('heroi-da-bia', /Trazer de novo/)).not.toBeNull()
  })

  it('"Trazer de novo" atualiza NO LUGAR (mesmo nome) e avisa', async () => {
    let dataUrl = PNG
    const adapter = fakeAdapter({ import: async (id) => resultFor(id, dataUrl) })
    await openDialog(adapter)
    await screen.findByText('heroi-da-bia')
    await click(cardButton('heroi-da-bia', /Adicionar ao projeto/))
    await screen.findByText('✓ no projeto')
    const before = projectAssets().find((a) => a.libId === 'personal:bia-heroi')
    dataUrl = PNG_NOVO
    await click(cardButton('heroi-da-bia', /Trazer de novo/))
    await waitFor(() => {
      const after = projectAssets().filter((a) => a.libId === 'personal:bia-heroi')
      expect(after).toHaveLength(1)
      expect(after[0]?.id).toBe(before?.id)
      expect(after[0]?.name).toBe('heroi-da-bia')
      expect(after[0]?.dataUrl).toBe(PNG_NOVO)
    })
    expect(screen.getByRole('status').textContent).toContain('heroi-da-bia')
  })

  it('sem consumidor 3D: o modelo fica desligado com a dica; a textura entra como imagem do Molda', async () => {
    const adapter = fakeAdapter()
    await openDialog(adapter)
    await screen.findByText('nave-do-leo')
    expect(screen.getByRole('note').textContent).toContain('Instale o Jogo 3D')
    expect(cardButton('nave-do-leo', /Adicionar/).disabled).toBe(true)
    await click(cardButton('grama-do-leo', /Adicionar/))
    await waitFor(() => {
      const asset = projectAssets().find((a) => a.libId === 'personal:leo-grama')
      expect(asset?.kind).toBe('image')
      expect(asset?.libOrigin).toBe('molda')
    })
  })

  it('com o Jogo 3D: o modelo entra como model3d com o nome do arquivo', async () => {
    seedProject({ with3D: true })
    await openDialog(fakeAdapter())
    await screen.findByText('nave-do-leo')
    expect(screen.queryByRole('note')).toBeNull()
    await click(cardButton('nave-do-leo', /Adicionar/))
    await waitFor(() => {
      const asset = projectAssets().find((a) => a.libId === 'personal:leo-nave')
      expect(asset?.kind).toBe('model3d')
      expect(asset?.originalFileName).toBe('nave-do-leo.glb')
      expect(asset?.libOrigin).toBe('molda')
      expect(asset?.libRevision).toBe(7)
    })
  })

  it('o consentimento do Molda vale aqui: nada entra antes de aceitar', async () => {
    seedProject({ with3D: true })
    const adapter = fakeAdapter({
      import: async (id, options) => {
        if (options?.acceptedReview !== 'equipe:task-nave:3')
          return {
            tool: 'molda',
            result: {
              ok: false,
              code: 'needs-review',
              error: 'Confira',
              review: { token: 'equipe:task-nave:3', losses: ['A pintura animada fica parada.'] },
            },
          }
        return resultFor(id)
      },
    })
    await openDialog(adapter)
    await screen.findByText('nave-do-leo')
    await click(cardButton('nave-do-leo', /Adicionar/))
    await screen.findByRole('region', { name: 'O que muda nesta cópia' })
    expect(projectAssets().some((a) => a.libId === 'personal:leo-nave')).toBe(false)
    await click(screen.getByRole('button', { name: 'Aceitar mudanças e adicionar' }))
    await waitFor(() =>
      expect(projectAssets().some((a) => a.libId === 'personal:leo-nave')).toBe(true),
    )
  })

  it('a frase do host aparece; arte que sumiu (not-found) sai da lista', async () => {
    const adapter = fakeAdapter({
      import: async () => ({
        tool: 'pinta',
        result: {
          ok: false,
          error: 'Essa arte não está mais na conta da colega.',
          code: 'not-found',
        },
      }),
    })
    await openDialog(adapter)
    await screen.findByText('heroi-da-bia')
    await click(cardButton('heroi-da-bia', /Adicionar/))
    expect((await screen.findByRole('alert')).textContent).toContain('não está mais')
    await waitFor(() => expect(screen.queryByText('heroi-da-bia')).toBeNull())
    expect(screen.getByText('nave-do-leo')).not.toBeNull()
  })

  it('lista que falha mostra o recado com "Tentar de novo"; lista vazia explica', async () => {
    let calls = 0
    const adapter = fakeAdapter({
      list: async () => {
        calls += 1
        if (calls === 1) throw new Error('fora do ar')
        return []
      },
    })
    await openDialog(adapter)
    expect(await screen.findByText('Não consegui buscar as artes da equipe agora.')).not.toBeNull()
    await click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByText(/Ninguém da equipe terminou uma arte ainda/)).not.toBeNull()
  })

  it('import que termina depois de outro jogo abrir NÃO entrega nada', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const adapter = fakeAdapter({
      import: async (id) => {
        await gate
        return resultFor(id)
      },
    })
    await openDialog(adapter)
    await screen.findByText('heroi-da-bia')
    await click(cardButton('heroi-da-bia', /Adicionar/))
    await act(async () => {
      useProjectStore.setState({ project: createEmptyProject('p2', 'Outro jogo') })
      release()
      await gate
    })
    expect(projectAssets().some((a) => a.libId === 'personal:bia-heroi')).toBe(false)
  })
})

it('na instância montada: colisão de nome ganha sufixo, como no Pinta e no Molda', async () => {
  const stores = createStudioStores()
  stores.project.setState({ project: createEmptyProject('instancia', 'Jogo aberto') })
  expect(stores.project.getState().addAsset({ name: 'heroi-da-bia', dataUrl: PNG })).toBeNull()
  render(
    <StudioStoresContext.Provider value={stores}>
      <StudioTeamLibraryProvider value={fakeAdapter()}>
        <TeamImportDialog onClose={() => {}} />
      </StudioTeamLibraryProvider>
    </StudioStoresContext.Provider>,
  )
  await screen.findByText('heroi-da-bia')
  await click(cardButton('heroi-da-bia', /Adicionar/))
  await screen.findByText('✓ no projeto')
  expect(stores.project.getState().project?.assets?.map((asset) => asset.name)).toEqual([
    'heroi-da-bia',
    'heroi-da-bia-2',
  ])
  expect(useProjectStore.getState().project?.assets).toEqual([])
})

describe('régua pura', () => {
  it('filterTeamArt: nome, missão e quem fez, sem acento nem caixa', () => {
    expect(filterTeamArt(ITEMS, '')).toHaveLength(3)
    expect(filterTeamArt(ITEMS, 'leo').map((i) => i.id)).toEqual(['task-nave', 'task-grama'])
    expect(filterTeamArt(ITEMS, 'CHAO').map((i) => i.id)).toEqual(['task-grama'])
  })

  it('teamArtNeeds3D: só modelo e céu pedem consumidor 3D', () => {
    expect(teamArtNeeds3D('model')).toBe(true)
    expect(teamArtNeeds3D('sky')).toBe(true)
    expect(teamArtNeeds3D('texture')).toBe(false)
    expect(teamArtNeeds3D('drawing')).toBe(false)
  })

  it('addPintaCreationToProject: a criação que já está no jogo é atualizada, não duplicada', () => {
    const stores = createStudioStores()
    stores.project.setState({ project: createEmptyProject('x', 'x') })
    const asset = { id: 'c1', name: 'pato', dataUrl: PNG, width: 8, height: 8 }
    expect(addPintaCreationToProject(stores.project.getState(), asset)).toBeNull()
    expect(
      addPintaCreationToProject(stores.project.getState(), { ...asset, dataUrl: PNG_NOVO }),
    ).toBeNull()
    const assets = stores.project.getState().project?.assets ?? []
    expect(assets).toHaveLength(1)
    expect(assets[0]?.name).toBe('pato')
    expect(assets[0]?.dataUrl).toBe(PNG_NOVO)
    expect(assets[0]?.libId).toBe('personal:c1')
  })
})

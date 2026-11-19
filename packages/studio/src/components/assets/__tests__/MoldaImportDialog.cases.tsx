import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { raylibRelocatedAssets } from '../../../core/raylibMediaPaths'
import { pythonProAssetExample } from '../../../python/proExamples'
import { RAYLIB_3D_EXTENSION } from '../../../runtime/python/raylib/contract'
import { pythonEnvironmentFixture } from '../../../state/fixtures/pythonEnvironment'
import { StudioRuntimeEnvironmentProvider } from '../../../studio/runtime-environment'
import { fakeUseStore } from '../../../testing/fakeIdbStore'
import { criarFonteDeCenarioDeEnsaio } from '../../../testing/moldaSceneFixture'
import { editorAssetEntries } from '../editorAssetEntries'

/**
 * Modal "Trazer do Molda" (fluxo pull das criações 3D) + o botão no AssetsPanel.
 *
 * Arquivo à parte (molde do PintaImportDialog.test.tsx): precisa do mock de
 * idb-keyval — o registry de module mocks é global, cada arquivo carrega o seu.
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
const { setPersonalAssetsNamespace } = await import('../../../asset-library/personal')
const { releaseDrawingSyncProfile } = await import('../../../asset-library/personalSync')
const { setStorageNamespace } = await import('../../../state/persistence')
const { useProjectStore } = await import('../../../state/projectStore')
const { StudioStoresContext } = await import('../../../state/storesContext')
const { createStudioStores } = await import('../../../state/studioStores')
const { StudioMoldaLibraryProvider } = await import('../../../studio/molda-library')
type MoldaLibraryAdapter = import('../../../studio/molda-library').StudioMoldaLibraryAdapter
type CreationSummary = import('../../../studio/molda-library').StudioMoldaCreationSummary
const { AssetsPanel } = await import('../AssetsPanel')
const { MoldaImportDialog, filterMoldaCreations, moldaCreationNeeds3D } = await import(
  '../MoldaImportDialog'
)
const { projectHas3DConsumer } = await import('../has3DConsumer')

function base64DataUrl(mime: string, bytes: number[]): string {
  return `data:${mime};base64,${btoa(String.fromCharCode(...bytes))}`
}
// Assinatura GLB v2 ("glTF" + versão 2 + tamanho) — o que o `isValidAssetDataUrl` confere.
const GLB_OK = base64DataUrl(
  'model/gltf-binary',
  [0x67, 0x6c, 0x54, 0x46, 0x02, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x00, 0x00],
)
const HDR_OK = base64DataUrl(
  'image/vnd.radiance',
  Array.from(new TextEncoder().encode('#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n')),
)
const PNG = 'data:image/png;base64,AAAA'

const CREATIONS: CreationSummary[] = [
  { id: 'm1', name: 'nave-cristal', kind: 'model', updatedAt: 3, thumbDataUrl: PNG },
  { id: 't1', name: 'grama-do-molda', kind: 'texture', updatedAt: 2, thumbDataUrl: null },
  { id: 's1', name: 'ceu-de-tarde', kind: 'sky', updatedAt: 1, thumbDataUrl: null },
]

function fakeAdapter(
  overrides: Partial<MoldaLibraryAdapter> = {},
): MoldaLibraryAdapter & { importCalls: string[] } {
  const importCalls: string[] = []
  return {
    importCalls,
    list: async () => CREATIONS,
    import: async (id: string) => {
      importCalls.push(id)
      const creation = CREATIONS.find((c) => c.id === id)
      if (!creation) return { ok: false as const, error: 'sumiu', code: 'not-found' as const }
      if (creation.kind === 'model') {
        return {
          ok: true as const,
          asset: {
            id,
            name: creation.name,
            kind: 'model3d' as const,
            dataUrl: GLB_OK,
            originalFileName: `${creation.name}.glb`,
            libRevision: 7,
          },
        }
      }
      if (creation.kind === 'sky') {
        return {
          ok: true as const,
          asset: {
            id,
            name: creation.name,
            kind: 'environment3d' as const,
            dataUrl: HDR_OK,
            originalFileName: `${creation.name}.hdr`,
          },
        }
      }
      return {
        ok: true as const,
        asset: {
          id,
          name: creation.name,
          kind: 'image' as const,
          dataUrl: PNG,
          originalFileName: `${creation.name}.png`,
          width: 16,
          height: 16,
        },
      }
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

function renderPanel(adapter: MoldaLibraryAdapter | null) {
  return render(
    <StudioMoldaLibraryProvider value={adapter}>
      <AssetsPanel open onClose={() => {}} />
    </StudioMoldaLibraryProvider>,
  )
}

async function click(element: Element) {
  await act(async () => {
    fireEvent.click(element)
  })
}

/** Vai para a aba onde o Molda mora. Ela existe pelo próprio adapter (ver AssetsPanel). */
async function goTo3DTab(): Promise<void> {
  await click(await screen.findByRole('tab', { name: 'Modelos 3D' }))
}

async function openDialog(adapter: MoldaLibraryAdapter | null): Promise<void> {
  renderPanel(adapter)
  await goTo3DTab()
  await click(await screen.findByRole('button', { name: /Trazer do Molda/ }))
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

describe('AssetsPanel — botão "Trazer do Molda"', () => {
  it('sem o adapter (aula/admin): nem o botão, nem a aba que só ele justificava', async () => {
    renderPanel(null)
    await screen.findByText('Enviar do computador')
    expect(screen.queryByRole('button', { name: /Trazer do Molda/ })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Modelos 3D' })).toBeNull()
  })

  it('com o adapter: botão na aba dos modelos 3D, que o próprio adapter faz existir', async () => {
    // ⚠️ Sem extensão 3D nenhuma no projeto: a aba existe porque o host deu o
    // Molda. Sem isso, a porta sumiria justo para quem ainda não instalou 3D —
    // inclusive para trazer TEXTURA, que é imagem e entra em qualquer projeto.
    renderPanel(fakeAdapter())
    await goTo3DTab()
    expect(await screen.findByRole('button', { name: /Trazer do Molda/ })).not.toBeNull()
  })
})

describe('MoldaImportDialog', () => {
  it.each([
    'project',
    'close',
  ] as const)('does not deliver a pending import after changing %s', async (change) => {
    seedProject({ with3D: true })
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const delegate = fakeAdapter()
    await openDialog(
      fakeAdapter({
        import: async (id) => {
          await gate
          return delegate.import(id)
        },
      }),
    )
    await screen.findByText('nave-cristal')
    await click(screen.getAllByRole('button', { name: 'Adicionar ao projeto' })[0]!)
    await act(async () => {
      if (change === 'project')
        useProjectStore.setState({ project: createEmptyProject('p2', 'Outro jogo') })
      else cleanup()
      release()
      await gate
    })
    await waitFor(() => expect(delegate.importCalls).toEqual(['m1']))
    expect(
      useProjectStore.getState().project?.assets?.some((asset) => asset.libId === 'personal:m1'),
    ).toBe(false)
  })

  it('lista a galeria com o selo do tipo e a busca filtra sem acento/caixa', async () => {
    await openDialog(fakeAdapter())
    expect(await screen.findByText('nave-cristal')).not.toBeNull()
    expect(screen.getByText('🧊 modelo')).not.toBeNull()
    expect(screen.getByText('🧱 textura')).not.toBeNull()
    expect(screen.getByText('🌤️ céu')).not.toBeNull()
    fireEvent.change(screen.getByLabelText('Buscar criações'), { target: { value: 'CÉU' } })
    expect(screen.getByText('ceu-de-tarde')).not.toBeNull()
    expect(screen.queryByText('nave-cristal')).toBeNull()
  })

  it('SEM consumidor 3D: modelo e céu ficam desabilitados com a dica; a textura entra como imagem', async () => {
    const adapter = fakeAdapter()
    await openDialog(adapter)
    await screen.findByText('nave-cristal')
    expect(screen.getByRole('note').textContent).toContain('Instale o Jogo 3D')
    const buttons = screen.getAllByRole('button', { name: 'Adicionar ao projeto' })
    expect(buttons).toHaveLength(3)
    // A ordem dos cards é a da galeria: modelo, textura, céu.
    expect((buttons[0] as HTMLButtonElement).disabled).toBe(true)
    expect((buttons[1] as HTMLButtonElement).disabled).toBe(false)
    expect((buttons[2] as HTMLButtonElement).disabled).toBe(true)
    await click(buttons[1] as HTMLButtonElement)
    await waitFor(() => expect(adapter.importCalls).toEqual(['t1']))
    await waitFor(() => {
      const asset = useProjectStore.getState().project?.assets?.[0]
      expect(asset?.kind).toBe('image')
      expect(asset?.libId).toBe('personal:t1')
      // A textura é imagem, mas quem a edita é o Molda (o "✏️ Editar" abre lá).
      expect(asset?.libOrigin).toBe('molda')
      expect(asset?.name).toBe('grama-do-molda')
    })
    expect(await screen.findByText('✓ no projeto')).not.toBeNull()
  })

  it('requires the reported consent before importing and preserves the project link', async () => {
    seedProject({ with3D: true })
    const delegate = fakeAdapter()
    const attempts: Array<string | undefined> = []
    const adapter = fakeAdapter({
      import: async (id, options) => {
        attempts.push(options?.acceptedReview)
        if (options?.acceptedReview !== 'revision-1')
          return {
            ok: false,
            code: 'needs-review',
            error: 'Confira',
            review: { token: 'revision-1', losses: ['Uma peça escondida fica fora desta cópia.'] },
          }
        return delegate.import(id)
      },
    })
    await openDialog(adapter)
    await screen.findByText('nave-cristal')
    await click(screen.getAllByRole('button', { name: 'Adicionar ao projeto' })[0]!)
    await screen.findByRole('region', { name: 'O que muda nesta cópia' })
    expect(
      useProjectStore.getState().project!.assets?.some((asset) => asset.libId === 'personal:m1'),
    ).toBe(false)
    await click(screen.getByRole('button', { name: 'Aceitar mudanças e adicionar' }))
    await waitFor(() =>
      expect(
        useProjectStore.getState().project!.assets?.some((asset) => asset.libId === 'personal:m1'),
      ).toBe(true),
    )
    expect(attempts).toEqual([undefined, 'revision-1'])
    expect(delegate.importCalls).toEqual(['m1'])
  })

  it('COM o Jogo 3D instalado: o modelo entra como model3d (com o nome do arquivo) e o céu como environment3d', async () => {
    seedProject({ with3D: true })
    const adapter = fakeAdapter()
    await openDialog(adapter)
    await screen.findByText('nave-cristal')
    expect(screen.queryByRole('note')).toBeNull()
    const buttons = screen.getAllByRole('button', { name: 'Adicionar ao projeto' })
    await click(buttons[0] as HTMLButtonElement)
    await waitFor(() => expect(adapter.importCalls).toEqual(['m1']))
    await waitFor(() => {
      const asset = useProjectStore
        .getState()
        .project?.assets?.find((a) => a.name === 'nave-cristal')
      expect(asset?.kind).toBe('model3d')
      expect(asset?.originalFileName).toBe('nave-cristal.glb')
      expect(asset?.libId).toBe('personal:m1')
      expect(asset?.libOrigin).toBe('molda')
      expect(asset?.libRevision).toBe(7)
    })
    // Fica aberta (multi-import): o céu entra na sequência.
    const skyButton = screen
      .getAllByRole('button', { name: 'Adicionar ao projeto' })
      .at(-1) as HTMLButtonElement
    await click(skyButton)
    await waitFor(() => expect(adapter.importCalls).toEqual(['m1', 's1']))
    await waitFor(() => {
      const sky = useProjectStore.getState().project?.assets?.find((a) => a.name === 'ceu-de-tarde')
      expect(sky?.kind).toBe('environment3d')
      expect(sky?.originalFileName).toBe('ceu-de-tarde.hdr')
    })
    expect(screen.getAllByText('✓ no projeto')).toHaveLength(2)
  })

  it('erro do adapter aparece na modal; criação apagada (not-found) sai da lista', async () => {
    seedProject({ with3D: true })
    const adapter = fakeAdapter({
      import: async () => ({ ok: false, error: 'sumiu do Molda', code: 'not-found' }),
    })
    await openDialog(adapter)
    await screen.findByText('nave-cristal')
    await click(
      screen.getAllByRole('button', { name: 'Adicionar ao projeto' })[0] as HTMLButtonElement,
    )
    expect(await screen.findByRole('alert')).not.toBeNull()
    expect(screen.getByText('sumiu do Molda')).not.toBeNull()
    await waitFor(() => expect(screen.queryByText('nave-cristal')).toBeNull())
  })

  it('lista rejeitada mostra erro com "Tentar de novo"', async () => {
    let calls = 0
    const adapter = fakeAdapter({
      list: async () => {
        calls += 1
        if (calls === 1) throw new Error('fora do ar')
        return CREATIONS
      },
    })
    await openDialog(adapter)
    expect(
      await screen.findByText('Não consegui abrir a sua galeria do Molda agora.'),
    ).not.toBeNull()
    await click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByText('nave-cristal')).not.toBeNull()
  })
})

it('importa e resolve colisão de nome na instância montada, preservando a store global', async () => {
  const stores = createStudioStores()
  const project = createEmptyProject('instancia-do-jogo', 'Jogo aberto')
  stores.project.setState({ project })
  expect(stores.project.getState().addAsset({ name: 'grama-do-molda', dataUrl: PNG })).toBeNull()
  render(
    <StudioStoresContext.Provider value={stores}>
      <StudioMoldaLibraryProvider value={fakeAdapter()}>
        <MoldaImportDialog onClose={() => {}} />
      </StudioMoldaLibraryProvider>
    </StudioStoresContext.Provider>,
  )
  await screen.findByText('grama-do-molda')
  const importButton = screen
    .getAllByRole('button', { name: 'Adicionar ao projeto' })
    .find((button) => !(button as HTMLButtonElement).disabled)!
  await click(importButton)
  await screen.findByText('✓ no projeto')
  expect(stores.project.getState().project?.assets?.map((asset) => asset.name)).toEqual([
    'grama-do-molda',
    'grama-do-molda-2',
  ])
  expect(stores.project.getState().project?.assets?.[1]?.libId).toBe('personal:t1')
  expect(useProjectStore.getState().project?.assets).toEqual([])
})

describe('régua pura', () => {
  it('filterMoldaCreations: vazio devolve tudo; acento/caixa não importam', () => {
    expect(filterMoldaCreations(CREATIONS, '')).toHaveLength(3)
    expect(filterMoldaCreations(CREATIONS, 'CÉU').map((c) => c.id)).toEqual(['s1'])
    expect(filterMoldaCreations(CREATIONS, 'nave').map((c) => c.id)).toEqual(['m1'])
  })

  it('moldaCreationNeeds3D: só a textura dispensa consumidor 3D', () => {
    expect(moldaCreationNeeds3D('model')).toBe(true)
    expect(moldaCreationNeeds3D('sky')).toBe(true)
    expect(moldaCreationNeeds3D('texture')).toBe(false)
  })

  it('projectHas3DConsumer: o kit Jogo 3D conta (desde os blocos do Molda), como o Avançado, o Mundo 3D e o Canvas 3D', () => {
    const empty = createEmptyProject('p', 'x')
    expect(projectHas3DConsumer(empty)).toBe(false)
    expect(projectHas3DConsumer({ ...empty, kind: 'pro' })).toBe(true)
    for (const id of ['game-3d', 'game-3d-advanced', 'world-3d']) {
      const p = createEmptyProject('p', 'x')
      p.installedExtensions = [{ id, version: '1.0.0', installedAt: 0 }]
      expect(projectHas3DConsumer(p)).toBe(true)
    }
    const canvas3d = createEmptyProject('p', 'x')
    canvas3d.files = { ...canvas3d.files, 'script.js': "import * as THREE from 'three'\n" }
    expect(projectHas3DConsumer(canvas3d)).toBe(true)
    expect(projectHas3DConsumer(null)).toBe(false)
  })
})

describe('Cenários na mesma galeria do Molda', () => {
  const abrir = async (fonte: NonNullable<MoldaLibraryAdapter['cenarios']>) => {
    await openDialog(fakeAdapter({ cenarios: fonte }))
    await click(await screen.findByRole('button', { name: 'Cenários' }))
    await screen.findByText('Praça da Faísca')
  }
  it('traz a cena real pela interface, conserva o programa e mostra a revisão no projeto', async () => {
    seedProject({ with3D: true })
    const { fonte } = await criarFonteDeCenarioDeEnsaio(),
      antes = { ...useProjectStore.getState().project!.files }
    await abrir(fonte)
    await click(screen.getByRole('button', { name: 'Adicionar ao projeto' }))
    await screen.findByText('Cenário “Praça da Faísca” adicionado ao projeto.')
    const projeto = useProjectStore.getState().project!
    expect(projeto.files).toEqual(antes)
    expect(projeto.assets?.filter((a) => a.kind === 'scene3d')).toHaveLength(1)
    expect(projeto.assets?.some((a) => a.libId?.startsWith('personal:'))).toBe(false)
    expect(
      (screen.getByRole('button', { name: '✓ no projeto' }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })
  it('permissão ausente mantém a galeria antiga sem oferecer cenários', async () => {
    const { fonte } = await criarFonteDeCenarioDeEnsaio()
    fonte.disponivel = async () => false
    await openDialog(fakeAdapter({ cenarios: fonte }))
    await screen.findByText('nave-cristal')
    expect(screen.queryByRole('button', { name: 'Cenários' })).toBeNull()
  })
  it('uma revisão alterada pode ser atualizada na mesma janela, sem importar a revisão antiga', async () => {
    seedProject({ with3D: true })
    const { fonte, host, resumo } = await criarFonteDeCenarioDeEnsaio()
    await abrir(fonte)
    const aberto = await host.abrirCenario(resumo.id)
    await host.editarCenario(
      resumo.id,
      resumo.revisao,
      [{ tipo: 'cenario.restaurar', documento: { ...aberto.documento, nome: 'Praça revisada' } }],
      'outra-janela',
    )
    await click(screen.getByRole('button', { name: 'Adicionar ao projeto' }))
    await screen.findByRole('alert')
    expect(useProjectStore.getState().project?.assets).toEqual([])
    await click(screen.getByRole('button', { name: 'Atualizar cenários' }))
    await screen.findByText(/Revisão 1/)
    await click(screen.getByRole('button', { name: 'Adicionar ao projeto' }))
    await screen.findByText(/adicionado ao projeto\./)
    const cena = useProjectStore.getState().project?.assets?.find((a) => a.kind === 'scene3d')
    expect(cena).toBeDefined()
  })
  it('erro de acesso fica visível e pode ser repetido, sem ser confundido com falta de permissão', async () => {
    const { fonte } = await criarFonteDeCenarioDeEnsaio()
    let pedidos = 0
    fonte.disponivel = async () => {
      if (++pedidos === 1) throw Error('Falha de conexão do ensaio')
      return true
    }
    await openDialog(fakeAdapter({ cenarios: fonte }))
    await screen.findByText('Falha de conexão do ensaio')
    await click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await screen.findByRole('button', { name: 'Cenários' })
    expect(pedidos).toBe(2)
  })
  it('Python com release anterior informa a incompatibilidade antes de preparar recursos', async () => {
    const { project, environment } = await pythonEnvironmentFixture('classic'),
      { fonte } = await criarFonteDeCenarioDeEnsaio()
    project.installedExtensions = [{ ...RAYLIB_3D_EXTENSION, installedAt: 1 }]
    useProjectStore.setState({ project, isDirty: false })
    let preparos = 0
    const real = fonte.preparar
    fonte.preparar = (...args) => {
      preparos++
      return real(...args)
    }
    render(
      <StudioRuntimeEnvironmentProvider value={environment}>
        <StudioMoldaLibraryProvider value={fakeAdapter({ cenarios: fonte })}>
          <AssetsPanel open onClose={() => {}} />
        </StudioMoldaLibraryProvider>
      </StudioRuntimeEnvironmentProvider>,
    )
    await goTo3DTab()
    await click(await screen.findByRole('button', { name: /Trazer do Molda/ }))
    await click(await screen.findByRole('button', { name: 'Cenários' }))
    await screen.findByText(/ambiente deste projeto precisa ser atualizado para receber cenários/)
    await screen.findByText('Praça da Faísca')
    expect(
      (screen.getByRole('button', { name: 'Adicionar ao projeto' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(preparos).toBe(0)
    expect(useProjectStore.getState().project?.assets).toEqual([])
  })
  for (const kind of ['classic', 'pro'] as const) {
    it(`Python ${kind} traz pela janela offline, preserva a fonte e oferece o módulo para usar`, async () => {
      const { project } = await pythonEnvironmentFixture(kind),
        { fonte } = await criarFonteDeCenarioDeEnsaio()
      project.installedExtensions = [{ ...RAYLIB_3D_EXTENSION, installedAt: 1 }]
      const principal =
        project.kind === 'pro'
          ? project.tree[project.python.entrypoint]
          : project.files[project.python.entrypoint]
      useProjectStore.setState({ project, isDirty: false })
      await abrir(fonte)
      await click(screen.getByRole('button', { name: 'Adicionar ao projeto' }))
      await screen.findByText('Cenário “Praça da Faísca” adicionado ao projeto.')
      const atual = useProjectStore.getState().project!
      if (atual.programmingLanguage !== 'python') throw Error('fixture')
      expect(
        atual.kind === 'pro'
          ? atual.tree[atual.python.entrypoint]
          : atual.files[atual.python.entrypoint],
      ).toEqual(principal)
      const cenario = atual.assets!.find((a) => a.kind === 'scene3d')!
      expect(cenario.cena3dPython?.modulo).toMatch(/\.py$/)
      const reinstalado = raylibRelocatedAssets(atual)
      expect('error' in reinstalado).toBe(false)
      if ('assets' in reinstalado) expect(reinstalado.assets).toEqual(atual.assets ?? [])
      const entradas = await editorAssetEntries(atual.assets!, 'python', {
          files: [],
          directories: [],
        }),
        entrada = entradas.find((a) => a.id === cenario.id)!,
        exemplo = pythonProAssetExample(entrada, 'main.py', atual)
      expect(exemplo?.code).toContain(
        `from ${cenario.cena3dPython!.modulo.slice(0, -3)} import carregar`,
      )
      expect(exemplo?.explanation).toContain('depois de init_window')
    })
  }
  for (const mudanca of ['edicao', 'projeto', 'perfil-aba', 'fechar'] as const) {
    it(`não entrega a cena preparada depois de ${mudanca}`, async () => {
      seedProject({ with3D: true })
      const { fonte } = await criarFonteDeCenarioDeEnsaio(),
        real = fonte.preparar,
        liberar = Promise.withResolvers<void>(),
        iniciou = Promise.withResolvers<AbortSignal>()
      fonte.preparar = async (...args) => {
        const resultado = await real(...args)
        iniciou.resolve(args[2].signal)
        await liberar.promise
        return resultado
      }
      await abrir(fonte)
      await click(screen.getByRole('button', { name: 'Adicionar ao projeto' }))
      const signal = await iniciou.promise,
        projeto = useProjectStore.getState().project!
      await act(async () => {
        if (mudanca === 'fechar') cleanup()
        else if (mudanca === 'perfil-aba') {
          setStorageNamespace('perfil-2')
          setStorageNamespace('perfil-1')
        } else
          useProjectStore.setState({
            project: {
              ...projeto,
              ...(mudanca === 'edicao' ? { name: 'Meu nome editado' } : { id: 'p2' }),
            },
          })
        liberar.resolve()
        await liberar.promise
      })
      if (mudanca === 'edicao') await screen.findByText(/O projeto mudou durante o preparo/)
      else await waitFor(() => expect(signal.aborted).toBe(true))
      expect(useProjectStore.getState().project?.assets?.some((a) => a.kind === 'scene3d')).toBe(
        false,
      )
      expect(useProjectStore.getState().project?.files).toEqual(projeto.files)
    })
  }
  it('mostra o excesso real e só usa junção quando a pessoa escolhe a alternativa', async () => {
    seedProject({ with3D: true })
    const { fonte, host, resumo } = await criarFonteDeCenarioDeEnsaio(49),
      real = fonte.preparar,
      escolhas: boolean[] = [],
      antes = JSON.stringify(await host.abrirCenario(resumo.id))
    fonte.preparar = (...args) => {
      escolhas.push(args[2].juntar)
      return real(...args)
    }
    await abrir(fonte)
    await click(screen.getByRole('button', { name: 'Adicionar ao projeto' }))
    const juntar = await screen.findByRole(
      'button',
      { name: 'Juntar peças estáticas e tentar novamente' },
      { timeout: 10000 },
    )
    expect(useProjectStore.getState().project?.assets).toEqual([])
    expect(escolhas).toEqual([false])
    await click(juntar)
    await screen.findByText(
      'Cenário “Praça da Faísca” adicionado ao projeto.',
      {},
      { timeout: 10000 },
    )
    expect(escolhas).toEqual([false, true])
    expect(screen.getByText('Aventura · licença restrita')).not.toBeNull()
    expect(JSON.stringify(await host.abrirCenario(resumo.id))).toBe(antes)
  }, 20000)
})

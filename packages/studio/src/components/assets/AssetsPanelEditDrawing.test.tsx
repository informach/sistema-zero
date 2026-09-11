import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { fakeUseStore } from '../../testing/fakeIdbStore'

/**
 * Botão "✏️ Editar" nos assets que vieram do Pinta (desenhos) e do Molda (modelos,
 * céus e texturas): no card do projeto SEMPRE que o host liga o callback da origem
 * (o registro na biblioteca pessoal é reparado no clique, não exigido antes).
 *
 * Arquivo à parte do `AssetsPanel.test.tsx` porque precisa do mock de idb-keyval
 * (a biblioteca pessoal vive no IndexedDB) — o registry de module mocks é global,
 * então cada arquivo carrega o seu.
 */
type KV = Map<IDBValidKey, unknown>
const dbs = new Map<string, KV>()
let failWrites = false
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
    if (failWrites) throw new Error('IndexedDB indisponível')
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
const { getPersonalAsset, savePersonalAsset, setPersonalAssetsNamespace } = await import(
  '../../asset-library/personal'
)
const { releaseDrawingSyncProfile } = await import('../../asset-library/personalSync')
const { setStorageNamespace } = await import('../../state/persistence')
const { useProjectStore } = await import('../../state/projectStore')
const { StudioEditCreationProvider } = await import('../../studio/edit-creation')
const { StudioEditDrawingProvider } = await import('../../studio/edit-drawing')
const { StudioMoldaLibraryProvider } = await import('../../studio/molda-library')
const { StudioPintaLibraryProvider } = await import('../../studio/pinta-library')
const { AssetsPanel } = await import('./AssetsPanel')
type ProjectAsset = import('#core').ProjectAsset
type MoldaLibraryAdapter = import('../../studio/molda-library').StudioMoldaLibraryAdapter
type PintaLibraryAdapter = import('../../studio/pinta-library').StudioPintaLibraryAdapter

const PNG = 'data:image/png;base64,AAAA'
// Assinatura GLB v2 ("glTF" + versão 2 + tamanho): o que o `isValidAssetDataUrl` confere.
const GLB = `data:model/gltf-binary;base64,${btoa(
  String.fromCharCode(0x67, 0x6c, 0x54, 0x46, 2, 0, 0, 0, 12, 0, 0, 0),
)}`

function seedProject(assets: ProjectAsset[]): void {
  const project = createEmptyProject('p1', 'Meu Jogo')
  project.assets = assets
  useProjectStore.setState({ project, isDirty: false, saveError: null })
}

/** Asset do projeto ligado ao desenho `d1` da biblioteca pessoal. */
function seedProjectWithDrawingAsset(libId = 'personal:d1', over: Partial<ProjectAsset> = {}) {
  seedProject([
    { id: 'a1', name: 'heroi', kind: 'image', dataUrl: PNG, source: 'library', libId, ...over },
  ])
}

function moldaModel(): ProjectAsset {
  return {
    id: 'a1',
    name: 'nave',
    kind: 'model3d',
    dataUrl: GLB,
    originalFileName: 'nave.glb',
    source: 'library',
    libId: 'personal:m1',
    libOrigin: 'molda',
  }
}

/** Deixa os efeitos assíncronos do painel (catálogos, persistência) assentarem. */
const flushEffects = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30))
  })

const throwingImport = async () => {
  throw new Error('não usado')
}
const emptyPinta: PintaLibraryAdapter = { list: async () => [], import: throwingImport }
const emptyMolda: MoldaLibraryAdapter = { list: async () => [], import: throwingImport }
/** Catálogo do Molda que conhece a textura `t-catalogo`. */
const moldaKnowingTexture: MoldaLibraryAdapter = {
  list: async () => [
    { id: 't-catalogo', name: 'grama', kind: 'texture', updatedAt: 1, thumbDataUrl: null },
  ],
  import: throwingImport,
}

/** "Trazer do Pinta" presente: a seção "Meus desenhos" some. */
const pintaLibrary: PintaLibraryAdapter = {
  list: async () => [],
  import: async () => {
    throw new Error('não usado')
  },
}

function renderPanel(
  onEditDrawing: ((id: string) => void) | null,
  options: {
    onEditCreation?: (id: string) => void
    withPintaLibrary?: boolean
    pintaLibrary?: PintaLibraryAdapter | null
    moldaLibrary?: MoldaLibraryAdapter | null
  } = {},
) {
  const providedPintaLibrary =
    options.pintaLibrary === undefined
      ? options.withPintaLibrary
        ? pintaLibrary
        : null
      : options.pintaLibrary
  return render(
    <StudioPintaLibraryProvider value={providedPintaLibrary}>
      <StudioMoldaLibraryProvider value={options.moldaLibrary ?? null}>
        <StudioEditDrawingProvider value={onEditDrawing}>
          <StudioEditCreationProvider value={options.onEditCreation ?? null}>
            <AssetsPanel open onClose={() => {}} />
          </StudioEditCreationProvider>
        </StudioEditDrawingProvider>
      </StudioMoldaLibraryProvider>
    </StudioPintaLibraryProvider>,
  )
}

beforeEach(async () => {
  dbs.clear()
  failWrites = false
  localStorage.clear()
  releaseDrawingSyncProfile('perfil-1')
  setStorageNamespace('perfil-1')
  setPersonalAssetsNamespace('perfil-1')
  await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG })
})

afterEach(() => {
  cleanup()
  releaseDrawingSyncProfile('perfil-1')
  setStorageNamespace('')
  setPersonalAssetsNamespace('')
  useProjectStore.setState({ project: null, isDirty: false, saveError: null })
})

describe('AssetsPanel — "✏️ Editar" nos assets que vieram do Pinta e do Molda', () => {
  it('aparece em "Meus desenhos" E no card do projeto quando o host liga o callback', async () => {
    seedProjectWithDrawingAsset()
    renderPanel(() => {})
    await waitFor(() => expect(screen.getByRole('button', { name: /^✏️ Editar$/ })).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Editar heroi no Pinta' })).toBeTruthy()
  })

  it('entrega o id do desenho do Pinta (não o id do asset do projeto)', async () => {
    seedProjectWithDrawingAsset()
    const abertos: string[] = []
    renderPanel((id) => abertos.push(id))
    fireEvent.click(await screen.findByRole('button', { name: 'Editar heroi no Pinta' }))
    await waitFor(() => expect(abertos).toEqual(['d1']))
  })

  it('com o "Trazer do Pinta" presente a seção some, mas o card do projeto CONTINUA com o botão', async () => {
    seedProjectWithDrawingAsset()
    renderPanel(() => {}, { withPintaLibrary: true })
    await screen.findByRole('button', { name: 'Editar heroi no Pinta' })
    expect(screen.queryByRole('button', { name: /^✏️ Editar$/ })).toBeNull()
  })

  it('sem o callback do host (aula/admin) nenhum botão aparece', async () => {
    seedProjectWithDrawingAsset()
    renderPanel(null)
    await waitFor(() => expect(screen.getAllByAltText('heroi').length).toBeGreaterThan(0))
    expect(screen.queryByRole('button', { name: /editar/i })).toBeNull()
  })

  it('registro pessoal AUSENTE (outro aparelho): o botão fica, o clique abre e REPARA a biblioteca em segundo plano', async () => {
    seedProjectWithDrawingAsset('personal:sumiu', { libOrigin: 'pinta', libRevision: 77 })
    const abertos: string[] = []
    renderPanel((id) => abertos.push(id))
    fireEvent.click(await screen.findByRole('button', { name: 'Editar heroi no Pinta' }))
    expect(abertos).toEqual(['sumiu'])
    await waitFor(async () => {
      const repaired = await getPersonalAsset('sumiu')
      // O nome pode ganhar sufixo (o `d1` da biblioteca já se chama "heroi"); a revisão
      // do projeto (`libRevision`) vira o `updatedAt` do registro reparado.
      expect(repaired).toMatchObject({ id: 'sumiu', kind: 'image', dataUrl: PNG, updatedAt: 77 })
      expect(repaired?.name).toMatch(/^heroi/)
    })
  })

  it('abre o app de forma SÍNCRONA dentro do clique (o WebKit bloqueia popup aberto depois de um await)', async () => {
    seedProjectWithDrawingAsset('personal:sumiu', { libOrigin: 'pinta', libRevision: 77 })
    const abertos: string[] = []
    renderPanel((id) => abertos.push(id))
    const button = await screen.findByRole('button', { name: 'Editar heroi no Pinta' })

    fireEvent.click(button)

    // Nenhum `await` entre o clique e a asserção: o `open` tem que ter acontecido ANTES de
    // qualquer microtask (o IndexedDB do reparo fica atrás dele, nunca na frente).
    expect(abertos).toEqual(['sumiu'])
    // Só para o reparo em segundo plano assentar dentro de `act` antes de desmontar.
    await flushEffects()
  })

  it('quando o reparo da biblioteca falha, o app abre MESMO assim e o aviso diz que o jogo não se atualiza sozinho', async () => {
    seedProjectWithDrawingAsset('personal:sumiu', { libOrigin: 'pinta', libRevision: 77 })
    const abertos: string[] = []
    renderPanel((id) => abertos.push(id))
    failWrites = true

    fireEvent.click(await screen.findByRole('button', { name: 'Editar heroi no Pinta' }))

    expect(abertos).toEqual(['sumiu'])
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/não vai se atualizar sozinho/)
    expect(alert.textContent).toContain('Pinta')
    expect(await getPersonalAsset('sumiu')).toBeNull()
  })

  it('imagem enviada do computador nunca oferece editar', async () => {
    seedProject([{ id: 'a1', name: 'foto', kind: 'image', dataUrl: PNG, source: 'upload' }])
    renderPanel(() => {})
    await waitFor(() => screen.getByRole('button', { name: /^✏️ Editar$/ }))
    expect(screen.queryByRole('button', { name: /editar foto/i })).toBeNull()
  })

  it('textura do Molda (imagem com libOrigin molda) abre o MOLDA, nunca o Pinta', async () => {
    seedProject([
      {
        id: 'a1',
        name: 'grama',
        kind: 'image',
        dataUrl: PNG,
        source: 'library',
        libId: 'personal:t1',
        libOrigin: 'molda',
      },
    ])
    const desenhos: string[] = []
    const criacoes: string[] = []
    renderPanel((id) => desenhos.push(id), { onEditCreation: (id) => criacoes.push(id) })
    fireEvent.click(await screen.findByRole('button', { name: 'Editar grama no Molda' }))
    await waitFor(() => expect(criacoes).toEqual(['t1']))
    expect(desenhos).toEqual([])
    expect(screen.queryByRole('button', { name: /grama no Pinta/ })).toBeNull()
  })

  it('legado sem libOrigin: a origem vem do registro pessoal (textura gravada antes do campo)', async () => {
    await savePersonalAsset({ id: 't2', name: 'grama', dataUrl: PNG, origin: 'molda' })
    seedProject([
      {
        id: 'a1',
        name: 'grama',
        kind: 'image',
        dataUrl: PNG,
        source: 'library',
        libId: 'personal:t2',
      },
    ])
    renderPanel(() => {}, { onEditCreation: () => {} })
    await screen.findByRole('button', { name: 'Editar grama no Molda' })
  })

  it('legado sem registro local resolve a origem pelo catálogo do Molda e a persiste', async () => {
    seedProject([
      {
        id: 'a1',
        name: 'grama',
        kind: 'image',
        dataUrl: PNG,
        source: 'library',
        libId: 'personal:t-catalogo',
      },
    ])
    renderPanel(() => {}, { onEditCreation: () => {}, moldaLibrary: moldaKnowingTexture })

    await screen.findByRole('button', { name: 'Editar grama no Molda' })
    await waitFor(() =>
      expect(useProjectStore.getState().project?.assets?.[0]?.libOrigin).toBe('molda'),
    )
  })

  it('legado de imagem ainda ambíguo (os DOIS catálogos responderam e nenhum a conhece) não adivinha Pinta e pede nova importação', async () => {
    seedProjectWithDrawingAsset('personal:sem-origem')
    renderPanel(() => {}, {
      onEditCreation: () => {},
      pintaLibrary: emptyPinta,
      moldaLibrary: emptyMolda,
    })

    const aviso = await screen.findByText(/Traga ele de novo pelo Pinta ou pelo Molda/)
    expect(aviso.className).toContain('text-sz-warn')
    expect(aviso.className).toContain('text-xs')
    expect(screen.queryByRole('button', { name: /Editar heroi/ })).toBeNull()
  })

  it('sem biblioteca nenhuma (bloco de aula, admin) o legado ambíguo fica SEM aviso: ninguém consultou catálogo', async () => {
    seedProjectWithDrawingAsset('personal:sem-origem')
    renderPanel(() => {}, { onEditCreation: () => {} })

    await waitFor(() => expect(screen.getAllByAltText('heroi').length).toBeGreaterThan(0))
    await flushEffects()
    expect(screen.queryByText(/Traga ele de novo/)).toBeNull()
    expect(screen.queryByRole('button', { name: /Editar heroi/ })).toBeNull()
  })

  it('catálogo que REJEITA não vira "ambíguo": sem aviso, e a causa vai para o console.warn', async () => {
    seedProjectWithDrawingAsset('personal:sem-origem')
    const offlinePinta: PintaLibraryAdapter = {
      list: async () => {
        throw new Error('galeria fora do ar')
      },
      import: throwingImport,
    }
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      renderPanel(() => {}, {
        onEditCreation: () => {},
        pintaLibrary: offlinePinta,
        moldaLibrary: emptyMolda,
      })

      await waitFor(() =>
        expect(warn).toHaveBeenCalledWith('[estudio] catálogo indisponível', expect.any(Error)),
      )
      await flushEffects()
      expect(screen.queryByText(/Traga ele de novo/)).toBeNull()
      expect(screen.queryByRole('button', { name: /Editar heroi/ })).toBeNull()
    } finally {
      warn.mockRestore()
    }
  })

  it('sem namespace pessoal (embed sem biblioteca) o painel mostra o botão pelo catálogo mas NÃO grava libOrigin nem suja o projeto', async () => {
    setPersonalAssetsNamespace('')
    seedProject([
      {
        id: 'a1',
        name: 'grama',
        kind: 'image',
        dataUrl: PNG,
        source: 'library',
        libId: 'personal:t-catalogo',
      },
    ])
    renderPanel(() => {}, { onEditCreation: () => {}, moldaLibrary: moldaKnowingTexture })

    await screen.findByRole('button', { name: 'Editar grama no Molda' })
    await flushEffects()
    expect(useProjectStore.getState().project?.assets?.[0]?.libOrigin).toBeUndefined()
    expect(useProjectStore.getState().isDirty).toBe(false)
  })

  it('o palpite pelo kind (3D sem registro nem catálogo) serve ao botão, mas NUNCA é gravado no projeto', async () => {
    seedProject([{ ...moldaModel(), libOrigin: undefined }])
    renderPanel(() => {}, { onEditCreation: () => {} })

    await screen.findByRole('button', { name: 'Editar nave no Molda' })
    await flushEffects()
    expect(useProjectStore.getState().project?.assets?.[0]?.libOrigin).toBeUndefined()
    expect(useProjectStore.getState().isDirty).toBe(false)
  })

  it('modelo .glb do Molda: o card de Modelos 3D entrega o id da criação e repara o registro 3D', async () => {
    seedProject([moldaModel()])
    const criacoes: string[] = []
    renderPanel(() => {}, { onEditCreation: (id) => criacoes.push(id) })
    fireEvent.click(await screen.findByRole('button', { name: 'Editar nave no Molda' }))
    await waitFor(() => expect(criacoes).toEqual(['m1']))
    expect(await getPersonalAsset('m1')).toMatchObject({
      kind: 'model3d',
      origin: 'molda',
      originalFileName: 'nave.glb',
      dataUrl: GLB,
    })
  })

  it('sem o callback do Molda, o modelo do Molda fica sem botão (mesmo com o do Pinta ligado)', async () => {
    seedProject([moldaModel()])
    renderPanel(() => {})
    await waitFor(() => screen.getByRole('button', { name: /^✏️ Editar$/ }))
    expect(screen.queryByRole('button', { name: /Editar nave/ })).toBeNull()
  })
})

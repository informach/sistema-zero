import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { fakeUseStore } from '../../../testing/fakeIdbStore'

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

// The gallery games' Pinta documents: the real chunks are large and regenerated elsewhere.
mock.module('../../../examples/python/pygameGames.loaders.generated', () => ({
  PYGAME_GAME_LOADERS: { 'space-shooter': async () => ({ files: {}, media: {} }) },
  PYGAME_GAME_DRAWINGS: { 'space-shooter': async () => '{"jogo":"space-shooter"}' },
}))

const { createEmptyProject } = await import('#core')
const { getPersonalAsset, savePersonalAsset, setPersonalAssetsNamespace } = await import(
  '../../../asset-library/personal'
)
const { releaseDrawingSyncProfile } = await import('../../../asset-library/personalSync')
const { setStorageNamespace } = await import('../../../state/persistence')
const { useProjectStore } = await import('../../../state/projectStore')
const { documentFixture } = await import('../../../state/fixtures/projectDocuments')
const { refinePythonProjectDocument } = await import('../../../state/pythonProjectValidation')
const { StudioEditCreationProvider } = await import('../../../studio/edit-creation')
const { StudioEditDrawingProvider } = await import('../../../studio/edit-drawing')
const { StudioMoldaLibraryProvider } = await import('../../../studio/molda-library')
const { StudioPintaLibraryProvider } = await import('../../../studio/pinta-library')
const { AssetsPanel } = await import('../AssetsPanel')
type ProjectAsset = import('#core').ProjectAsset
type MoldaLibraryAdapter = import('../../../studio/molda-library').StudioMoldaLibraryAdapter
type PintaLibraryAdapter = import('../../../studio/pinta-library').StudioPintaLibraryAdapter

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

/**
 * Vai para a aba dos modelos 3D (onde o .glb e o céu moram desde 18/09/2026). A
 * aba existe por CONTEÚDO — basta o projeto ter um arquivo 3D —, então ela está
 * lá mesmo sem extensão 3D instalada.
 */
const irParaModelos3D = async () => {
  const aba = await screen.findByRole('tab', { name: 'Modelos 3D' })
  await act(async () => {
    fireEvent.click(aba)
  })
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
  onEditDrawing: ((id: string, tab?: Window | null) => void) | null,
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

  for (const kind of ['classic', 'pro'] as const) {
    it(`${kind}: editing a captured Python frame never repairs the canonical personal drawing with derived bytes`, async () => {
      const dataUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1QAAAAASUVORK5CYII='
      const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]!), (char) => char.charCodeAt(0))
      const sha256 = Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
        (byte) => byte.toString(16).padStart(2, '0'),
      ).join('')
      const project = await refinePythonProjectDocument({
        ...documentFixture('python', kind),
        assets: [
          {
            id: 'captured',
            name: 'quadro',
            kind: 'image',
            source: 'library',
            libId: 'personal:absent-source',
            libOrigin: 'pinta',
            dataUrl,
            width: 1,
            height: 1,
            proPath: 'assets/quadro.png',
            pintaImage: {
              recipe: {
                version: 1,
                algorithm: 'pinta-image-1',
                drawingId: 'absent-source',
                selection: { kind: 'frame', animationId: 'andar', frameIndex: 1 },
                scale: 1,
              },
              provenance: { sourceSha256: 'a'.repeat(64), dependencies: [] },
              output: { mime: 'image/png', width: 1, height: 1, bytes: bytes.length, sha256 },
            },
          },
        ],
      })
      useProjectStore.setState({ project, isDirty: false, saveError: null })
      const open = mock(() => {})
      renderPanel(open)
      // Let the initial failed recipe inspection finish before exercising the edit intent.
      await screen.findByRole('alert')
      fireEvent.click(await screen.findByRole('button', { name: 'Editar quadro no Pinta' }))
      expect(open).toHaveBeenCalledWith('absent-source')
      await screen.findByText(
        'A imagem foi mantida. Para atualizar, recupere o desenho original no Pinta.',
      )
      expect(await getPersonalAsset('absent-source')).toBeNull()
      expect(useProjectStore.getState().project).toBe(project)
    })
  }

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

    await irParaModelos3D()
    await screen.findByRole('button', { name: 'Editar nave no Molda' })
    await flushEffects()
    expect(useProjectStore.getState().project?.assets?.[0]?.libOrigin).toBeUndefined()
    expect(useProjectStore.getState().isDirty).toBe(false)
  })

  it('modelo .glb do Molda: o card de Modelos 3D entrega o id da criação e repara o registro 3D', async () => {
    seedProject([moldaModel()])
    const criacoes: string[] = []
    renderPanel(() => {}, { onEditCreation: (id) => criacoes.push(id) })
    await irParaModelos3D()
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
    await irParaModelos3D()
    expect(screen.queryByRole('button', { name: /Editar nave/ })).toBeNull()
  })
})

describe('AssetsPanel — desenhos dos jogos de exemplo (Pygame-ce) vão ao Pinta só no clique', () => {
  const PLAIN_PNG =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1QAAAAASUVORK5CYII='
  /** The 1×1 PNG with the `pinta` iTXt right after IHDR, as Pinta writes a sheet. */
  async function sheetPng() {
    const plain = Uint8Array.from(atob(PLAIN_PNG), (char) => char.charCodeAt(0))
    const crc = (bytes: Uint8Array) => {
      let value = 0xffffffff
      for (const byte of bytes) {
        value ^= byte
        for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0)
      }
      return (value ^ 0xffffffff) >>> 0
    }
    const body = new Uint8Array([
      ...new TextEncoder().encode('pinta'),
      0,
      1,
      0,
      0,
      0,
      0x78,
      0x9c,
      3,
      0,
      0,
      0,
      0,
      1,
    ])
    const typed = new Uint8Array([...new TextEncoder().encode('iTXt'), ...body])
    const chunk = new Uint8Array(12 + body.length)
    const view = new DataView(chunk.buffer)
    view.setUint32(0, body.length)
    chunk.set(typed, 4)
    view.setUint32(8 + body.length, crc(typed))
    const bytes = new Uint8Array([...plain.subarray(0, 33), ...chunk, ...plain.subarray(33)])
    const sha256 = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
      (byte) => byte.toString(16).padStart(2, '0'),
    ).join('')
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return { dataUrl: `data:image/png;base64,${btoa(binary)}`, bytes: bytes.length, sha256 }
  }

  async function seedGalleryGame() {
    const raw = documentFixture('python', 'classic')
    raw.installedExtensions = [{ id: 'python-pygame', version: '1.0.0', installedAt: 1 }]
    raw.assets = [
      {
        id: 'space-shooter-assets-nave.png',
        name: 'nave',
        kind: 'image',
        source: 'library',
        libId: 'example-pygame:space-shooter:nave',
        dataUrl: `data:image/png;base64,${PLAIN_PNG}`,
        proPath: 'assets/nave.png',
        license: { name: 'Sistema Zero', attribution: 'Desenho original.' },
      },
    ]
    useProjectStore.setState({
      project: await refinePythonProjectDocument(raw),
      editingAccess: 'author',
      isDirty: false,
      saveError: null,
    })
  }

  function exampleAdapter() {
    const imports: Array<{ json: string; ids: string[]; origin?: string }> = []
    const recipes: unknown[] = []
    const adapter: PintaLibraryAdapter = {
      list: async () => [],
      importDrawings: async (input) => {
        imports.push(structuredClone(input))
        return {
          ok: true,
          drawings: [
            {
              sourceId: 'space-shooter-nave',
              id: 'pinta-nave',
              name: 'nave',
              imageSelection: {
                kind: 'frame',
                width: 1,
                height: 1,
                animations: [{ id: 'voar', name: 'voar', frameCount: 1 }],
                sheet: { width: 1, height: 1 },
              },
            },
          ],
        }
      },
      import: async (id, options) => {
        const recipe = options?.image?.recipe
        if (!recipe) throw new Error('Explicit recipe required')
        recipes.push(structuredClone(recipe))
        const sheet = await sheetPng()
        // The real host also saves the canonical drawing in the personal library.
        await savePersonalAsset({ id, name: 'nave', dataUrl: sheet.dataUrl })
        return {
          ok: true,
          asset: {
            id,
            name: 'nave',
            dataUrl: sheet.dataUrl,
            width: 1,
            height: 1,
            libRevision: 9,
            pintaImage: {
              recipe,
              provenance: { sourceSha256: 'a'.repeat(64), dependencies: [] },
              output: {
                mime: 'image/png' as const,
                width: 1,
                height: 1,
                bytes: sheet.bytes,
                sha256: sheet.sha256,
              },
            },
          },
        }
      },
    }
    return { adapter, imports, recipes }
  }

  /** The tab the panel opens inside the click (Safari blocks one opened after an await). */
  function stubTab() {
    const tab = {
      closed: false,
      opener: {} as unknown,
      document: { title: '', body: { textContent: '' } },
      close() {
        tab.closed = true
      },
    }
    const spy = spyOn(window, 'open').mockImplementation(() => tab as unknown as Window)
    return { tab, spy }
  }

  it('1º clique abre a aba JÁ no clique, copia, liga o material no mesmo nome/arquivo e a leva ao Pinta; o 2º só abre', async () => {
    await seedGalleryGame()
    const fake = exampleAdapter()
    const { tab, spy } = stubTab()
    const opened: Array<[string, Window | null | undefined]> = []
    renderPanel((id, target) => opened.push([id, target]), { pintaLibrary: fake.adapter })
    const button = await screen.findByRole('button', { name: 'Editar nave no Pinta' })
    fireEvent.click(button)
    // Synchronously, inside the click: before the copy, the import or any await.
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0]).toEqual(['', '_blank'])
    expect(tab.opener).toBeNull()
    expect(tab.document.body.textContent).toContain('Preparando o desenho')
    expect(fake.imports).toEqual([])
    await waitFor(() => expect(opened.map(([id]) => id)).toEqual(['pinta-nave']))
    // The host receives that same tab and only navigates it.
    expect(opened[0]?.[1]).toBe(tab as unknown as Window)
    expect(tab.closed).toBe(false)
    // The origin makes Pinta reuse an existing copy of the same document (one per drawing).
    expect(fake.imports).toEqual([
      {
        json: '{"jogo":"space-shooter"}',
        ids: ['space-shooter-nave'],
        origin: 'example-pygame:space-shooter',
      },
    ])
    expect(fake.recipes).toEqual([
      {
        version: 1,
        algorithm: 'pinta-image-1',
        drawingId: 'pinta-nave',
        selection: { kind: 'spritesheet' },
        scale: 2,
      },
    ])
    const [asset] = useProjectStore.getState().project?.assets ?? []
    expect(asset).toMatchObject({
      id: 'space-shooter-assets-nave.png',
      name: 'nave',
      proPath: 'assets/nave.png',
      source: 'library',
      libId: 'personal:pinta-nave',
      libOrigin: 'pinta',
      libRevision: 9,
      license: { name: 'Sistema Zero', attribution: 'Desenho original.' },
    })
    expect(asset?.pintaImage?.recipe.selection).toEqual({ kind: 'spritesheet' })
    // Now a normal Pinta material: a second click opens without a second copy.
    fireEvent.click(await screen.findByRole('button', { name: 'Editar nave no Pinta' }))
    await waitFor(() => expect(opened.map(([id]) => id)).toEqual(['pinta-nave', 'pinta-nave']))
    await flushEffects()
    expect(fake.imports).toHaveLength(1)
    expect(fake.recipes).toHaveLength(1)
    // The ordinary path: the host opens its own tab synchronously, no prepared one.
    expect(spy).toHaveBeenCalledTimes(1)
    expect(opened[1]?.[1]).toBeUndefined()
    spy.mockRestore()
  })

  it('sem a capacidade de copiar do host, o desenho de exemplo fica como antes (sem botão)', async () => {
    await seedGalleryGame()
    const { importDrawings: _absent, ...withoutCopy } = exampleAdapter().adapter
    renderPanel(() => {}, { pintaLibrary: withoutCopy })
    await waitFor(() => expect(screen.getAllByAltText('nave').length).toBeGreaterThan(0))
    expect(screen.queryByRole('button', { name: 'Editar nave no Pinta' })).toBeNull()
  })

  it('a falha da cópia aparece e não liga nem abre nada', async () => {
    await seedGalleryGame()
    const fake = exampleAdapter()
    fake.adapter.importDrawings = async () => ({
      ok: false,
      error: 'A sua galeria do Pinta está cheia.',
    })
    const { tab, spy } = stubTab()
    const opened: string[] = []
    renderPanel((id) => opened.push(id), { pintaLibrary: fake.adapter })
    fireEvent.click(await screen.findByRole('button', { name: 'Editar nave no Pinta' }))
    expect(spy).toHaveBeenCalledTimes(1)
    await screen.findByText('A sua galeria do Pinta está cheia.')
    expect(opened).toEqual([])
    // The prepared tab is closed: nothing left open on a failure.
    expect(tab.closed).toBe(true)
    spy.mockRestore()
    expect(useProjectStore.getState().project?.assets?.[0]?.libId).toBe(
      'example-pygame:space-shooter:nave',
    )
  })

  it('a aba fechada pela criança durante a preparação vira recado (nada de abrir outra longe do clique)', async () => {
    await seedGalleryGame()
    const fake = exampleAdapter()
    const copy = fake.adapter.importDrawings!
    const { tab, spy } = stubTab()
    fake.adapter.importDrawings = async (input, options) => {
      tab.close()
      return copy(input, options)
    }
    const opened: string[] = []
    renderPanel((id) => opened.push(id), { pintaLibrary: fake.adapter })
    fireEvent.click(await screen.findByRole('button', { name: 'Editar nave no Pinta' }))
    await screen.findByText(
      'A aba do Pinta foi fechada. O desenho está pronto: toque em Editar de novo.',
      {},
      { timeout: 5_000 },
    )
    // The host is not called (it would `window.open` after an await, which Safari blocks).
    expect(opened).toEqual([])
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
    // The material is linked, so the next click opens Pinta directly, inside the gesture.
    expect(useProjectStore.getState().project?.assets?.[0]?.libId).toBe('personal:pinta-nave')
    fireEvent.click(await screen.findByRole('button', { name: 'Editar nave no Pinta' }))
    await waitFor(() => expect(opened).toEqual(['pinta-nave']))
  })

  it('o painel que sai durante a preparação fecha a aba "Preparando" e cancela o resto', async () => {
    await seedGalleryGame()
    const fake = exampleAdapter()
    let release: () => void = () => {}
    let waiting = false
    const copy = fake.adapter.importDrawings!
    fake.adapter.importDrawings = async (input, options) => {
      waiting = true
      await new Promise<void>((resolve) => {
        release = resolve
      })
      return copy(input, options)
    }
    const { tab, spy } = stubTab()
    const opened: string[] = []
    const view = renderPanel((id) => opened.push(id), { pintaLibrary: fake.adapter })
    fireEvent.click(await screen.findByRole('button', { name: 'Editar nave no Pinta' }))
    await waitFor(() => expect(waiting).toBe(true))
    expect(tab.closed).toBe(false)
    view.unmount()
    expect(tab.closed).toBe(true)
    release()
    await flushEffects()
    expect(opened).toEqual([])
    expect(fake.recipes).toEqual([])
    expect(useProjectStore.getState().project?.assets?.[0]?.libId).toBe(
      'example-pygame:space-shooter:nave',
    )
    spy.mockRestore()
  })
})

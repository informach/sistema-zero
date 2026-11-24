import { beforeEach, describe, expect, it } from 'bun:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../core/copy'
import { createTilemapAsset, createTilesetAsset, isTileLayer } from '../core/project'
import type { PintaHostAdapter } from '../core/types'
import { clearIdbMock, setIdbMockCodec } from '../testing/idbMock'
import { prepareMapRegions } from '../tiles/regionMap'
import { setCell } from '../tiles/tilemapOps'
import { addTile } from '../tiles/tilesetOps'
import { DEFAULT_MAP_BRUSH } from './editor/MapTerrainPanel'

const { PintaApp } = await import('./PintaApp')
const { createPintaPersistence, setPintaStorageNamespace } = await import('../state/persistence')
const { createWorkshopPintaPersistence } = await import('../state/workshopPersistence')
const { isLocalRegionAsset } = await import('../state/localRegionAssetAuthority')

type FocalSession = NonNullable<
  Awaited<ReturnType<ReturnType<typeof createWorkshopPintaPersistence>['openRegionSession']>>
>

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

async function openMapSizes() {
  fireEvent.click(await screen.findByRole('button', { name: COPY.gallery.create }))
  fireEvent.click(screen.getByRole('button', { name: new RegExp(COPY.styles.pixel.title) }))
  fireEvent.click(screen.getByRole('button', { name: new RegExp(COPY.kinds.tilemap.title) }))
  expect(screen.getByText(COPY.newAsset.sizeTitle)).toBeTruthy()
}

describe('Etapa 1 das regiões — galeria e janela focal', () => {
  it('o passo de tamanho do mapa oferece o mundo gigante e grava um mapa por regiões', async () => {
    const namespace = 'mundo-ui'
    setPintaStorageNamespace(namespace)
    setIdbMockCodec(true)
    const workshop = createWorkshopPintaPersistence({ namespace, nativeCeiling: 8 })
    await workshop.persistAsset(addTile(createTilesetAsset({ name: 'pecas', tileSize: 16 }), 0))
    render(<PintaApp persistence={workshop} />)
    await openMapSizes()
    fireEvent.click(screen.getByRole('button', { name: new RegExp(COPY.newAsset.world) }))
    fireEvent.change(screen.getByPlaceholderText(COPY.newAsset.namePlaceholder), {
      target: { value: 'mundo' },
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.newAsset.createButton }))
    await waitFor(async () => {
      const saved = (await workshop.listAllAssets()).find((asset) => asset.name === 'mundo')
      expect(saved && isLocalRegionAsset(saved)).toBe(true)
    })
  }, 30_000)

  it('o Pinta da aula continua no formato antigo: recusa o mundo gigante e não abre a oficina', async () => {
    const { createRegionWorld } = await import('../tiles/regionMap')
    const { sanitizePintaAsset } = await import('../core/project')
    const world = createRegionWorld({ name: 'mundo', tilesetId: 'pecas' })
    if (!world) throw Error('O mundo gigante não nasceu')
    // O bloco saneia o desenho inicial na borda (`PintaLesson`, `sanitizePintaAsset`): um mapa
    // por regiões que chegasse por fora é recusado inteiro, e o bloco mostra o recado dele.
    expect(sanitizePintaAsset(structuredClone(world))).toBeNull()
    // O armazenamento do bloco (namespace próprio) não tem leitor da oficina nem janela focal.
    const lesson = createPintaPersistence({ namespace: 'aula:bloco:perfil' })
    expect(lesson.workshopReader).toBeUndefined()
    expect(lesson.openRegionSession).toBeUndefined()
    expect(lesson.listGalleryIndex).toBeUndefined()
  })

  it('o armazenamento de sempre não mostra o mundo gigante', async () => {
    const legacy = createPintaPersistence()
    await legacy.persistAsset(addTile(createTilesetAsset({ name: 'pecas', tileSize: 16 }), 0))
    render(<PintaApp persistence={legacy} />)
    await openMapSizes()
    expect(screen.queryByRole('button', { name: new RegExp(COPY.newAsset.world) })).toBeNull()
  })

  it('a janela focal abre com as pontes do Estúdio e, ao sair depois de gravar, atualiza o Estúdio', async () => {
    const namespace = 'focal-ponte'
    setPintaStorageNamespace(namespace)
    setIdbMockCodec(true)
    const workshop = createWorkshopPintaPersistence({ namespace, nativeCeiling: 8 })
    const sheet = addTile(createTilesetAsset({ name: 'folha', tileSize: 16 }), 0)
    const converted = prepareMapRegions(
      createTilemapAsset({ name: 'vila', tilesetId: sheet.id, cols: 2, rows: 2 }),
    )
    if (!converted.ok) throw Error(converted.reason)
    const layer = converted.map.layers.find(isTileLayer)
    if (!layer) throw Error('Camada de peças ausente')
    const map = setCell(converted.map, layer.id, 1, 1, 1)
    await workshop.persistAssets([sheet, map])
    const resynced: string[] = []
    const adapter: PintaHostAdapter = {
      sendToStudio: async () => ({ ok: true }),
      resyncToStudio: async (payload) => {
        resynced.push(payload.id)
        return { updated: true }
      },
    }
    const opened: { session: FocalSession | null } = { session: null }
    render(
      <PintaApp
        adapter={adapter}
        persistence={{
          ...workshop,
          openRegionSession: async (id, signal, causal) => {
            const session = await workshop.openRegionSession(id, signal, causal)
            opened.session = session
            return session
          },
        }}
      />,
    )
    // Sem gesto, sair não tenta atualizar o Estúdio.
    fireEvent.click(await screen.findByRole('button', { name: /Abrir vila/ }))
    expect(await screen.findByRole('button', { name: COPY.scene.avancado })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.back }))
    expect(await screen.findByRole('button', { name: /Abrir vila/ })).toBeTruthy()
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    expect(resynced).toEqual([])
    expect(screen.queryByText(COPY.editor.studioSyncFailed)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Abrir vila/ }))
    expect(await screen.findByRole('button', { name: COPY.scene.avancado })).toBeTruthy()
    const session = opened.session
    if (!session) throw Error('A janela focal não abriu')
    await act(async () => {
      const result = await session.apply({
        tool: 'pencil',
        path: [{ col: 0, row: 0 }],
        layerId: layer.id,
        stamp: null,
        selectedTile: 1,
        brush: DEFAULT_MAP_BRUSH,
      })
      expect(result.changed).toBe(true)
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.back }))
    // A ponte é a mesma do editor inteiro (`resyncStudioCopies`): ela monta o pacote do Estúdio,
    // que desenha a folha num canvas. O happy-dom não tem canvas 2D, então aqui a montagem falha
    // e a criança vê o mesmo aviso do editor inteiro; com canvas, o pacote vai para `resynced`.
    await waitFor(() =>
      expect(
        resynced.includes(map.id) || screen.queryByText(COPY.editor.studioSyncFailed) !== null,
      ).toBe(true),
    )
  }, 30_000)
})

import { afterEach, expect, test } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { createTilemapAsset, createTilesetAsset, isTileLayer } from '../../core/project'
import type { LocalRegionAuthorSession } from '../../state/localRegionAuthorSession'
import { setPintaStorageNamespace } from '../../state/persistence'
import { createWorkshopPintaPersistence } from '../../state/workshopPersistence'
import { clearIdbMock, setIdbMockCodec, setIdbWriteGuard } from '../../testing/idbMock'
import { expandRegionMap, prepareMapRegions } from '../../tiles/regionMap'
import { addTile } from '../../tiles/tilesetOps'
import { PintaApp } from '../PintaApp'
import { DEFAULT_MAP_BRUSH } from './MapTerrainPanel'

afterEach(() => {
  setIdbWriteGuard(null)
  setIdbMockCodec(false)
  setPintaStorageNamespace('')
  clearIdbMock()
})

/** Um cenário grande guardado em regiões: a galeria o abre na janela focal. */
async function openFocalWindow(namespace: string) {
  setPintaStorageNamespace(namespace)
  setIdbMockCodec(true)
  const persistence = createWorkshopPintaPersistence({ namespace })
  const sheet = addTile(createTilesetAsset({ name: 'folha', tileSize: 16 }), 0)
  const converted = prepareMapRegions(
    createTilemapAsset({ name: 'vila', tilesetId: sheet.id, cols: 2, rows: 2 }),
  )
  if (!converted.ok) throw Error(converted.reason)
  const expanded = expandRegionMap(converted.map, { col: -8, row: -8, cols: 40, rows: 24 })
  if (!expanded.ok) throw Error(expanded.reason)
  const layer = expanded.map.layers.find(isTileLayer)
  if (!layer) throw Error('Camada de peças ausente')
  await persistence.persistAssets([sheet, expanded.map])
  let focal: LocalRegionAuthorSession | null = null
  const open = persistence.openRegionSession
  persistence.openRegionSession = async (...args) => {
    focal = await open(...args)
    return focal
  }
  const app = render(<PintaApp persistence={persistence} />)
  fireEvent.click(await screen.findByRole('button', { name: /Abrir vila/i }))
  await screen.findByRole('button', { name: COPY.scene.avancado })
  const session = focal as LocalRegionAuthorSession | null
  if (!session) throw Error('A janela focal não abriu')
  /** Uma pincelada que o aparelho recusa: a mudança falha e nada chega ao armazenamento. */
  async function failChange() {
    setIdbWriteGuard(() => {
      throw new Error('QuotaExceededError: The quota has been exceeded.')
    })
    const result = await session!.apply({
      tool: 'pencil',
      path: [{ col: 5, row: 5 }],
      layerId: layer!.id,
      stamp: null,
      selectedTile: 1,
      brush: DEFAULT_MAP_BRUSH,
    })
    setIdbWriteGuard(null)
    expect(result).toMatchObject({ ok: false, message: COPY.scene.focal.saveError })
    // A frase da criança, nunca a mensagem crua do IndexedDB.
    await screen.findByText(COPY.scene.focal.saveError)
    expect(screen.queryByText(/quota/i)).toBeNull()
  }
  return { app, failChange }
}

test('depois de uma mudança que falhou, a seta volta à galeria e avisa o que não foi guardado', async () => {
  const { app, failChange } = await openFocalWindow('focal-seta-depois-da-falha')
  try {
    await failChange()
    expect(screen.getByRole('button', { name: COPY.scene.focal.exitWithoutChange })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.back }))
    await screen.findByRole('button', { name: /Abrir vila/i })
    expect(screen.getByText(COPY.scene.focal.changeNotSaved)).toBeTruthy()
  } finally {
    app.unmount()
  }
})

test('depois de uma mudança que falhou, o Avançado abre o cenário inteiro', async () => {
  const { app, failChange } = await openFocalWindow('focal-avancado-depois-da-falha')
  try {
    await failChange()
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.avancado }))
    // O balde só existe no editor inteiro: a janela focal não tem essa ferramenta.
    await screen.findByRole('button', { name: new RegExp(COPY.tools.fill) }, { timeout: 20_000 })
    expect(screen.queryByRole('button', { name: COPY.scene.focal.exitWithoutChange })).toBeNull()
    expect(screen.getByText(COPY.scene.focal.changeNotSaved)).toBeTruthy()
  } finally {
    app.unmount()
  }
}, 30_000)

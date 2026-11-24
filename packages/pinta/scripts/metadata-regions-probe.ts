import type { PintaMemoryAsset } from '../src/core/assetMemory'
import {
  createTilemapAsset,
  createTilesetAsset,
  sanitizeRegionMapSetAsset,
} from '../src/core/project'
import { encodeRegionMapDocument } from '../src/core/regionDocument'
import { createEditorStore } from '../src/state/editorStore'
import { prepareMapRegions } from '../src/tiles/regionMap'
import { createMapSet } from '../src/tiles/sets'
import { metadataBudgetFixture } from './homologacao/metadataBudget'

/** Uses the real store and codec, without advertising or faking public format-8 IO. */
export async function runMetadataRegionsProbe() {
  const { source, over, border, objects, sourceUnits } = metadataBudgetFixture()
  let writes = 0,
    hostCalls = 0
  const editor = createEditorStore<PintaMemoryAsset>({
    asset: source,
    persist: async () => {
      writes++
    },
    acceptEdit: () => {
      hostCalls++
      return true
    },
  })
  const accepted = editor.getState().commit(over)
  const rejected = {
    accepted,
    unchanged: editor.getState().asset === source,
    undo: editor.getState().canUndo,
    dirty: editor.getState().dirty,
    hostCalls,
  }
  await editor.getState().flush()
  const sheet = createTilesetAsset({ name: 'terra', tileSize: 16 })
  const linked = createEditorStore<PintaMemoryAsset>({
    asset: sheet,
    persist: async () => {
      writes++
    },
  })
  const linkedAccepted = linked
    .getState()
    .commitLinked({ ...sheet, name: 'outra' }, { before: [source], after: [over] })
  const linkedResult = {
    accepted: linkedAccepted,
    unchanged: linked.getState().asset === sheet,
    undo: linked.getState().canUndo,
  }
  await linked.getState().flush()
  const prepared = prepareMapRegions(
    createTilemapAsset({ name: 'base', tilesetId: 'ground', cols: 2, rows: 2 }),
  )
  if (!prepared.ok) throw Error(prepared.reason)
  const set = createMapSet(prepared.map, { col: 0, row: 0, cols: 2, rows: 2 }, 16, 'casa')
  const wire = encodeRegionMapDocument(border)
  if (!wire) throw Error('Mapa limítrofe inválido')
  let decodes = 0
  const originalAtob = globalThis.atob
  let setRefused = false
  try {
    globalThis.atob = (input) => {
      decodes++
      return originalAtob(input)
    }
    setRefused = sanitizeRegionMapSetAsset({ ...set, map: wire }) === null
  } finally {
    globalThis.atob = originalAtob
  }
  let savedName = ''
  const positive = createEditorStore<PintaMemoryAsset>({
    asset: source,
    persist: async (asset) => {
      savedName = asset.name
    },
  })
  const goodAccepted = positive.getState().commit({ ...source, name: 'outra vila' })
  positive.getState().undo()
  const undoToSource = positive.getState().asset === source
  positive.getState().redo()
  await positive.getState().flush()
  return {
    objects,
    sourceUnits,
    rejected,
    linked: linkedResult,
    writes,
    setRefused,
    decodes,
    positive: { goodAccepted, undoToSource, savedName },
    public8: false,
  }
}

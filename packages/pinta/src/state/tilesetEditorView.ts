import { createStore } from 'zustand/vanilla'
import type { PintaMemoryAsset } from '../core/assetMemory'
import type { PintaAsset } from '../core/project'
import type { PintaEditorState, PintaEditorStore } from './editorStore'
import { isLocalRegionAsset } from './localRegionAssetAuthority'

/** Pixel/vector tilesets still use their original controls. Their undo and persistence can carry
 * regional consumers in the same transaction. UI that renumbers tiles uses the complete owner. */
export function createTilesetEditorView(owner: PintaEditorStore<PintaMemoryAsset>) {
  function read(): PintaEditorState {
    const state = owner.getState()
    if (isLocalRegionAsset(state.asset) || isLocalRegionAsset(state.savedAsset))
      throw Error('A revisão aberta já não é uma folha de peças.')
    return {
      ...state,
      asset: state.asset,
      savedAsset: state.savedAsset,
      linkedAssets:
        state.linkedAssets?.filter((asset): asset is PintaAsset => !isLocalRegionAsset(asset)) ??
        null,
      replaceIfCurrent(expected, next) {
        const written = state.replaceIfCurrent(expected, next)
        return written && !isLocalRegionAsset(written) ? written : null
      },
    }
  }
  const view = createStore<PintaEditorState>(read)
  return { view, subscribe: () => owner.subscribe(() => view.setState(read(), true)) }
}

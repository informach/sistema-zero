// Browser QA entry only. It does not select the regional codec for public persistence.
export { createStore } from 'idb-keyval'
export { readPintaRegionScene } from '../../core/src/studio/pinta-region-scene'
export { readPintaScene } from '../../core/src/studio/pinta-scene'
export { scene4BudgetFixture, scene4Fixture } from '../../core/tests/fixtures/pinta-region-scene'
export { recordPintaLocalOrigin } from '../src/core/localAssetOrigin'
export { createTilemapAsset, sanitizeRegionTilemapAsset } from '../src/core/project'
export { regionAssetBundleToJson } from '../src/export/regionAssetBundle'
export { decodeRegionGalleryBackup } from '../src/export/regionBackup'
export { exportPintaRegionScene } from '../src/export/regionScene'
export { exportPintaScene } from '../src/export/scene'
export { drawScene, loadSceneImages, scenePng } from '../src/export/sceneDrawing'
export { withAssetTransaction } from '../src/state/assetAuthorityDb'
export { createLocalRegionAssetAuthority } from '../src/state/localRegionAssetAuthority'
export { localRegionStorageCodec } from '../src/state/localRegionChunkStorage'
export {
  captureRegionPintaAssetForImage,
  createRegionPintaPersistence,
} from '../src/state/localRegionPersistence'
export { regionVila } from '../src/testing/regionVila'
export { expandRegionMap, prepareMapRegions } from '../src/tiles/regionMap'
export { cellAt, setCell } from '../src/tiles/tilemapOps'
export { vilaEFloresta } from './homologacao/fixture'

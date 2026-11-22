// Browser QA entry only. It does not select the regional codec for public persistence.

export { unzlibSync } from 'fflate'
export { createStore } from 'idb-keyval'
export {
  readPintaRegionImageData,
  readPintaRegionImageWorldMetadata,
} from '../../core/src/studio/pinta-region-image'
export { readPintaRegionScene } from '../../core/src/studio/pinta-region-scene'
export { readPintaScene } from '../../core/src/studio/pinta-scene'
export {
  sceneIntersectsBox,
  sceneMoveBox,
  scenePlatformLanding,
} from '../../core/src/studio/pinta-scene-geometry'
export { createRegionSceneQueries } from '../../core/src/studio/pinta-scene-query'
export { sceneObjects, sceneSolidAt, sceneSpawn } from '../../core/src/studio/pinta-scene-runtime'
export { sceneObjectTransformSource } from '../../core/src/studio/pinta-scene-transform.generated'
export { scene4BudgetFixture, scene4Fixture } from '../../core/tests/fixtures/pinta-region-scene'
export { recordPintaLocalOrigin } from '../src/core/localAssetOrigin'
export { createTilemapAsset, sanitizeRegionTilemapAsset } from '../src/core/project'
export { readPintaPngText } from '../src/export/pintaPngText'
export { regionAssetBundleToJson } from '../src/export/regionAssetBundle'
export { decodeRegionGalleryBackup } from '../src/export/regionBackup'
export { embedPintaRegionImage } from '../src/export/regionImage'
export { readPintaRegionImageWorld } from '../src/export/regionImageWorld'
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

/**
 * Peças do palco 3D que não dependem do estado de modelagem do Molda. O motor dos cenários
 * as usa pelo subcaminho `@sistemazero/molda/palco`.
 */

export { pointInSelection, type SceneSelectionRegion } from '../scene/regionSelection'
export { perspectiveFitDistance } from './cameraFit'
export { DemandRenderLoop } from './demandRenderLoop'
export { contornoConvexo, type PlanoDeRecorte, recortarMalha } from './recortarMalha'
export { SceneAreaSelection, type SceneAreaTool } from './SceneAreaSelection'
export { SceneSurfaceQuery } from './SceneSurfaceQuery'

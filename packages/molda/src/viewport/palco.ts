/**
 * Peças do palco 3D que não dependem do estado de modelagem do Molda. O motor dos cenários
 * as usa pelo subcaminho `@sistemazero/molda/palco`.
 */

export { pointInSelection, type SceneSelectionRegion } from '../scene/regionSelection'
export { type CapturedPaintActions, CapturedPaintInput } from './CapturedPaintInput'
export { perspectiveFitDistance } from './cameraFit'
export { DemandRenderLoop } from './demandRenderLoop'
export { paintPointerPath } from './paintPointerPath'
export { contornoConvexo, type PlanoDeRecorte, recortarMalha } from './recortarMalha'
export { SceneAreaSelection, type SceneAreaTool } from './SceneAreaSelection'
export { SceneBrushCursor } from './SceneBrushCursor'
export { SceneSurfaceQuery } from './SceneSurfaceQuery'

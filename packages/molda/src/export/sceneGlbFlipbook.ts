import type { SceneImage } from '../scene/document'

/**
 * Versioned internal contract for animated paint, carried in
 * `materials[i].extras.molda.flipbook` of the Studio-bound GLB. The portable
 * download never emits it: there the first frame plus an explicit loss remains.
 */
export const SCENE_GLB_FLIPBOOK_CONTRACT = 1

export interface SceneGlbFlipbookContract {
  contract: typeof SCENE_GLB_FLIPBOOK_CONTRACT
  /** Authoring image, for diagnosis and resynchronisation. Not a Studio asset name. */
  sourceId: string
  columns: number
  rows: number
  /** Explicit sequence of sheet cells; repetitions deliberately hold the same drawing. */
  frames: number[]
  fps: number
  loop: boolean
}

export function sceneGlbFlipbookContract(image: SceneImage): SceneGlbFlipbookContract | null {
  const flipbook = image.flipbook
  if (!flipbook) return null
  return {
    contract: SCENE_GLB_FLIPBOOK_CONTRACT,
    sourceId: image.id,
    columns: image.width / flipbook.frameWidth,
    rows: image.height / flipbook.frameHeight,
    frames: [...flipbook.frames],
    fps: flipbook.fps,
    loop: flipbook.loop,
  }
}

/**
 * Cell placement in glTF UV space, whose origin is the visible top-left corner.
 * Exported UVs are already frame-normalised, so the transform is the whole story.
 * The consumer runs this same formula: the contract carries the grid, never a
 * precomputed offset table that would become a second source of truth.
 */
export function sceneGlbFlipbookTransform(
  contract: Pick<SceneGlbFlipbookContract, 'columns' | 'rows'>,
  frame: number,
): { offset: [number, number]; scale: [number, number] } {
  return {
    offset: [
      (frame % contract.columns) / contract.columns,
      Math.floor(frame / contract.columns) / contract.rows,
    ],
    scale: [1 / contract.columns, 1 / contract.rows],
  }
}

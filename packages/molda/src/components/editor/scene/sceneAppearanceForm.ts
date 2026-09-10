import type { MoldaSceneDocument } from '../../../scene/document'

export type SceneAppearanceApply = (
  command: (source: MoldaSceneDocument) => MoldaSceneDocument,
) => MoldaSceneDocument | null
export const SCENE_APPEARANCE_FIELD =
  'min-h-11 w-full rounded-lg border border-mld-border bg-mld-bg px-2 text-mld-text focus-visible:outline-2 focus-visible:outline-mld-accent'

import { referenceGameAssets } from './referenceGameAssets'
import { SPACE_ARENA_VISUAL_AUDIO } from './spaceArenaVisual.audio.generated'
import { SPACE_ARENA_VISUAL_SOURCES } from './spaceArenaVisual.sources.generated'

export const spaceArenaVisualPayload = {
  entrypoint: 'main.py',
  files: SPACE_ARENA_VISUAL_SOURCES,
  assets: referenceGameAssets('space-arena-visual', SPACE_ARENA_VISUAL_AUDIO),
}

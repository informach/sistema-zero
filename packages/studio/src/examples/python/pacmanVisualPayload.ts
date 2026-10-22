import { PACMAN_VISUAL_AUDIO } from './pacmanVisual.audio.generated'
import { PACMAN_VISUAL_SOURCES } from './pacmanVisual.sources.generated'
import { referenceGameAssets } from './referenceGameAssets'

export const pacmanVisualPayload = {
  entrypoint: 'main.py',
  files: PACMAN_VISUAL_SOURCES,
  assets: referenceGameAssets('pacman-visual', PACMAN_VISUAL_AUDIO),
}

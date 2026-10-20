import type { ProjectAsset } from '../../core/projectAssets'
import { MAZE_LIGHTS_AUDIO } from './mazeLights.audio.generated'
import { MAZE_LIGHTS_SOURCES } from './mazeLights.sources.generated'

const sounds = ['opening.wav', 'collect.wav', 'collision.wav'] as const
const assets: ProjectAsset[] = sounds.map((path) => ({
  id: `maze-lights-${path.slice(0, -4)}`,
  name: path.slice(0, -4),
  kind: 'audio',
  source: 'upload',
  proPath: path,
  dataUrl: MAZE_LIGHTS_AUDIO[path],
  license: {
    name: 'MIT',
    attribution: 'Sistema Zero (2026) — som original. Veja NOTICE.md.',
  },
}))

export const mazeLightsPayload = {
  entrypoint: 'main.py',
  files: { ...MAZE_LIGHTS_SOURCES },
  assets,
}

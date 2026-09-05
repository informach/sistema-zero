/**
 * Criações de exemplo para os testes: um modelo com duas peças pintadas, uma
 * textura com alguns pixels e um céu. Ids fixos para os asserts.
 */
import {
  createModelAsset,
  createPart,
  createSkyAsset,
  createTextureAsset,
  type MoldaModelAsset,
  type MoldaSkin,
  type MoldaSkyAsset,
  type MoldaTextureAsset,
} from '../core/model'
import { faceSkinSize } from '../model/shapes'
import { createSkin } from '../model/skinOps'

export function paintedSkin(
  width: number,
  height: number,
  fill: (x: number, y: number) => number,
): MoldaSkin {
  const skin = createSkin(width, height)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) skin.data[y * width + x] = fill(x, y)
  }
  return skin
}

export function makeModel(overrides: Partial<MoldaModelAsset> = {}): MoldaModelAsset {
  const model = createModelAsset({ name: 'nave', now: 1_700_000_000_000, starter: false })
  const body = createPart({ id: 'body', name: 'corpo', from: [-2, 0, -3], to: [2, 2, 3], color: 8 })
  const wing = createPart({
    id: 'wing',
    name: 'asa',
    shape: 'wedge',
    from: [2, 0, -1],
    to: [5, 1, 1],
    color: 2,
    rotation: [0, 0, 15],
  })
  const top = faceSkinSize(body, 'py', model.texelsPerUnit)
  if (top) body.faces.py = paintedSkin(top.width, top.height, (x, y) => ((x + y) % 3 === 0 ? 2 : 0))
  const side = faceSkinSize(wing, 'slope', model.texelsPerUnit)
  if (side) wing.faces.slope = paintedSkin(side.width, side.height, (x) => (x % 2 === 0 ? 5 : 0))
  return { ...model, id: 'model-1', parts: [body, wing], ...overrides }
}

export function makeTexture(overrides: Partial<MoldaTextureAsset> = {}): MoldaTextureAsset {
  const texture = createTextureAsset({ name: 'grama', size: 16, now: 1_700_000_000_000 })
  texture.bitmap = paintedSkin(16, 16, (x, y) =>
    (x * 7 + y * 3) % 5 === 0 ? 7 : x % 4 === 0 ? 0 : 6,
  )
  return { ...texture, id: 'texture-1', ...overrides }
}

export function makeSky(overrides: Partial<MoldaSkyAsset> = {}): MoldaSkyAsset {
  const sky = createSkyAsset({ name: 'fim-de-tarde', preset: 'entardecer', now: 1_700_000_000_000 })
  return { ...sky, id: 'sky-1', ...overrides }
}

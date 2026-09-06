/**
 * Reprojeta a PELE de uma face numa face nova (cortar no meio, dividir um quad,
 * transformar a forma): cada texel da face nova olha para o ponto do MUNDO que
 * ele cobre, acha esse ponto na base da face antiga e copia o texel de lá. Fora
 * da face antiga fica 0 (a cor base). Vizinho mais próximo, como `resampleSkin`.
 */
import type { MeshFaceKey, MoldaMesh, MoldaSkin } from '../core/model'
import { faceUvToPoint, pointToFaceUv } from './frame'
import { meshFaceFrame } from './meshFrame'
import { createSkin, isSkinBlank } from './skinOps'

export function reprojectSkin(
  oldMesh: MoldaMesh,
  oldFace: MeshFaceKey,
  oldSkin: MoldaSkin,
  newMesh: MoldaMesh,
  newFace: MeshFaceKey,
  size: { width: number; height: number },
): MoldaSkin | undefined {
  const from = meshFaceFrame(oldMesh, oldFace)
  const to = meshFaceFrame(newMesh, newFace)
  if (!from || !to) return undefined
  const out = createSkin(size.width, size.height)
  for (let y = 0; y < size.height; y += 1) {
    for (let x = 0; x < size.width; x += 1) {
      const point = faceUvToPoint(to, (x + 0.5) / size.width, (y + 0.5) / size.height)
      const [u, v] = pointToFaceUv(from, point)
      if (u < 0 || u > 1 || v < 0 || v > 1) continue
      const sx = Math.min(oldSkin.width - 1, Math.floor(u * oldSkin.width))
      const sy = Math.min(oldSkin.height - 1, Math.floor(v * oldSkin.height))
      out.data[y * size.width + x] = oldSkin.data[sy * oldSkin.width + sx] ?? 0
    }
  }
  return isSkinBlank(out) ? undefined : out
}

/** Gira a pele 90° no sentido horário (a "Girar pele da face" do Pintar). */
export function rotateSkin90(skin: MoldaSkin): MoldaSkin {
  const out = createSkin(skin.height, skin.width)
  for (let y = 0; y < skin.height; y += 1) {
    for (let x = 0; x < skin.width; x += 1) {
      const nx = skin.height - 1 - y
      const ny = x
      out.data[ny * out.width + nx] = skin.data[y * skin.width + x] ?? 0
    }
  }
  return out
}

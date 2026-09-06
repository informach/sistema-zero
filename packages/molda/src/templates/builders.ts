/**
 * Construtor dos MODELOS PRONTOS: monta um modelo a partir de uma lista de
 * peças autoradas (caixa/rampa/cilindro/bola na grade, cor base e, quando a
 * peça tem, a pele de uma face em arte ASCII). Cada chamada gera ids FRESCOS
 * (`createPart`), então o template vira uma cópia independente por construção.
 *
 * A pele autorada tem de vir EXATAMENTE no tamanho que `faceSkinSize` manda
 * para a peça e a resolução: divergir lança (o teste do catálogo pega).
 */
import type { TexelsPerUnit } from '../core/limits'
import {
  createModelAsset,
  createPart,
  type FaceId,
  type MoldaMesh,
  type MoldaModelAsset,
  type MoldaSnap,
  type ShapeId,
  type Vec3,
} from '../core/model'
import { meshBox } from '../model/mesh'
import { faceSkinSize } from '../model/shapes'
import { skinFromArt } from './art'

export interface TemplatePartSpec {
  name: string
  shape?: ShapeId
  /** A caixa; numa peça de MALHA (`mesh`) ela é derivada da malha e pode ficar de fora. */
  from?: Vec3
  to?: Vec3
  /** Só com `shape: 'mesh'`: a malha autorada (chaves estáveis, ciclos CCW vistos de fora). */
  mesh?: MoldaMesh
  /** Índice de paleta ≥ 1. */
  color: number
  /** Graus, múltiplos de 15. */
  rotation?: Vec3
  /** Peles por face, em arte ASCII (ver `art.ts`). */
  faces?: Partial<Record<FaceId, readonly string[]>>
}

export interface TemplateModelSpec {
  name: string
  snap?: MoldaSnap
  texelsPerUnit?: TexelsPerUnit
  parts: readonly TemplatePartSpec[]
  now?: number
}

export function buildTemplateModel(spec: TemplateModelSpec): MoldaModelAsset {
  const texelsPerUnit = spec.texelsPerUnit ?? 4
  const model = createModelAsset({
    name: spec.name,
    starter: false,
    texelsPerUnit,
    snap: spec.snap ?? 1,
    ...(spec.now !== undefined ? { now: spec.now } : {}),
  })
  model.parts = spec.parts.map((partSpec) => {
    const box = partSpec.mesh ? meshBox(partSpec.mesh) : null
    const from = box?.from ?? partSpec.from
    const to = box?.to ?? partSpec.to
    if (!from || !to)
      throw new Error(`a peça "${partSpec.name}" precisa de from/to ou de uma malha`)
    const part = createPart({
      name: partSpec.name,
      shape: partSpec.shape ?? 'box',
      from,
      to,
      color: partSpec.color,
      ...(partSpec.rotation ? { rotation: partSpec.rotation } : {}),
      ...(partSpec.mesh ? { mesh: partSpec.mesh } : {}),
    })
    for (const [face, lines] of Object.entries(partSpec.faces ?? {})) {
      if (!lines) continue
      const expected = faceSkinSize(part, face as FaceId, texelsPerUnit)
      if (!expected) throw new Error(`a forma "${part.shape}" não tem a face "${face}"`)
      const skin = skinFromArt(lines)
      if (skin.width !== expected.width || skin.height !== expected.height) {
        throw new Error(
          `pele da face "${face}" de "${partSpec.name}": esperava ${expected.width}×${expected.height}, veio ${skin.width}×${skin.height}`,
        )
      }
      part.faces[face as FaceId] = skin
    }
    return part
  })
  return model
}

/**
 * Espelho de MODELAGEM: com `mirrorX` ligado, uma peça pode ter um GÊMEO do
 * outro lado do plano x = 0. O gêmeo não guarda pele nem geometria própria:
 * tudo é DERIVADO da fonte (`syncTwins` reescreve depois de todo commit), o que
 * torna impossível os dois lados desandarem.
 *
 * A pele do gêmeo é a da fonte espelhada na hora de desenhar/exportar (a
 * textura aparece invertida nele, que é o que "espelhar" significa); ao
 * DESLIGAR o espelho, `bakeTwins` copia a pele espelhada para o gêmeo e ele
 * vira peça própria.
 */
import { newId } from '../core/id'
import { MOLDA_LIMITS } from '../core/limits'
import type { FaceId, MoldaModelAsset, MoldaPart, MoldaSkin, Vec3 } from '../core/model'
import { flipSkinH } from './skinOps'

function mirrorVec(v: Vec3): Vec3 {
  return [-v[0], v[1], v[2]]
}

/** A geometria que o gêmeo `twin` TEM de ter para espelhar `source`. */
export function mirrorTwinOf(source: MoldaPart, twin: Pick<MoldaPart, 'id' | 'name'>): MoldaPart {
  const derived: MoldaPart = {
    id: twin.id,
    name: twin.name,
    shape: source.shape,
    from: [-source.to[0], source.from[1], source.from[2]],
    to: [-source.from[0], source.to[1], source.to[2]],
    rotation: [
      source.rotation[0],
      (360 - source.rotation[1]) % 360,
      (360 - source.rotation[2]) % 360,
    ],
    color: source.color,
    faces: {},
    mirrorOf: source.id,
  }
  if (source.origin) derived.origin = mirrorVec(source.origin)
  return derived
}

/** Peças que atravessam x = 0 já ocupam os dois lados e não ganham gêmeo. */
export function partCrossesMirror(part: Pick<MoldaPart, 'from' | 'to'>): boolean {
  return part.from[0] < 0 && part.to[0] > 0
}

function freshPartId(taken: Set<string>): string {
  let id = newId()
  while (taken.has(id)) id = newId()
  taken.add(id)
  return id
}

/**
 * Completa os pares atomicamente. Um registro externo que não comporta todos
 * os gêmeos tem o espelho desligado e os pares existentes assados: nunca fica
 * num estado em que algumas fontes derivam e outras não.
 */
function appendMissingTwins(model: MoldaModelAsset): MoldaModelAsset {
  if (!model.mirrorX) return model
  const taken = new Set(model.parts.map((part) => part.id))
  const pairedSources = new Set(
    model.parts.flatMap((part) => (part.mirrorOf ? [part.mirrorOf] : [])),
  )
  const missing = model.parts.filter(
    (source) => !source.mirrorOf && !partCrossesMirror(source) && !pairedSources.has(source.id),
  )
  if (model.parts.length + missing.length > MOLDA_LIMITS.maxParts) {
    return { ...bakeTwins(model), mirrorX: false }
  }
  const additions: MoldaPart[] = []
  for (const source of missing) {
    additions.push(
      mirrorTwinOf(source, {
        id: freshPartId(taken),
        name: source.name,
      }),
    )
    pairedSources.add(source.id)
  }
  return additions.length > 0 ? { ...model, parts: [...model.parts, ...additions] } : model
}

function sameVec(a: Vec3 | undefined, b: Vec3 | undefined): boolean {
  if (!a || !b) return a === b
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
}

function twinUpToDate(twin: MoldaPart, derived: MoldaPart): boolean {
  return (
    twin.shape === derived.shape &&
    sameVec(twin.from, derived.from) &&
    sameVec(twin.to, derived.to) &&
    sameVec(twin.rotation, derived.rotation) &&
    sameVec(twin.origin, derived.origin) &&
    twin.color === derived.color &&
    Object.keys(twin.faces).length === 0
  )
}

/**
 * Remove vínculos que deixaram de representar um par válido. Em especial, ao
 * atravessar o plano X a fonte passa a ocupar os dois lados e o gêmeo antigo
 * precisa desaparecer, em vez de virar uma segunda peça coincidente.
 */
function removeInvalidTwins(model: MoldaModelAsset): MoldaModelAsset {
  if (!model.mirrorX) return model
  const sources = new Map(
    model.parts.filter((part) => !part.mirrorOf).map((part) => [part.id, part] as const),
  )
  const paired = new Set<string>()
  let changed = false
  const parts = model.parts.filter((part) => {
    if (!part.mirrorOf) return true
    const source = sources.get(part.mirrorOf)
    const valid = source !== undefined && !partCrossesMirror(source) && !paired.has(source.id)
    if (valid) paired.add(source.id)
    else changed = true
    return valid
  })
  return changed ? { ...model, parts } : model
}

/**
 * Reescreve os campos derivados de todo gêmeo a partir da fonte. Devolve o
 * MESMO asset quando nada muda (nenhuma entrada de undo vazia).
 */
export function syncTwins(model: MoldaModelAsset): MoldaModelAsset {
  const complete = appendMissingTwins(removeInvalidTwins(model))
  const byId = new Map(complete.parts.map((part) => [part.id, part]))
  let changed = false
  const parts = complete.parts.map((part) => {
    if (!part.mirrorOf) return part
    const source = byId.get(part.mirrorOf)
    if (!source || source.mirrorOf) return part
    const derived = mirrorTwinOf(source, part)
    if (twinUpToDate(part, derived)) return part
    changed = true
    return derived
  })
  return changed ? { ...complete, parts } : complete
}

/** A tabela de espelho das faces: qual pele da fonte cai em qual face do gêmeo. */
export const MIRRORED_FACE: Partial<Record<FaceId, FaceId>> = {
  px: 'nx',
  nx: 'px',
}

/** A pele espelhada que o gêmeo mostra para uma face: a da face correspondente da fonte, invertida. */
export function twinFaceSkin(source: MoldaPart, face: FaceId): MoldaSkin | undefined {
  const sourceFace = MIRRORED_FACE[face] ?? face
  const skin = source.faces[sourceFace]
  return skin ? flipSkinH(skin) : undefined
}

/**
 * Desliga o espelho: todo gêmeo vira peça própria, com a pele que ele MOSTRAVA
 * copiada para dentro dele. Devolve o mesmo asset quando não há gêmeos.
 */
export function bakeTwins(model: MoldaModelAsset): MoldaModelAsset {
  const byId = new Map(model.parts.map((part) => [part.id, part]))
  let changed = false
  const parts = model.parts.map((part) => {
    if (!part.mirrorOf) return part
    changed = true
    const source = byId.get(part.mirrorOf)
    const { mirrorOf: _mirrorOf, ...own } = part
    if (!source) return own
    const faces: MoldaPart['faces'] = {}
    for (const face of Object.keys(source.faces) as FaceId[]) {
      const target = MIRRORED_FACE[face] ?? face
      const skin = twinFaceSkin(source, target)
      if (skin) faces[target] = skin
    }
    return { ...own, faces }
  })
  return changed ? { ...model, parts } : model
}

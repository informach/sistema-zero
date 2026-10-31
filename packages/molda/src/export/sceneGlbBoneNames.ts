import { type CharacterRole, findCharacterRigs } from '../scene/characterRig'
import type { MoldaSceneDocument } from '../scene/document'
import type { prepareSceneGlbHierarchy } from './sceneGlbHierarchy'

const CENTER: Partial<Record<CharacterRole, string>> = {
  hips: 'Hips',
  spine: 'Spine',
  chest: 'Spine1',
  neck: 'Neck',
  head: 'Head',
  headTip: 'HeadTop_End',
}
const LIMBS = {
  shoulder: 'Shoulder',
  upperArm: 'Arm',
  forearm: 'ForeArm',
  hand: 'Hand',
  handTip: 'Hand_End',
  thigh: 'UpLeg',
  shin: 'Leg',
  foot: 'Foot',
  toe: 'ToeBase',
} as const

/** Nome padrão (o do Mixamo, que Unity, Godot e Blender reconhecem) de cada papel de osso. */
export function standardBoneName(role: CharacterRole, prefix = 'mixamorig:') {
  const center = CENTER[role]
  if (center) return `${prefix}${center}`
  const side = role.endsWith('L') ? 'Left' : 'Right'
  return `${prefix}${side}${LIMBS[role.slice(0, -1) as keyof typeof LIMBS]}`
}

/**
 * Na cópia exportada, os ossos de cada esqueleto de personagem ganham os nomes padrão; o original
 * não muda. Os nós auxiliares do mesmo osso (`[base n]`, `[pose]`) acompanham o nome, e os ossos
 * refletidos pelo espelho ficam como estão (o nome padrão é de um osso só). Um segundo personagem
 * usa `mixamorig2:`, para os nomes não repetirem.
 */
export function renameSceneGlbBones(
  document: MoldaSceneDocument,
  hierarchy: ReturnType<typeof prepareSceneGlbHierarchy>,
) {
  const names = new Map<string, string>()
  findCharacterRigs(document).forEach((rig, i) => {
    const prefix = i === 0 ? 'mixamorig:' : `mixamorig${i + 1}:`
    for (const [role, id] of rig.joints) names.set(id, standardBoneName(role, prefix))
  })
  let renamed = 0
  for (const node of hierarchy.nodes) {
    const molda = node.extras.molda
    const name = names.get(molda.sourceId)
    if (!name || molda.mirrorId) continue
    const original = hierarchy.index.scene.nodes.get(molda.sourceId)?.name
    if (!original) continue
    if (node.name === original) {
      node.name = name
      renamed++
    } else if (node.name?.startsWith(`${original} [`))
      node.name = `${name}${node.name.slice(original.length)}`
  }
  return renamed
}

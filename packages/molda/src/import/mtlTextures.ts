import type { MtlBasePlan } from './mtlBase'
import type {
  MtlTextureIssue,
  MtlTexturePlan,
  MtlTexturePolicy,
  MtlTextureRole,
  MtlUvTransform,
} from './mtlTexturePlanTypes'
import { readMtlTexturePolicy } from './mtlTexturePolicy'
import { planMtlTextureSettings, unsupportedMtlMap } from './mtlTextureSettings'
import type { MtlMapKeyword, MtlMaterial } from './mtlTypes'
import { requireObj } from './objInput'

function mapRole(keyword: MtlMapKeyword): MtlTextureRole | null {
  switch (keyword) {
    case 'map_Kd':
      return 'color'
    case 'map_d':
    case 'map_Tr':
      return 'opacity'
    case 'map_Pr':
    case 'map_Ns':
      return 'roughness'
    case 'map_Pm':
      return 'metalness'
    case 'norm':
    case 'bump':
    case 'map_Bump':
    case 'map_bump':
      return 'normal'
    default:
      return null
  }
}
function sameUv(a: MtlUvTransform, b: MtlUvTransform) {
  return (
    a.offset[0] === b.offset[0] &&
    a.offset[1] === b.offset[1] &&
    a.scale[0] === b.scale[0] &&
    a.scale[1] === b.scale[1]
  )
}

/** Source + its scalar plan are validated, immutable and from the same declaration. No resources/pixels. */
export function planMtlTextures(
  material: MtlMaterial,
  base: Pick<MtlBasePlan, 'mapIndices'>,
  useUvTextures: boolean,
  options: MtlTexturePolicy,
) {
  const policy = readMtlTexturePolicy(options)
  requireObj(
    typeof useUvTextures === 'boolean',
    'useUvTextures',
    'Informe se a variante usa coordenadas de textura.',
  )
  const selected = new Map<MtlTextureRole, number>(),
    issues: MtlTextureIssue[] = [],
    maps: MtlTexturePlan[] = []
  const omit = (
    property: number,
    reason: Extract<MtlTextureIssue, { code: 'map-omitted' }>['reason'],
  ) => {
    const source = material.properties[property]!
    if (source.kind !== 'map') throw new Error('Effective map kind mismatch')
    issues.push({
      code: 'map-omitted',
      property,
      line: source.line,
      keyword: source.keyword,
      reason,
    })
  }
  for (const index of base.mapIndices) {
    const source = material.properties[index]!
    if (source.kind !== 'map') throw new Error('Effective map kind mismatch')
    if (!useUvTextures && source.keyword !== 'refl') {
      omit(index, 'no-uv')
      continue
    }
    const role = mapRole(source.keyword)
    if (!role) {
      if (policy.unsupportedMaps === 'reject')
        unsupportedMtlMap(
          source.line,
          `O mapa ${source.keyword} ainda não tem representação nativa. Escolha explicitamente se pode ser omitido.`,
        )
      omit(index, 'unsupported-role')
      continue
    }
    const previous = selected.get(role)
    if (previous === undefined) selected.set(role, index)
    else {
      if (policy.roleConflicts === 'reject')
        unsupportedMtlMap(
          source.line,
          `Mais de um mapa define ${role}. Escolha qual definição usar.`,
        )
      if (policy.roleConflicts === 'first') omit(index, 'role-conflict')
      else {
        omit(previous, 'role-conflict')
        selected.set(role, index)
      }
    }
  }
  let uv: MtlUvTransform | null = null
  for (const index of [...selected.values()].sort((a, b) => a - b)) {
    const source = material.properties[index]!
    if (source.kind !== 'map') throw new Error('Effective map kind mismatch')
    const role = mapRole(source.keyword)
    if (!role) throw new Error('Unsupported map was selected')
    let interpreted: Extract<MtlTextureIssue, { code: 'map-interpreted' }>['as'] | null = null
    if (role === 'normal' && source.keyword !== 'norm') {
      if (policy.bump === 'reject')
        unsupportedMtlMap(
          source.line,
          'Bump pode representar altura ou um normal RGB de outro exportador. Escolha a interpretação antes da conversão.',
        )
      interpreted = 'normal'
    } else if (source.keyword === 'map_Ns') {
      if (policy.specularMap === 'reject')
        unsupportedMtlMap(
          source.line,
          'map_Ns de brilho não é rugosidade PBR. A interpretação como imagem de roughness exige escolha explícita.',
        )
      interpreted = 'roughness'
    } else if (source.keyword === 'map_Tr') {
      if (policy.transparencyMap === 'reject')
        unsupportedMtlMap(
          source.line,
          'Escolha se map_Tr codifica opacidade ou transparência; ele não será invertido por suposição.',
        )
      interpreted = policy.transparencyMap
    }
    if (interpreted)
      issues.push({ code: 'map-interpreted', property: index, line: source.line, as: interpreted })
    const plan = planMtlTextureSettings(
      source,
      index,
      role,
      role === 'color' ? policy.colorSpace : policy.scalarSpace,
      policy.repeatedOptions,
      interpreted === 'transparency',
      issues,
    )
    if (uv && !sameUv(uv, plan.uv))
      unsupportedMtlMap(
        source.line,
        'Os mapas usam transformações UV diferentes; alinhá-los exige um bake próprio, não a troca silenciosa de coordenadas.',
      )
    uv ??= { offset: [...plan.uv.offset], scale: [...plan.uv.scale] }
    maps.push(plan)
  }
  return { maps, uv, issues }
}

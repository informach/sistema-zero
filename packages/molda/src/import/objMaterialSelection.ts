import { SCENE_LIMITS } from '../scene/limits'
import type { MtlMaterial } from './mtlTypes'
import type { ObjBundleRead } from './objBundle'
import type { ObjGeometryMaterials } from './objGeometryPlan'
import { ObjInputError, objBudget, requireObj } from './objInput'
import { objMaterialIdentity } from './objMaterialIdentity'

export interface ObjMaterialSelectionOptions {
  /** Multiple mtllib statements have no implicit global/positional precedence in this importer. */
  libraryMode?: 'single' | 'declaration' | 'all'
  duplicateMaterials?: 'reject' | 'first' | 'last'
  missingMaterials?: 'reject' | 'default'
}
export interface ObjSelectedMaterial {
  id: string
  library: number
  material: number
  /** Surface maps only. Reflection is independent of UV; no fabricated UV sampling for absent coordinates. */
  useUvTextures: boolean
}
export type ObjMaterialSelectionIssue =
  | { code: 'library-scope-selected'; policy: 'declaration' | 'all' }
  | {
      code: 'duplicate-material-selected'
      library: number
      material: number
      name: string
      policy: 'first' | 'last'
      ignored: number
    }
  | {
      code: 'missing-material-default'
      name: string
      scope: { kind: 'all' | 'none' } | { kind: 'declaration'; index: number }
      faces: number
    }
export interface ObjMaterialSelection {
  materials: ObjSelectedMaterial[]
  geometry: ObjGeometryMaterials
  needsDefault: boolean
  issues: ObjMaterialSelectionIssue[]
}
type CompleteBundle = Extract<ObjBundleRead, { status: 'ready' }>
type NamedDeclaration = { first: number; last: number; count: number }
type Resolution =
  | { kind: 'found'; library: number; material: number; hasUvMaps: boolean }
  | {
      kind: 'missing'
      issue: Extract<ObjMaterialSelectionIssue, { code: 'missing-material-default' }>
    }

export function readObjMaterialSelectionOptions(options: ObjMaterialSelectionOptions) {
  requireObj(
    options !== null && typeof options === 'object' && !Array.isArray(options),
    'options',
    'Escolha opções de materiais válidas.',
  )
  for (const key of Object.keys(options))
    requireObj(
      key === 'libraryMode' || key === 'duplicateMaterials' || key === 'missingMaterials',
      `options.${key}`,
      'Esta opção de materiais não é conhecida.',
    )
  const libraryMode = options.libraryMode === undefined ? 'single' : options.libraryMode,
    duplicateMaterials =
      options.duplicateMaterials === undefined ? 'reject' : options.duplicateMaterials,
    missingMaterials = options.missingMaterials === undefined ? 'reject' : options.missingMaterials
  requireObj(
    libraryMode === 'single' || libraryMode === 'declaration' || libraryMode === 'all',
    'options.libraryMode',
    'Escolha como as listas de bibliotecas serão usadas.',
  )
  requireObj(
    duplicateMaterials === 'reject' ||
      duplicateMaterials === 'first' ||
      duplicateMaterials === 'last',
    'options.duplicateMaterials',
    'Escolha como tratar nomes de material repetidos.',
  )
  requireObj(
    missingMaterials === 'reject' || missingMaterials === 'default',
    'options.missingMaterials',
    'Escolha como tratar um material ausente.',
  )
  return { libraryMode, duplicateMaterials, missingMaterials }
}

/** Name/identity metadata only. No coordinates, material numeric values, resource bytes or raster decoding. */
export function planObjMaterials(
  bundle: CompleteBundle,
  options: ObjMaterialSelectionOptions = {},
): ObjMaterialSelection {
  const policy = readObjMaterialSelectionOptions(options),
    names = bundle.libraries.map(({ source }) => {
      const index = new Map<string, NamedDeclaration>()
      source.materials.forEach((material, i) => {
        const existing = index.get(material.name)
        if (existing) {
          existing.last = i
          existing.count++
        } else index.set(material.name, { first: i, last: i, count: 1 })
      })
      return index
    }),
    allLibraries = [...new Set(bundle.librarySets.flat())],
    cached = new Map<number | null, Map<string, Resolution>>(),
    mapped = new WeakMap<MtlMaterial, boolean>(),
    duplicateIssues = new Set<string>(),
    materials: ObjSelectedMaterial[] = [],
    variants = new Map<string, string>(),
    byFace = new Map<number, string>(),
    issues: ObjMaterialSelectionIssue[] = []
  let needsDefault = !bundle.source.elements.some((element) => element.kind === 'face'),
    scopeReported = false
  function countMaterial() {
    objBudget(materials.length + Number(needsDefault), SCENE_LIMITS.materials, 'materials')
  }
  function resolve(name: string, librarySet: number | null, path: string): Resolution {
    if (policy.libraryMode === 'single' && bundle.librarySets.length > 1)
      throw new ObjInputError(
        'unsupported',
        path,
        'Há várias listas mtllib. Escolha busca por declaração ou por todas as listas antes de converter.',
      )
    if (!scopeReported && bundle.librarySets.length > 1 && policy.libraryMode !== 'single') {
      issues.push({ code: 'library-scope-selected', policy: policy.libraryMode })
      scopeReported = true
    }
    const scope =
      policy.libraryMode === 'all'
        ? -1
        : policy.libraryMode === 'single'
          ? bundle.librarySets.length
            ? 0
            : null
          : librarySet
    let cache = cached.get(scope)
    if (!cache) {
      cache = new Map()
      cached.set(scope, cache)
    }
    const hit = cache.get(name)
    if (hit) return hit
    const search =
      scope === -1 ? allLibraries : scope === null ? [] : (bundle.librarySets[scope] ?? [])
    for (const library of search) {
      const entry = names[library]!.get(name)
      if (!entry) continue
      const source = bundle.libraries[library]!,
        material = policy.duplicateMaterials === 'last' ? entry.last : entry.first
      if (entry.count > 1) {
        if (policy.duplicateMaterials === 'reject')
          throw new ObjInputError(
            'unsupported',
            path,
            `O material ${name} aparece mais de uma vez em ${source.path}. Escolha qual declaração usar.`,
          )
        const key = `${library}:${material}`
        if (!duplicateIssues.has(key)) {
          duplicateIssues.add(key)
          issues.push({
            code: 'duplicate-material-selected',
            library,
            material,
            name,
            policy: policy.duplicateMaterials,
            ignored: entry.count - 1,
          })
        }
      }
      const definition = source.source.materials[material]!
      let hasUvMaps = mapped.get(definition)
      if (hasUvMaps === undefined) {
        hasUvMaps = definition.properties.some(
          (property) => property.kind === 'map' && property.keyword !== 'refl',
        )
        mapped.set(definition, hasUvMaps)
      }
      const resolved: Resolution = {
        kind: 'found',
        library,
        material,
        hasUvMaps,
      }
      cache.set(name, resolved)
      return resolved
    }
    if (policy.missingMaterials === 'reject')
      throw new ObjInputError(
        'unsupported',
        path,
        `O material ${name} não foi encontrado nas bibliotecas escolhidas.`,
      )
    const issue: Extract<ObjMaterialSelectionIssue, { code: 'missing-material-default' }> = {
        code: 'missing-material-default',
        name,
        scope:
          scope === -1
            ? { kind: 'all' }
            : scope === null
              ? { kind: 'none' }
              : { kind: 'declaration', index: scope },
        faces: 0,
      },
      resolved: Resolution = { kind: 'missing', issue }
    issues.push(issue)
    cache.set(name, resolved)
    return resolved
  }
  bundle.source.elements.forEach((element, index) => {
    if (element.kind !== 'face') return
    const state = bundle.source.states[element.state]!
    let id = 'obj_material_default'
    if (state.material !== null) {
      const found = resolve(state.material, state.library, `lines[${element.line}].material`)
      if (found.kind === 'missing') {
        found.issue.faces++
        needsDefault = true
        countMaterial()
      } else {
        const useUvTextures = element.hasUv && found.hasUvMaps,
          key = `${found.library}:${found.material}:${Number(useUvTextures)}`
        const existing = variants.get(key)
        if (existing) id = existing
        else {
          objBudget(
            materials.length + 1 + Number(needsDefault),
            SCENE_LIMITS.materials,
            'materials',
          )
          id = objMaterialIdentity(found.library, found.material, useUvTextures)
          variants.set(key, id)
          materials.push({ id, library: found.library, material: found.material, useUvTextures })
        }
      }
    } else {
      needsDefault = true
      countMaterial()
    }
    byFace.set(index, id)
  })
  return {
    materials,
    needsDefault,
    geometry: { byFace, defaultId: needsDefault ? 'obj_material_default' : materials[0]!.id },
    issues,
  }
}

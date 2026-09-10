import { type ObjAppearanceOptions, readObjAppearanceOptions } from './objAppearance'
import { type ObjHierarchyOptions, readObjHierarchyOptions } from './objHierarchy'
import { requireObj } from './objInput'
import {
  type ObjMaterialConversionOptions,
  readObjMaterialConversionOptions,
} from './objMaterialConversionTypes'
import {
  type ObjMaterialSelectionOptions,
  readObjMaterialSelectionOptions,
} from './objMaterialSelection'
import { objOptionGroup } from './objOptionGroup'

export interface ObjNativeOptions {
  appearance: ObjAppearanceOptions
  images: ObjMaterialConversionOptions
  materials?: ObjMaterialSelectionOptions
  hierarchy?: ObjHierarchyOptions
}

/** Snapshot ALL nested choices before source traversal, including choices of later pipeline stages. */
export function readObjNativeOptions(value: ObjNativeOptions) {
  requireObj(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'options',
    'Escolha as opções de importação OBJ.',
  )
  for (const key of Object.keys(value))
    requireObj(
      key === 'appearance' || key === 'images' || key === 'materials' || key === 'hierarchy',
      `options.${key}`,
      'Esta opção de importação não é conhecida.',
    )
  return {
    materials: objOptionGroup('materials', () =>
      readObjMaterialSelectionOptions(value.materials === undefined ? {} : value.materials),
    ),
    appearance: objOptionGroup('appearance', () => readObjAppearanceOptions(value.appearance)),
    images: objOptionGroup('images', () => readObjMaterialConversionOptions(value.images)),
    hierarchy: objOptionGroup('hierarchy', () =>
      readObjHierarchyOptions(value.hierarchy === undefined ? {} : value.hierarchy),
    ),
  }
}

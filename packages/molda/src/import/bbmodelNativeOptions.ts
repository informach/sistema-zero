import { readBbmodelClipOptions } from './bbmodelClipOptions'
import type { BbmodelClipOptions } from './bbmodelClipPlanTypes'
import { type BbmodelFaceUvOptions, readBbmodelFaceUvOptions } from './bbmodelFaceUvs'
import { type BbmodelHierarchyOptions, readBbmodelHierarchyOptions } from './bbmodelHierarchy'
import { type BbmodelImageOptions, readBbmodelImageOptions } from './bbmodelImages'
import { requireBbmodel } from './bbmodelInput'
import {
  type BbmodelNativeGeometryOptions,
  readBbmodelNativeGeometryOptions,
} from './bbmodelNativeGeometryPlan'
import {
  type BbmodelNodeMaterialOptions,
  readBbmodelNodeMaterialOptions,
} from './bbmodelNodeMaterials'
import { bbmodelOptionGroup } from './bbmodelOptionGroup'
import { type BbmodelPositionOptions, readBbmodelPositionOptions } from './bbmodelPositions'
import { type BbmodelRemainderOptions, readBbmodelRemainderOptions } from './bbmodelRemainder'
import { type BbmodelSelectionOptions, readBbmodelSelectionOptions } from './bbmodelSelection'
import { type BbmodelSurfaceOptions, readBbmodelSurfaceOptions } from './bbmodelSurfaces'
import {
  type BbmodelTextureMaterialOptions,
  readBbmodelTextureMaterialOptions,
} from './bbmodelTextureMaterials'

export interface BbmodelNativeOptions {
  sourcePreference: 'prefer-embedded' | 'prefer-files'
  selection?: BbmodelSelectionOptions
  geometry?: BbmodelNativeGeometryOptions
  positions?: BbmodelPositionOptions
  uvs?: BbmodelFaceUvOptions
  surfaces?: BbmodelSurfaceOptions
  nodeMaterials?: BbmodelNodeMaterialOptions
  textureMaterials?: BbmodelTextureMaterialOptions
  images?: BbmodelImageOptions
  hierarchy?: BbmodelHierarchyOptions
  remainder?: BbmodelRemainderOptions
  clips?: BbmodelClipOptions
}

/** Validate every option before source parsing or raster work, even when its stage would be empty. */
export function readBbmodelNativeOptions(value: BbmodelNativeOptions) {
  requireBbmodel(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'options',
    'Escolha como abrir este modelo.',
  )
  for (const key of Object.keys(value))
    requireBbmodel(
      [
        'sourcePreference',
        'selection',
        'geometry',
        'positions',
        'uvs',
        'surfaces',
        'nodeMaterials',
        'textureMaterials',
        'images',
        'hierarchy',
        'remainder',
        'clips',
      ].includes(key),
      `options.${key}`,
      'Esta opção de importação não é conhecida.',
    )
  requireBbmodel(
    value.sourcePreference === 'prefer-embedded' || value.sourcePreference === 'prefer-files',
    'options.sourcePreference',
    'Escolha se prefere as imagens embutidas ou os arquivos locais.',
  )
  return {
    sourcePreference: value.sourcePreference,
    clips: bbmodelOptionGroup('clips', () =>
      readBbmodelClipOptions(value.clips === undefined ? {} : value.clips),
    ),
    selection: bbmodelOptionGroup('selection', () =>
      readBbmodelSelectionOptions(value.selection === undefined ? {} : value.selection),
    ),
    geometry: bbmodelOptionGroup('geometry', () =>
      readBbmodelNativeGeometryOptions(value.geometry === undefined ? {} : value.geometry),
    ),
    positions: bbmodelOptionGroup('positions', () =>
      readBbmodelPositionOptions(value.positions === undefined ? {} : value.positions),
    ),
    uvs: bbmodelOptionGroup('uvs', () =>
      readBbmodelFaceUvOptions(value.uvs === undefined ? {} : value.uvs),
    ),
    surfaces: bbmodelOptionGroup('surfaces', () =>
      readBbmodelSurfaceOptions(value.surfaces === undefined ? {} : value.surfaces),
    ),
    nodeMaterials: bbmodelOptionGroup('nodeMaterials', () =>
      readBbmodelNodeMaterialOptions(value.nodeMaterials === undefined ? {} : value.nodeMaterials),
    ),
    textureMaterials: bbmodelOptionGroup('textureMaterials', () =>
      readBbmodelTextureMaterialOptions(
        value.textureMaterials === undefined ? {} : value.textureMaterials,
      ),
    ),
    images: bbmodelOptionGroup('images', () =>
      readBbmodelImageOptions(value.images === undefined ? {} : value.images),
    ),
    hierarchy: bbmodelOptionGroup('hierarchy', () =>
      readBbmodelHierarchyOptions(value.hierarchy === undefined ? {} : value.hierarchy),
    ),
    remainder: bbmodelOptionGroup('remainder', () =>
      readBbmodelRemainderOptions(value.remainder === undefined ? {} : value.remainder),
    ),
  }
}

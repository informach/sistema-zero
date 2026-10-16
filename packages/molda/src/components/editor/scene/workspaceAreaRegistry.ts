import type { MoldaToolFamilyId } from '../../../core/toolFamilies'

/** Interface state only. Opening an area never converts or filters the project. */
export const SCENE_WORKSPACE_AREAS = {
  mesh: { label: 'Editar malha', mode: 'model', family: 'model.mesh' },
  skin: { label: 'Ossos e pesos', mode: 'model', family: 'model.skin' },
  uv: { label: 'UV', mode: 'paint', family: 'paint.uv' },
  materials: { label: 'Materiais', mode: 'paint', family: 'paint.material' },
  sheet: { label: 'Folha de pintura', mode: 'paint', family: 'paint.sheet' },
  curves: { label: 'Curvas', mode: 'animation', family: 'animate.pro' },
} as const satisfies Record<string, { label: string; mode: string; family: MoldaToolFamilyId }>

export type SceneWorkspaceArea = keyof typeof SCENE_WORKSPACE_AREAS

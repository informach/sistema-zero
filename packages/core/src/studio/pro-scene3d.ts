/** Exact derived projections; arbitrary executable material paths remain forbidden. */
export const STUDIO_PRO_SCENE3D_MODULE = 'studio-generated/molda-cenarios.mjs'
export const STUDIO_PRO_SCENE3D_RUNTIME = 'studio-generated/molda-cenarios-runtime.mjs'
export const STUDIO_PRO_SCENE3D_TYPES = 'studio-generated/molda-cenarios.d.mts'

export function isStudioProScene3DFile(path: string): boolean {
  return (
    path === STUDIO_PRO_SCENE3D_MODULE ||
    path === STUDIO_PRO_SCENE3D_RUNTIME ||
    path === STUDIO_PRO_SCENE3D_TYPES
  )
}

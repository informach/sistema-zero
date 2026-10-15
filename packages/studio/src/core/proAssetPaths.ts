import { normalizeProPath } from './proProject'

export const PRO_ASSET_DIRECTORY = 'public/studio-assets'
export const PRO_ASSET_MANIFEST = `${PRO_ASSET_DIRECTORY}/manifest.json`

export function isProAssetProjection(path: string): boolean {
  return path === PRO_ASSET_DIRECTORY || path.startsWith(`${PRO_ASSET_DIRECTORY}/`)
}

/** Legacy conversion may retain an old URL; executable/text files cannot be assets. */
export function validProAssetPath(path: unknown): path is string {
  return (
    typeof path === 'string' &&
    path.length <= 240 &&
    path.startsWith('public/') &&
    normalizeProPath(path) === path &&
    !/\.(?:[cm]?[jt]sx?|json|html|css|md|txt)$/i.test(path) &&
    !path.split('/').some((p) => p.startsWith('.'))
  )
}

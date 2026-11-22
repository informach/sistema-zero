import type { PintaRegionalMarker } from '../core/pintaRegionalMaterial'
import { admitRegionalProjectAssets } from '../core/pintaRegionalProjectAdmission'
import {
  PRIVATE_REGIONAL_JS_PROJECT,
  UNSUPPORTED_PINTA_REGION,
} from '../core/pintaRegionalReference'
import { sanitizeProjectAssets } from '../core/projectAssets'
import { assertProjectContentPreserved } from '../core/projectDocumentGuards'
import { loadProjectAssetsSnapshotById, persistProjectAssets } from './persistence'
import { getProjectStorageScope, type ProjectStorageScope } from './projectStorageRuntime'

// Cloud adapters use authenticated viewer IDs. This namespace is local and has no account mirror.
const PRIVATE_SCOPE_PREFIX = 'pinta-regional-local:'
const PRIVATE_SCOPE = /^pinta-regional-local:[a-z0-9-]{1,48}$/

export function privateRegionalProjectScope(profile: string): ProjectStorageScope {
  const namespace = PRIVATE_SCOPE_PREFIX + profile
  if (!PRIVATE_SCOPE.test(namespace)) throw new Error('Perfil de teste local inválido.')
  return getProjectStorageScope(namespace)
}

/** Private local-only refresh. No program, project ID, source path or block is rewritten. */
export async function refreshPrivateRegionalProjectAsset(options: {
  scope: ProjectStorageScope
  projectId: string
  assetId: string
  capture: { dataUrl: string; width: number; height: number; regional: PintaRegionalMarker }
  signal?: AbortSignal
}): Promise<boolean> {
  const { scope, projectId, assetId, signal } = options
  if (
    !PRIVATE_SCOPE.test(scope.namespace) ||
    scope.identity !== getProjectStorageScope(scope.namespace).identity
  )
    throw new Error('A captura regional requer um perfil de teste local.')
  const capture = {
    dataUrl: options.capture.dataUrl,
    width: options.capture.width,
    height: options.capture.height,
    regional: { ...options.capture.regional },
  }
  signal?.throwIfAborted()
  scope.signal?.throwIfAborted()
  const { assets, environment } = await loadProjectAssetsSnapshotById(projectId, scope, {
    [PRIVATE_REGIONAL_JS_PROJECT]: true,
  })
  const original = assets.find((asset) => asset.id === assetId)
  if (
    environment.programmingLanguage !== 'javascript' ||
    !original ||
    original.kind !== 'image' ||
    original.source === 'lesson-art' ||
    original.libOrigin === 'molda' ||
    original.pintaImage ||
    (original.libId && original.libId !== `personal:${capture.regional.sourceId}`)
  )
    throw new Error(UNSUPPORTED_PINTA_REGION)

  const {
    scene: _scene,
    tilemap: _tilemap,
    tilemapFront: _front,
    sprite: _sprite,
    tileset: _tileset,
    ...identity
  } = original
  const next = assets.map((asset) =>
    asset === original
      ? {
          ...identity,
          ...(original.libId && !original.libOrigin ? { libOrigin: 'pinta' as const } : {}),
          ...capture,
        }
      : asset,
  )
  const admitted = await admitRegionalProjectAssets(next, signal)
  const materials = sanitizeProjectAssets(next, { regionalMaterials: admitted })
  assertProjectContentPreserved({ assets: next }, { assets: materials })
  return persistProjectAssets(
    projectId,
    materials,
    scope,
    assets,
    () => !signal?.aborted && !scope.signal?.aborted,
  )
}

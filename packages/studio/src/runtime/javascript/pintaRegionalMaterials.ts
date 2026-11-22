import type { AdmittedPintaRegionalMaterial } from '../../core/pintaRegionalMaterial'
import {
  admitRegionalProjectAssets,
  assertRegionalProjectAssetProof,
} from '../../core/pintaRegionalProjectAdmission'
import { checkRegionalProjectPixels } from '../../core/pintaRegionalProjectPixels'
import {
  hasRegionalPintaReference,
  UNSUPPORTED_PINTA_REGION,
} from '../../core/pintaRegionalReference'
import { MAX_ASSETS_TOTAL_CHARS } from '../../core/projectAssetBudget'
import { isDocumentRecord } from '../../core/projectDocument'
import { gameTwoDManifest } from '../../official-extensions/game-2d/manifest'
import { gameKitManifest } from '../../official-extensions/game-2d-advanced/manifest'
import type { MapTarget } from '../../official-extensions/map-2d/regionHostSource'
import {
  isPrivateRegionalProjectScope,
  type ProjectStorageScope,
} from '../../state/projectStorageRuntime'

/** Capture and verify the exact material list before loading an engine or producing a document. */
export async function prepareJavaScriptRegionalMaterials(
  assets: unknown,
  installed: unknown,
  scope?: ProjectStorageScope,
  signal?: AbortSignal,
) {
  if (!Array.isArray(assets) || !assets.some(hasRegionalPintaReference)) return undefined
  if (!scope || !isPrivateRegionalProjectScope(scope)) throw new Error(UNSUPPORTED_PINTA_REGION)
  const lifetime =
    signal && scope.signal ? AbortSignal.any([signal, scope.signal]) : (signal ?? scope.signal)
  lifetime?.throwIfAborted()
  const candidates = [gameTwoDManifest, gameKitManifest]
  const engines = Array.isArray(installed)
    ? installed
        .filter(isDocumentRecord)
        .filter((row) => candidates.some((engine) => engine.id === row.id))
    : []
  const selected = engines[0]
  const match = candidates.find(
    (engine) => engine.id === selected?.id && engine.version === selected?.version,
  )
  if (engines.length !== 1 || !match)
    throw new Error('Este cenário precisa de uma versão compatível do Jogo 2D.')
  const target: MapTarget = match === gameTwoDManifest ? 'g2d' : 'gk'
  const extensionId = match.id
  const sourceChars = assets.reduce(
    (sum, row) =>
      sum + (isDocumentRecord(row) && typeof row.dataUrl === 'string' ? row.dataUrl.length : 0),
    0,
  )
  let wireChars = 3 // Brackets, outer quotes and the final item without a trailing comma.
  // Importing the codec can yield. Start the reader immediately so the asset list has already
  // been captured before that happens, and await the codec only inside the visited world.
  const wire: string[] = []
  const worlds: AdmittedPintaRegionalMaterial['world'][] = []
  const proof = await admitRegionalProjectAssets(assets, lifetime, async (_id, world, name) => {
    const { packRegionWorld } = await import('../../official-extensions/map-2d/regionWire')
    lifetime?.throwIfAborted()
    const data = JSON.stringify(packRegionWorld(world, name))
    wireChars += JSON.stringify(data).replaceAll('<', '\\u003c').length - 1
    if (sourceChars + wireChars > MAX_ASSETS_TOTAL_CHARS)
      throw new Error('Os cenários excedem o espaço de execução do projeto.')
    worlds.push(world)
    wire.push(data)
  })
  for (const world of worlds) await checkRegionalProjectPixels(world, lifetime)
  const { mapTwoDRegionalMaterialsBootstrap } = await import(
    '../../official-extensions/map-2d/regionBootstrap'
  )
  if (!wire.length) throw new Error(UNSUPPORTED_PINTA_REGION)
  const script = await mapTwoDRegionalMaterialsBootstrap(target, wire)
  lifetime?.throwIfAborted()
  assertRegionalProjectAssetProof(assets, proof)
  return { proof, extensionId, script, wireChars }
}

export type JavaScriptRegionalMaterials = NonNullable<
  Awaited<ReturnType<typeof prepareJavaScriptRegionalMaterials>>
>

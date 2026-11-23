import { composeMapTwoDBootstrap } from './bootstrap'
import {
  type MapTarget,
  regionEngineSource,
  regionHostFields,
  regionWorldData,
  sharedRegionGeometry,
} from './regionHostSource'
import { regionMap2DRuntime } from './regionRuntime.generated'
import { type AdmittedRegionWorld, packRegionWorld } from './regionWire'

const factorySlot = '/* __SZ_PRIVATE_PINTA_FACTORY__ */'
// Bun 1.3.11, before asset data: 414,873 / 457,114 chars, 415,432 / 458,619
// UTF-8 bytes and 113,321 / 141,029 gzip bytes. The public budgets are independent.
// 22/11/2026, Pinta projections integrated (Scene 5 restore, hex cells, projected queries):
// 422,181 / 463,627 chars before asset data; the g2d ceiling rose from 422,000.
const runtimeMaxChars = { g2d: 422_500, gk: 464_000 } satisfies Record<MapTarget, number>

/** Private fixture/host entry point; callers must admit PNG bytes or scene JSON first.
 * The asset payload is part of this isolated document, never a public project asset.
 */
export async function mapTwoDRegionBootstrap(
  target: MapTarget,
  world: AdmittedRegionWorld,
  rootAssetName = world.rootId,
): Promise<string> {
  if (rootAssetName !== world.rootId && world.maps.has(rootAssetName))
    throw new Error('O nome de abertura avulsa conflita com outro lugar do mundo.')
  return composeRegionBootstrap(target, JSON.stringify(packRegionWorld(world, rootAssetName)))
}

/** Bounded, already captured wire strings for separate material worlds. */
export function mapTwoDRegionalMaterialsBootstrap(target: MapTarget, worlds: readonly string[]) {
  return composeRegionBootstrap(target, `[${worlds.join(',')}]`)
}

async function composeRegionBootstrap(target: MapTarget, data: string) {
  // An admitted scene can still contain HTML-sensitive text in its properties.
  const literal = JSON.stringify(data).replaceAll('<', '\\u003c')
  const source = await composeMapTwoDBootstrap(target, true, {
    fragment: `
function createPrivateMap2D(host,_pintaSharedSceneGeometry){${factorySlot}return _pintaRegionFactory(host,createMap2D(host),${regionWorldData});}
`,
    hostFields: regionHostFields(target),
    engine: (source) => regionEngineSource(source, target),
    sharedGeometry: sharedRegionGeometry,
  })
  const runtime = source.replace(factorySlot, () => regionMap2DRuntime)
  if (
    runtime === source ||
    !runtime.includes(regionWorldData) ||
    runtime.length - regionWorldData.length > runtimeMaxChars[target]
  )
    throw new Error('A composição privada do motor regional ficou incompleta ou acima do teto.')
  return runtime.replace(regionWorldData, () => literal)
}

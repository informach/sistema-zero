import { composeMapTwoDBootstrap } from './bootstrap'
import {
  type MapTarget,
  regionEngineSource,
  regionHostFields,
  regionWorldData,
} from './regionHostSource'
import { regionMap2DRuntime } from './regionRuntime.generated'
import { type AdmittedRegionWorld, packRegionWorld } from './regionWire'

const factorySlot = '/* __SZ_PRIVATE_PINTA_FACTORY__ */'
// Bun 1.3.11, before asset data: 419,533 / 461,774 chars, 420,092 / 463,279
// UTF-8 bytes and 114,693 / 142,419 gzip bytes. The public budgets are independent.
const runtimeMaxChars = { g2d: 422_000, gk: 464_000 } satisfies Record<MapTarget, number>

/** Private fixture/host entry point; callers must admit PNG bytes or scene JSON first.
 * The asset payload is part of this isolated document, never a public project asset.
 */
export async function mapTwoDRegionBootstrap(
  target: MapTarget,
  world: AdmittedRegionWorld,
  rootAssetName = world.rootId,
): Promise<string> {
  const data = JSON.stringify(packRegionWorld(world, rootAssetName))
  // An admitted scene can still contain HTML-sensitive text in its properties.
  const literal = JSON.stringify(data).replaceAll('<', '\\u003c')
  const source = await composeMapTwoDBootstrap(target, true, {
    fragment: `
function createPrivateMap2D(host){${factorySlot}return _pintaRegionFactory(host,createMap2D(host),${regionWorldData});}
`,
    hostFields: regionHostFields(target),
    engine: (source) => regionEngineSource(source, target),
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

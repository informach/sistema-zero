import type { JSStatement } from '../../ir/schema'
import type { PlatformCodecTools } from './platformCodec'

export function sceneGameThreeDCallToIR(
  method: string,
  args: unknown[],
  tools: PlatformCodecTools,
): JSStatement | null | undefined {
  if (method === 'loadScene') {
    const worldVar = tools.identifierName(args[0]),
      asset = tools.toExpr(args[1])
    return worldVar && asset?.type === 'str'
      ? { type: 'g3d:loadScene', worldVar, asset: asset.value }
      : null
  }
  if (method === 'sceneStart') {
    const objVar = tools.identifierName(args[0])
    return objVar ? { type: 'g3d:sceneStart', objVar } : null
  }
  return undefined
}

export function sceneGameThreeDBlockToIR(
  type: string,
  field: (name: string) => string,
): JSStatement | undefined {
  if (type === 'sz_g3d_load_scene')
    return { type: 'g3d:loadScene', worldVar: field('WORLD'), asset: field('ASSET') }
  if (type === 'sz_g3d_scene_start') return { type: 'g3d:sceneStart', objVar: field('OBJ') }
  return undefined
}

import type * as Blockly from 'blockly/core'
import type { SerializedBlocklyBlock } from '../../codecs/types'
import type { JSStatement } from '../../ir/schema'
import type { PlatformCodecTools } from '../game-3d/platformCodec'

export function sceneGameKit3DBlockToIR(
  block: Blockly.Block,
  tools: { field(block: Blockly.Block, name: string): string },
): JSStatement | undefined {
  if (block.type === 'sz_g3k_load_scene')
    return { type: 'g3k:loadScene', asset: tools.field(block, 'ASSET') }
  if (block.type === 'sz_g3k_scene_start')
    return { type: 'g3k:sceneStart', charVar: tools.field(block, 'CHAR') }
  return undefined
}

export function sceneGameKit3DStatementToCode(
  s: JSStatement,
  t: { pad: string; id(name: string): string },
): string | undefined {
  if (s.type === 'g3k:loadScene')
    return `${t.pad}SZGameKit3D.loadScene(${JSON.stringify(s.asset)});`
  if (s.type === 'g3k:sceneStart') return `${t.pad}SZGameKit3D.sceneStart(${t.id(s.charVar)});`
  return undefined
}

export function sceneGameKit3DCallToIR(
  method: string,
  args: unknown[],
  tools: Pick<PlatformCodecTools, 'identifierName' | 'toExpr'>,
): JSStatement | null | undefined {
  if (method === 'loadScene') {
    const asset = tools.toExpr(args[0])
    return args.length === 1 && asset?.type === 'str'
      ? { type: 'g3k:loadScene', asset: asset.value }
      : null
  }
  if (method === 'sceneStart') {
    const charVar = tools.identifierName(args[0])
    return args.length === 1 && charVar ? { type: 'g3k:sceneStart', charVar } : null
  }
  return undefined
}

export function sceneGameKit3DStatementToBlock(
  s: JSStatement,
  t: {
    block(
      type: string,
      fields?: Record<string, string | number>,
      inputs?: Record<string, SerializedBlocklyBlock[]>,
      id?: string,
    ): SerializedBlocklyBlock
  },
): SerializedBlocklyBlock | undefined {
  if (s.type === 'g3k:loadScene')
    return t.block('sz_g3k_load_scene', { ASSET: s.asset }, {}, s.__id)
  if (s.type === 'g3k:sceneStart')
    return t.block('sz_g3k_scene_start', { CHAR: s.charVar }, {}, s.__id)
  return undefined
}

export function collectSceneGameKit3DIdentifiers(s: JSStatement, names: Set<string>): boolean {
  if (s.type === 'g3k:sceneStart') {
    names.add(s.charVar)
    return true
  }
  return s.type === 'g3k:loadScene'
}

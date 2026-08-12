import type * as Blockly from 'blockly/core'
import type { JSExpr, JSStatement } from '#ir'

interface NativeSoundBlockTools {
  field: (block: Blockly.Block, name: string) => string
  expression: (block: Blockly.Block, name: string, fallback: JSExpr) => JSExpr
}

/** Blocos do bridge de som core; `undefined` significa “não é deste codec”. */
export function nativeSoundBlockToIR(
  block: Blockly.Block,
  tools: NativeSoundBlockTools,
): JSStatement | undefined {
  const f = (name: string) => tools.field(block, name)
  const number = (name: string, value: number) =>
    tools.expression(block, name, { type: 'num', value })
  switch (block.type) {
    case 'sz_som_load':
      return { type: 'somLoad', name: f('NAME') || 'som', asset: f('ASSET') }
    case 'sz_som_play':
      return { type: 'somPlay', name: f('NAME') || 'som' }
    case 'sz_som_stop':
      return { type: 'somStop', name: f('NAME') || 'som' }
    case 'sz_som_play_music':
      return { type: 'somPlayMusic', name: f('NAME') || 'musica' }
    case 'sz_som_stop_music':
      return { type: 'somStopMusic' }
    case 'sz_som_volume':
      return { type: 'somVolume', level: number('LEVEL', 8) }
    case 'sz_som_tone': {
      const selected = f('WAVE')
      const wave =
        selected === 'square' || selected === 'sawtooth' || selected === 'triangle'
          ? selected
          : 'sine'
      return {
        type: 'somTone',
        wave,
        frequency: number('FREQUENCY', 440),
        duration: number('DURATION', 120),
        level: number('LEVEL', 6),
      }
    }
    case 'sz_som_noise':
      return { type: 'somNoise', duration: number('DURATION', 100), level: number('LEVEL', 5) }
    default:
      return undefined
  }
}

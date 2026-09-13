import type * as Babel from '@babel/types'
import type * as Blockly from 'blockly/core'
import type { JSExpr, JSStatement } from '../../ir/schema'
import { gameTwoDMusicScope } from './audioIR'

export function gameTwoDAudioBlockToIR(
  block: Blockly.Block,
  field: (block: Blockly.Block, name: string) => string,
  expression: (block: Blockly.Block, name: string, fallback: JSExpr) => JSExpr,
): JSStatement | undefined {
  const f = (name: string) => field(block, name)
  const number = (name: string, value: number) => expression(block, name, { type: 'num', value })
  switch (block.type) {
    case 'sz_g2d_play_sound':
      return { type: 'g2d:playSound', freq: number('FREQ', 440), durationMs: number('MS', 200) }
    case 'sz_g2d_play_fx':
      return { type: 'g2d:playFx', fx: f('FX') }
    case 'sz_g2d_play_music':
      return { type: 'g2d:playMusic', tune: f('MUSIC') }

    case 'sz_g2d_load_sound':
      return { type: 'g2d:loadSound', name: f('NAME') || 'som', asset: f('ASSET') }
    case 'sz_g2d_play_clip':
      return { type: 'g2d:playClip', name: f('NAME') || 'som' }
    case 'sz_g2d_stop_clip':
      return { type: 'g2d:stopClip', name: f('NAME') || 'som' }
    case 'sz_g2d_play_track':
      return { type: 'g2d:playTrack', name: f('NAME') || 'musica' }
    case 'sz_g2d_stop_track':
      return { type: 'g2d:stopTrack', scope: gameTwoDMusicScope.parse(f('SCOPE') || 'all') }
    case 'sz_g2d_set_volume':
      return { type: 'g2d:setVolume', level: number('LEVEL', 8) }
    case 'sz_g2d_play_note':
      return { type: 'g2d:playNote', note: f('NOTE'), ms: number('MS', 300) }
  }
}

/** Reconhece só chamadas cuja avaliação inteira pode ser representada pelos blocos. */
export function gameTwoDAudioCallToIR(
  method: string,
  args: Babel.Node[],
  expression: (node: Babel.Node | undefined) => JSExpr | null,
  simple: (value: JSExpr | null) => value is JSExpr,
): JSStatement | undefined {
  const text = args[0]?.type === 'StringLiteral' ? args[0].value : undefined
  switch (method) {
    case 'playSound': {
      const freq = expression(args[0]),
        durationMs = expression(args[1])
      if (args.length === 2 && simple(freq) && simple(durationMs))
        return { type: 'g2d:playSound', freq, durationMs }
      return
    }
    case 'playFx':
      if (args.length === 1 && text !== undefined) return { type: 'g2d:playFx', fx: text }
      return
    case 'playMusic':
      if (args.length === 1 && text !== undefined) return { type: 'g2d:playMusic', tune: text }
      return

    case 'loadSound':
      if (args.length === 2 && text !== undefined && args[1]?.type === 'StringLiteral')
        return { type: 'g2d:loadSound', name: text, asset: args[1].value }
      return
    case 'playClip':
    case 'stopClip':
    case 'playTrack':
      if (args.length === 1 && text !== undefined) return { type: `g2d:${method}`, name: text }
      return
    case 'stopTrack': {
      if (!args.length) return { type: 'g2d:stopTrack' }
      const scope = gameTwoDMusicScope.safeParse(text)
      if (args.length === 1 && scope.success) return { type: 'g2d:stopTrack', scope: scope.data }
      return
    }
    case 'setSoundVolume': {
      const level = expression(args[0])
      if (args.length === 1 && simple(level)) return { type: 'g2d:setVolume', level }
      return
    }
    case 'playNote': {
      const ms = expression(args[1])
      if (args.length === 2 && text !== undefined && simple(ms))
        return { type: 'g2d:playNote', note: text, ms }
    }
  }
}

import { z } from 'zod'
import type { JSExpr } from '../../ir/schema'

export const gameTwoDMusicScope = z.enum(['all', 'synth', 'file'])
type Id = { __id?: string }
export type GameTwoDAudioStatement =
  // Áudio: toca um tom (Web Audio, sem assets).
  | (Id & {
      type: 'g2d:playSound'
      freq: number | JSExpr
      durationMs: number | JSExpr
    })
  // Áudio: efeito sonoro pronto (sintetizado), escolhido por nome.
  | (Id & { type: 'g2d:playFx'; fx: string })
  // Áudio: música de fundo em loop (sintetizada), escolhida por nome.
  | (Id & { type: 'g2d:playMusic'; tune: string })
  // Áudio: para a música de fundo.
  | (Id & { type: 'g2d:loadSound'; name: string; asset: string })
  | (Id & { type: 'g2d:playClip' | 'g2d:stopClip' | 'g2d:playTrack'; name: string })
  | (Id & { type: 'g2d:stopTrack'; scope?: z.infer<typeof gameTwoDMusicScope> })
  | (Id & { type: 'g2d:setVolume'; level: number | JSExpr })
  // Áudio: toca uma nota musical (dó ré mi…) por uma duração em ms.
  | (Id & { type: 'g2d:playNote'; note: string; ms: number | JSExpr })

export function gameTwoDAudioSchemas(
  expr: z.ZodType<JSExpr>,
  irText: () => z.ZodString,
  id: { __id: z.ZodOptional<z.ZodString> },
) {
  return [
    z.object({
      type: z.literal('g2d:playSound'),
      freq: z.union([expr, z.number()]),
      durationMs: z.union([expr, z.number()]),
      ...id,
    }),
    z.object({
      type: z.literal('g2d:playFx'),
      fx: z.string(),
      ...id,
    }),
    z.object({
      type: z.literal('g2d:playMusic'),
      tune: z.string(),
      ...id,
    }),

    z.object({
      type: z.literal('g2d:playNote'),
      note: z.string(),
      ms: z.union([expr, z.number()]),
      ...id,
    }),
    z.object({
      type: z.literal('g2d:loadSound'),
      name: irText(),
      asset: irText(),
      ...id,
    }),
    z.object({ type: z.literal('g2d:playClip'), name: irText(), ...id }),
    z.object({ type: z.literal('g2d:stopClip'), name: irText(), ...id }),
    z.object({ type: z.literal('g2d:playTrack'), name: irText(), ...id }),
    z.object({ type: z.literal('g2d:stopTrack'), scope: gameTwoDMusicScope.optional(), ...id }),
    z.object({
      type: z.literal('g2d:setVolume'),
      level: z.union([expr, z.number()]),
      ...id,
    }),
  ] as const
}

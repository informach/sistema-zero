import { z } from 'zod'

export type SceneGameKit3DStatement =
  | { type: 'g3k:loadScene'; asset: string; __id?: string }
  | { type: 'g3k:sceneStart'; charVar: string; __id?: string }

export const G3K_SCENE_STATEMENT_TYPES = ['g3k:loadScene', 'g3k:sceneStart'] as const

export function sceneGameKit3DStatementSchemas(
  text: () => z.ZodString,
  id: { __id: z.ZodOptional<z.ZodString> },
) {
  return [
    z.object({ type: z.literal('g3k:loadScene'), asset: z.string().max(64), ...id }),
    z.object({ type: z.literal('g3k:sceneStart'), charVar: text(), ...id }),
  ] as const
}

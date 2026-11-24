import { z } from 'zod'

interface CarregarCena {
  __id?: string
  type: 'g3d:loadScene'
  worldVar: string
  asset: string
}
interface InicioDaCena {
  __id?: string
  type: 'g3d:sceneStart'
  objVar: string
}
export type SceneGameThreeDStatement = CarregarCena | InicioDaCena

export function sceneGameThreeDStatementSchemas(
  text: () => z.ZodString,
  id: { __id: z.ZodOptional<z.ZodString> },
) {
  return [
    z.object({
      type: z.literal('g3d:loadScene'),
      worldVar: text(),
      asset: z.string().max(64),
      ...id,
    }),
    z.object({ type: z.literal('g3d:sceneStart'), objVar: text(), ...id }),
  ] as const
}

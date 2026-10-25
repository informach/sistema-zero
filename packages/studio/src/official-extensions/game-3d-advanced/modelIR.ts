import { z } from 'zod'
import type { JSExpr, JSStatement } from '../../ir/schema'

/**
 * IR da ANIMAÇÃO DO MODELO no Jogo 3D Avançado (review 3D, lote 11): amarrar um clipe a um
 * estado (com "repetindo" ou "uma vez"), a velocidade da animação e o chapéu "Quando um ⟨molde⟩
 * terminar a animação ⟨clipe⟩". Molde de `game-3d/modelAssetsIR.ts` e `world-3d/worldIR.ts`: os
 * membros, o zod e a lista de tipos moram aqui e a fachada `ir/schema.ts` só soma a união (ela
 * tem teto de linhas, e a união `JSStatement` está perto do TS2590).
 *
 * `clip` é o NOME do clipe dentro do `.glb` (o seletor de clipes chega no lote 13).
 */

interface Common {
  __id?: string
}

/** "No molde ⟨M⟩, no estado ⟨E⟩, tocar a animação ⟨C⟩ ⟨repetindo/uma vez⟩". `loop` ausente = repetindo. */
interface SetStateAnimNode extends Common {
  type: 'g3k:setStateAnim'
  mold: string
  state: string
  clip: string
  loop?: boolean
}

/** "Velocidade da animação de ⟨X⟩ ⟨1⟩×" (0,5 = câmera lenta; 2 = o dobro). */
interface AnimSpeedNode extends Common {
  type: 'g3k:animSpeed'
  charVar: string
  speed: JSExpr
}

/** "Quando um ⟨M⟩ terminar a animação ⟨C⟩", com o objeto da vez chamado de `itemName`. */
interface OnAnimEndNode extends Common {
  type: 'g3k:onAnimEnd'
  mold: string
  clip: string
  itemName: string
  body: JSStatement[]
}

export type GameKit3DModelStatement = SetStateAnimNode | AnimSpeedNode | OnAnimEndNode

export const G3K_MODEL_STATEMENT_TYPES = [
  'g3k:setStateAnim',
  'g3k:animSpeed',
  'g3k:onAnimEnd',
] as const

const MODEL_TYPES: ReadonlySet<string> = new Set(G3K_MODEL_STATEMENT_TYPES)

export function isGameKit3DModelStatement(value: JSStatement): value is GameKit3DModelStatement {
  return MODEL_TYPES.has(value.type)
}

/** O chapéu registra o aviso; o corpo roda depois (quando a animação termina). */
export const G3K_MODEL_DEFERRED_TYPES: readonly string[] = ['g3k:onAnimEnd']

/** O objeto da vez do "Quando … terminar a animação" (uma variável local do corpo). */
export function gameKit3DModelItemName(statement: JSStatement): string | undefined {
  return statement.type === 'g3k:onAnimEnd' && 'itemName' in statement
    ? (statement as OnAnimEndNode).itemName
    : undefined
}

type IdField = { __id: z.ZodOptional<z.ZodString> }

export function gameKit3DModelStatementSchemas(
  expr: z.ZodType<JSExpr>,
  statement: z.ZodType<JSStatement>,
  irText: () => z.ZodString,
  id: IdField,
) {
  return [
    z.object({
      type: z.literal('g3k:setStateAnim'),
      mold: irText(),
      state: irText(),
      clip: irText(),
      loop: z.boolean().optional(),
      ...id,
    }),
    z.object({ type: z.literal('g3k:animSpeed'), charVar: irText(), speed: expr, ...id }),
    z.object({
      type: z.literal('g3k:onAnimEnd'),
      mold: irText(),
      clip: irText(),
      itemName: irText(),
      body: z.array(statement),
      ...id,
    }),
  ] as const
}

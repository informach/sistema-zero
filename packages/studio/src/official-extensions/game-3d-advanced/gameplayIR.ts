import { z } from 'zod'
import type { JSExpr, JSStatement } from '../../ir/schema'

/**
 * IR dos blocos de JOGO do Jogo 3D Avançado (review 3D, lote 12): patrulhar, a mochila 🎒,
 * guardar o progresso neste computador e as fases. Molde de `modelIR.ts`: os membros, o zod e a
 * lista de tipos moram aqui e a fachada `ir/schema.ts` só soma as uniões (ela tem teto de
 * linhas, e a união `JSStatement` está perto do TS2590).
 *
 * Para poupar membros da união, a mochila é UM nó por lado: `g3k:bag` (pôr, tirar, esvaziar)
 * e `g3k:bagValue` (quantos, tem?).
 */

interface Common {
  __id?: string
}

/** "Fazer ⟨X⟩ patrulhar de x ⟨ax⟩ z ⟨az⟩ até x ⟨bx⟩ z ⟨bz⟩ com velocidade ⟨v⟩" (a cada quadro). */
interface PatrolNode extends Common {
  type: 'g3k:patrol'
  charVar: string
  ax: JSExpr
  az: JSExpr
  bx: JSExpr
  bz: JSExpr
  speed: JSExpr
}

export type GameKit3DBagOp = 'dar' | 'tirar' | 'esvaziar'

/** "Pôr ⟨n⟩ ⟨item⟩ na mochila", "Tirar ⟨n⟩ ⟨item⟩ da mochila" e "Esvaziar a mochila". */
interface BagNode extends Common {
  type: 'g3k:bag'
  op: GameKit3DBagOp
  /** Ausentes no esvaziar. */
  item?: string
  amount?: JSExpr
}

/** "Guardar ⟨valor⟩ com o nome ⟨nome⟩ neste computador". */
interface SaveValueNode extends Common {
  type: 'g3k:saveValue'
  name: string
  value: JSExpr
}

/** "Ir para a próxima fase". */
interface NextLevelNode extends Common {
  type: 'g3k:nextLevel'
}

/** "Quando começar uma fase" (a fase 1 também: começar a partida é começar a fase 1). */
interface OnLevelStartNode extends Common {
  type: 'g3k:onLevelStart'
  body: JSStatement[]
}

export type GameKit3DGameplayStatement =
  | PatrolNode
  | BagNode
  | SaveValueNode
  | NextLevelNode
  | OnLevelStartNode

/** "quantas ⟨item⟩ tem na mochila" e "a mochila tem ⟨item⟩?". */
interface BagValueNode extends Common {
  type: 'g3k:bagValue'
  op: 'quantos' | 'tem'
  item: string
}

/** "o valor guardado ⟨nome⟩ (ou ⟨reserva⟩)". */
interface SavedValueNode extends Common {
  type: 'g3k:savedValue'
  name: string
  fallback: JSExpr
}

/** "o número da fase". */
interface LevelNumberNode extends Common {
  type: 'g3k:levelNumber'
}

export type GameKit3DGameplayExpression = BagValueNode | SavedValueNode | LevelNumberNode

export const G3K_GAMEPLAY_STATEMENT_TYPES = [
  'g3k:patrol',
  'g3k:bag',
  'g3k:saveValue',
  'g3k:nextLevel',
  'g3k:onLevelStart',
] as const

export const G3K_GAMEPLAY_EXPRESSION_TYPES = [
  'g3k:bagValue',
  'g3k:savedValue',
  'g3k:levelNumber',
] as const

const STATEMENT_TYPES: ReadonlySet<string> = new Set(G3K_GAMEPLAY_STATEMENT_TYPES)
const EXPRESSION_TYPES: ReadonlySet<string> = new Set(G3K_GAMEPLAY_EXPRESSION_TYPES)

export function isGameKit3DGameplayStatement(
  value: JSStatement,
): value is GameKit3DGameplayStatement {
  return STATEMENT_TYPES.has(value.type)
}

export function isGameKit3DGameplayExpression(value: JSExpr): value is GameKit3DGameplayExpression {
  return EXPRESSION_TYPES.has(value.type)
}

/** O chapéu registra o aviso; o corpo roda depois (a cada fase que começa). */
export const G3K_GAMEPLAY_DEFERRED_TYPES: readonly string[] = ['g3k:onLevelStart']

type IdField = { __id: z.ZodOptional<z.ZodString> }

export function gameKit3DGameplayStatementSchemas(
  expr: z.ZodType<JSExpr>,
  statement: z.ZodType<JSStatement>,
  irText: () => z.ZodString,
  id: IdField,
) {
  return [
    z.object({
      type: z.literal('g3k:patrol'),
      charVar: irText(),
      ax: expr,
      az: expr,
      bx: expr,
      bz: expr,
      speed: expr,
      ...id,
    }),
    z.object({
      type: z.literal('g3k:bag'),
      op: z.enum(['dar', 'tirar', 'esvaziar']),
      item: irText().optional(),
      amount: expr.optional(),
      ...id,
    }),
    z.object({ type: z.literal('g3k:saveValue'), name: irText(), value: expr, ...id }),
    z.object({ type: z.literal('g3k:nextLevel'), ...id }),
    z.object({ type: z.literal('g3k:onLevelStart'), body: z.array(statement), ...id }),
  ] as const
}

export function gameKit3DGameplayExpressionSchemas(
  expr: z.ZodType<JSExpr>,
  irText: () => z.ZodString,
  id: IdField,
) {
  return [
    z.object({
      type: z.literal('g3k:bagValue'),
      op: z.enum(['quantos', 'tem']),
      item: irText(),
      ...id,
    }),
    z.object({ type: z.literal('g3k:savedValue'), name: irText(), fallback: expr, ...id }),
    z.object({ type: z.literal('g3k:levelNumber'), ...id }),
  ] as const
}

import { z } from 'zod'
import type { JSExpr, JSStatement } from '../../ir/schema'

/**
 * IR dos blocos NOVOS do Mundo 3D (review 3D, lote 10): coletáveis, tirar do mundo, esvaziar a
 * mochila e o Molda (modelo no personagem, no amigo e no carro; animação por estado). Molde de
 * `game-3d/platformIR.ts` e `game3dRules/ir.ts`: os membros, o zod e a lista de tipos moram aqui
 * e a fachada `ir/schema.ts` só soma a união (ela tem teto de linhas).
 *
 * ⚠️ A união `JSStatement` está perto do limite estrutural do TypeScript (TS2590): os três
 * "Usar o modelo …" são UM nó (`w3d:useModel`, discriminado por `target`), e todos são
 * interfaces (não interseções).
 */

type Option = readonly [string, string]

export const W3D_COLLECTIBLE_KINDS = [
  ['⭐ estrela', 'estrela'],
  ['💎 cristal', 'cristal'],
  ['🍎 fruta', 'fruta'],
  ['🔑 chave', 'chave'],
  ['🎁 presente', 'presente'],
] as const satisfies readonly Option[]

export const W3D_MODEL_ANIM_WHO = [
  ['personagem', 'personagem'],
  ['amigo', 'amigo'],
] as const satisfies readonly Option[]

export const W3D_MODEL_ANIM_STATES = [
  ['parado', 'parado'],
  ['andando', 'andando'],
  ['correndo', 'correndo'],
  ['pulando', 'pulando'],
] as const satisfies readonly Option[]

type OptionValue<T extends readonly Option[]> = T[number][1]
export type W3DCollectibleKind = OptionValue<typeof W3D_COLLECTIBLE_KINDS>
export type W3DModelAnimWho = OptionValue<typeof W3D_MODEL_ANIM_WHO>
export type W3DModelAnimState = OptionValue<typeof W3D_MODEL_ANIM_STATES>
export type W3DModelTarget = 'personagem' | 'amigo' | 'carro'

interface Common {
  __id?: string
}
interface CollectibleNode extends Common {
  type: 'w3d:collectible'
  n: JSExpr
  kind: W3DCollectibleKind
  name: string
  x: JSExpr
  z: JSExpr
  r: JSExpr
}
interface OnCollectItemNode extends Common {
  type: 'w3d:onCollectItem'
  name: string
  body: JSStatement[]
}
interface RemoveNamedNode extends Common {
  type: 'w3d:removeNamed'
  name: string
}
interface InventoryClearNode extends Common {
  type: 'w3d:inventoryClear'
}
/** "Usar o modelo ⟨M⟩ no personagem / no amigo ⟨N⟩ / como carroceria": um nó, três blocos. */
interface UseModelNode extends Common {
  type: 'w3d:useModel'
  target: W3DModelTarget
  model: string
  /** Só no amigo. */
  name?: string
  /** Altura (personagem/amigo) ou comprimento (carro), em metros. */
  size: JSExpr
}
interface ModelAnimNode extends Common {
  type: 'w3d:modelAnim'
  who: W3DModelAnimWho
  /** Só no amigo. */
  name?: string
  state: W3DModelAnimState
  clip: string
}

export type World3DNewStatement =
  | CollectibleNode
  | OnCollectItemNode
  | RemoveNamedNode
  | InventoryClearNode
  | UseModelNode
  | ModelAnimNode

export const W3D_NEW_STATEMENT_TYPES = [
  'w3d:collectible',
  'w3d:onCollectItem',
  'w3d:removeNamed',
  'w3d:inventoryClear',
  'w3d:useModel',
  'w3d:modelAnim',
] as const

const NEW_TYPES: ReadonlySet<string> = new Set(W3D_NEW_STATEMENT_TYPES)

export function isWorld3DNewStatement(value: JSStatement): value is World3DNewStatement {
  return NEW_TYPES.has(value.type)
}

/** Configuram o mundo uma vez (o modelo do personagem/amigo/carro e o clipe de cada estado). */
export const W3D_NEW_START_ONLY_TYPES: readonly string[] = ['w3d:useModel', 'w3d:modelAnim']

type IdField = { __id: z.ZodOptional<z.ZodString> }

const optionValues = <T extends readonly Option[]>(options: T) =>
  z.enum(options.map(([, value]) => value) as [T[number][1], ...T[number][1][]])

export function world3DNewStatementSchemas(
  expr: z.ZodType<JSExpr>,
  statement: z.ZodType<JSStatement>,
  irText: () => z.ZodString,
  id: IdField,
) {
  return [
    z.object({
      type: z.literal('w3d:collectible'),
      n: expr,
      kind: optionValues(W3D_COLLECTIBLE_KINDS),
      name: irText(),
      x: expr,
      z: expr,
      r: expr,
      ...id,
    }),
    z.object({
      type: z.literal('w3d:onCollectItem'),
      name: irText(),
      body: z.array(statement),
      ...id,
    }),
    z.object({ type: z.literal('w3d:removeNamed'), name: irText(), ...id }),
    z.object({ type: z.literal('w3d:inventoryClear'), ...id }),
    z.object({
      type: z.literal('w3d:useModel'),
      target: z.enum(['personagem', 'amigo', 'carro']),
      model: irText(),
      name: irText().optional(),
      size: expr,
      ...id,
    }),
    z.object({
      type: z.literal('w3d:modelAnim'),
      who: optionValues(W3D_MODEL_ANIM_WHO),
      name: irText().optional(),
      state: optionValues(W3D_MODEL_ANIM_STATES),
      clip: irText(),
      ...id,
    }),
  ] as const
}

import { z } from 'zod'
import type { JSExpr, JSStatement } from '../../ir/schema'
import {
  type ModelAssetsGameThreeDStatement,
  modelAssetsGameThreeDStatementSchemas,
} from './modelAssetsIR'

type IdField = { __id: z.ZodOptional<z.ZodString> }

/**
 * Cada nó é uma INTERFACE, não uma interseção (`Common & {...}`). Parece
 * detalhe de estilo e não é: a união `JSStatement` do núcleo tem centenas de
 * membros, e uma união de interseções aninhada nela estoura o
 * "union type too complex to represent" do TypeScript. União de interfaces, não.
 */
interface Common {
  __id?: string
}

interface ClassicPlatformer extends Common {
  type: 'g3d:classicPlatformer'
  objVar: string
  worldVar: string
  speed: number | JSExpr
  jump: number | JSExpr
}
interface ForEachHit extends Common {
  type: 'g3d:forEachHit'
  objVar: string
  side: string
  itemName: string
  body: JSStatement[]
}
/**
 * Três propriedades do sólido num nó só, pelo mesmo motivo do StageNode: cada
 * membro novo da união `JSStatement` custa caro no limite estrutural do TS.
 */
interface ObjectFlag extends Common {
  type: 'g3d:objectFlag'
  objVar: string
  flag: string
  /** Só quando `flag` é 'estampa'. */
  pattern?: string
  colorA?: string
  colorB?: string
}
interface SetObjectValue extends Common {
  type: 'g3d:setObjectValue'
  objVar: string
  key: string
  value: number | JSExpr
}
interface CreatePlatformScene extends Common {
  type: 'g3d:createPlatformScene'
  canvasId: string
  varName: string
}
interface CreateHero extends Common {
  type: 'g3d:createHero'
  varName: string
  worldVar: string
  color: string
}
/**
 * O restante dos comandos de fase do Kit Plataforma cabe NESTE nó,
 * discriminado pelo campo `op`.
 *
 * Não é preguiça de tipagem: a união `JSStatement` do núcleo já está no limite
 * estrutural do TypeScript ("union type too complex to represent" nos lugares
 * que fazem spread sobre ela), então cada tipo NOVO custa caro. Um subsistema
 * inteiro entra como um membro só, e a validação fina fica no zod + no codec,
 * que é o único que escreve estes nós.
 *
 * `createPlatformScene` e `createHero` ficam de fora porque DECLARAM nome e o
 * registro de referências semânticas é indexado por `type`.
 */
/** O "quando acontecer" é REGISTRO DE EVENTO, não comando: placement próprio. */
interface OnStage extends Common {
  type: 'g3d:onStage'
  worldVar: string
  event: string
  body: JSStatement[]
}
/**
 * Os três comandos POR QUADRO do kit. Tipo separado do StageNode porque
 * placement é por TIPO de IR: "atualizar a fase" e "câmera de lado" só valem
 * dentro do laço, enquanto montar/limpar/recomeçar valem em qualquer lugar.
 */
interface StageFrame extends Common {
  type: 'g3d:stageFrame'
  op: 'passo' | 'camera' | 'fogo'
  worldVar: string
  objVar: string
}
interface StageNode extends Common {
  type: 'g3d:stage'
  op: 'tema' | 'montar' | 'limpar' | 'recomecar' | 'numero'
  worldVar: string
  text?: string
  a?: number | JSExpr
  b?: number | JSExpr
}

/**
 * Os nós de IR do lote de plataforma do Jogo 3D — a plataforma clássica de lado
 * e o Kit Plataforma inteiro. Ficam AQUI, e não no `ir/schema.ts`, pelo mesmo
 * motivo do codec: a fachada central tem teto de linhas
 * (`generators/__tests__/architecture.test.ts`) e a extensão cresce.
 */
export type PlatformGameThreeDStatement =
  | ClassicPlatformer
  | ForEachHit
  | ObjectFlag
  | SetObjectValue
  | CreatePlatformScene
  | CreateHero
  | StageNode
  | StageFrame
  | OnStage
  // Modelo .glb e céu .hdr do Molda (lote 7): entram pela MESMA porta da fachada,
  // porque cada import novo no `ir/schema.ts` custa linhas que ele não tem.
  | ModelAssetsGameThreeDStatement

interface KeyPressed extends Common {
  type: 'g3d:keyPressed'
  key: string
}
interface HitIs extends Common {
  type: 'g3d:hitIs'
  hitVar: string
  objVar: string
}
interface ObjectValue extends Common {
  type: 'g3d:objectValue'
  objVar: string
  key: string
}
/** Mesma economia do StageNode, agora do lado das perguntas. */
interface StageAsk extends Common {
  type: 'g3d:stageAsk'
  op: 'fase' | 'estado' | 'heroi'
  worldVar: string
  objVar: string
  what: string
}

/** Os reporters do lote, no lado dos TIPOS. */
export type PlatformGameThreeDExpr = KeyPressed | HitIs | ObjectValue | StageAsk

export function platformGameThreeDExpressionSchemas(irText: () => z.ZodString, id: IdField) {
  return [
    z.object({ type: z.literal('g3d:keyPressed'), key: irText(), ...id }),
    z.object({ type: z.literal('g3d:hitIs'), hitVar: irText(), objVar: irText(), ...id }),
    z.object({ type: z.literal('g3d:objectValue'), objVar: irText(), key: irText(), ...id }),
    z.object({
      type: z.literal('g3d:stageAsk'),
      op: z.enum(['fase', 'estado', 'heroi']),
      worldVar: irText(),
      objVar: irText(),
      what: irText(),
      ...id,
    }),
  ] as const
}

export function platformGameThreeDStatementSchemas(
  expr: z.ZodType<JSExpr>,
  statement: z.ZodType<JSStatement>,
  irText: () => z.ZodString,
  id: IdField,
) {
  const numeric = z.union([expr, z.number()])
  return [
    z.object({
      type: z.literal('g3d:classicPlatformer'),
      objVar: irText(),
      worldVar: irText(),
      speed: numeric,
      jump: numeric,
      ...id,
    }),
    z.object({
      type: z.literal('g3d:forEachHit'),
      objVar: irText(),
      side: irText(),
      itemName: irText(),
      body: z.array(statement),
      ...id,
    }),
    z.object({
      type: z.literal('g3d:objectFlag'),
      objVar: irText(),
      flag: z.enum(['carregar', 'atravessavel', 'sem-sombra', 'estampa']),
      pattern: irText().optional(),
      colorA: irText().optional(),
      colorB: irText().optional(),
      ...id,
    }),
    z.object({
      type: z.literal('g3d:setObjectValue'),
      objVar: irText(),
      key: irText(),
      value: numeric,
      ...id,
    }),
    z.object({
      type: z.literal('g3d:createPlatformScene'),
      canvasId: irText(),
      varName: irText(),
      ...id,
    }),
    z.object({
      type: z.literal('g3d:createHero'),
      varName: irText(),
      worldVar: irText(),
      color: irText(),
      ...id,
    }),
    z.object({
      type: z.literal('g3d:stage'),
      op: z.enum(['tema', 'montar', 'limpar', 'recomecar', 'numero']),
      worldVar: irText(),
      text: irText().optional(),
      a: numeric.optional(),
      b: numeric.optional(),
      ...id,
    }),
    z.object({
      type: z.literal('g3d:stageFrame'),
      op: z.enum(['passo', 'camera', 'fogo']),
      worldVar: irText(),
      objVar: irText(),
      ...id,
    }),
    z.object({
      type: z.literal('g3d:onStage'),
      worldVar: irText(),
      event: irText(),
      body: z.array(statement),
      ...id,
    }),
    ...modelAssetsGameThreeDStatementSchemas(expr, irText, id),
  ] as const
}

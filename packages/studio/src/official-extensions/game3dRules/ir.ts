import { z } from 'zod'
import type { JSExpr, JSStatement } from '../../ir/schema'
import { isThreeKeyCode } from '../threeKeys'

/**
 * IR das REGRAS DE JOGO 3D (placar, vida, telas, contagem, sorteio, tremer, piscar e os
 * "Quando…" de tecla, clique e encostar), a mesma cara nas três extensões 3D.
 *
 * ⚠️ Cada regra é UM membro da união `JSStatement`/`JSExpr`, com o `type` cobrindo os três
 * prefixos (`'g3d:cornerText' | 'w3d:cornerText' | 'g3k:cornerText'`). A união do núcleo está
 * perto do limite estrutural do TypeScript (TS2590), então três extensões não podem custar
 * três membros por regra. Pelo mesmo motivo, nada aqui é lido com
 * `Extract<JSStatement, { type: … }>`: o literal de um prefixo só não casa com o membro.
 *
 * Os nomes evitam de propósito os tipos antigos do Jogo 3D Avançado (`g3k:hudText`,
 * `g3k:endGame`, `g3k:cameraShake`): no lote 11 o Avançado passou a usar estes, e os antigos
 * SAÍRAM da união (dois membros com o mesmo discriminante estragariam os `switch`).
 *
 * O ZOD só aceita os prefixos LIGADOS (`GAME_RULES_ENABLED_PREFIXES`): o tipo já é dos três,
 * mas um projeto com `w3d:cornerText` não valida enquanto o Mundo 3D não tiver o runtime.
 */

export const GAME_RULES_PREFIXES = ['g3d', 'w3d', 'g3k'] as const
export type GameRulesPrefix = (typeof GAME_RULES_PREFIXES)[number]

/** Os prefixos que JÁ têm blocos, runtime e Ponte. O Mundo 3D entrou no lote 10; o Avançado no 11. */
export const GAME_RULES_ENABLED_PREFIXES: readonly GameRulesPrefix[] = ['g3d', 'w3d', 'g3k']

/**
 * Prefixos em que a vida é SEMPRE do jogador (sem objeto): no Mundo 3D há um jogador só (a pé,
 * de carro ou de barco), então "Dar 3 de vida ao jogador" não pede objeto. O nó de vida desses
 * prefixos não tem `objVar`, e o código sai sem ele (`SZWorld3D.setLife(3)`).
 */
export const GAME_RULES_IMPLICIT_HERO_PREFIXES: readonly GameRulesPrefix[] = ['w3d']

/**
 * Regras que um prefixo NÃO oferece (nem bloco, nem leitura na Ponte): no Mundo 3D não há
 * objetos nem grupos da criança, então piscar, tecla, clique e encostar ficam de fora (o mundo já
 * tem os seus "Quando…"). Os nomes são os MÉTODOS do global.
 */
export const GAME_RULES_PREFIX_OFF: Readonly<Partial<Record<GameRulesPrefix, readonly string[]>>> =
  {
    w3d: ['blink', 'onKey', 'onClickObject', 'onCanvasClick', 'onTouchGroup'],
    // O Avançado tem vida POR ENTIDADE (o `hurt`/`heal` dele é outro: meio segundo de
    // invencibilidade e recolher na morte), recomeça ao entrar em "jogando" e tem os próprios
    // "Quando…" de tecla, clique e encostar. Daqui ele usa placar, telas, fim, contagem,
    // sorteio e tremor. ⚠️ `hurt`/`heal` PRECISAM estar aqui: o global é o mesmo
    // (`SZGameKit3D.hurt`), e sem a régua o parser das regras roubaria a chamada.
    g3k: [
      'setLife',
      'hurt',
      'heal',
      'lifeOf',
      'onLifeOver',
      'restart',
      'afterSeconds',
      'blink',
      'onKey',
      'onClickObject',
      'onCanvasClick',
      'onTouchGroup',
    ],
  }

/** Global do runtime de cada prefixo (geração e leitura de código). */
export const GAME_RULES_GLOBALS: Readonly<Record<GameRulesPrefix, string>> = {
  g3d: 'SZGame3D',
  w3d: 'SZWorld3D',
  g3k: 'SZGameKit3D',
}

/** Extensão dona de cada prefixo (o `seen` do buildIR). */
export const GAME_RULES_EXTENSIONS: Readonly<Record<GameRulesPrefix, string>> = {
  g3d: 'game-3d',
  w3d: 'world-3d',
  g3k: 'game-3d-advanced',
}

type Rule<N extends string> = `${GameRulesPrefix}:${N}`

/** Lugares do HUD; o centro também permite criar uma mira sem blocos de página. */
export const GAME_RULES_CORNERS = [
  ['↖ em cima, à esquerda', 'top-left'],
  ['↑ em cima, no meio', 'top-center'],
  ['↗ em cima, à direita', 'top-right'],
  ['↙ embaixo, à esquerda', 'bottom-left'],
  ['↓ embaixo, no meio', 'bottom-center'],
  ['↘ embaixo, à direita', 'bottom-right'],
  ['⊕ no centro', 'center'],
] as const satisfies readonly (readonly [string, string])[]

export const GAME_RULES_SCREENS = [
  ['início', 'inicio'],
  ['fim', 'fim'],
  ['vitória', 'vitoria'],
] as const satisfies readonly (readonly [string, string])[]

export const GAME_RULES_RESULTS = [
  ['você perdeu', 'perdeu'],
  ['você ganhou', 'ganhou'],
] as const satisfies readonly (readonly [string, string])[]

type OptionValue<T extends readonly (readonly [string, string])[]> = T[number][1]
export type GameRulesCorner = OptionValue<typeof GAME_RULES_CORNERS>
export type GameRulesScreen = OptionValue<typeof GAME_RULES_SCREENS>
export type GameRulesResult = OptionValue<typeof GAME_RULES_RESULTS>
export type GameRulesLifeOp = 'dar' | 'machucar' | 'curar'
export type GameRulesEvent =
  | 'vida-acabou'
  | 'tempo-acabou'
  | 'tecla'
  | 'clique'
  | 'clique-cena'
  | 'encostar'

/** Interfaces, não interseções: uma união de interseções aninhada estoura o TS2590. */
interface Common {
  __id?: string
}
interface CornerTextRule extends Common {
  type: Rule<'cornerText'>
  corner: GameRulesCorner
  text: JSExpr
}
interface AddScoreRule extends Common {
  type: Rule<'addScore'>
  value: JSExpr
}
/** Dar, machucar e curar num nó só: o mesmo objeto e o mesmo número, outro verbo. */
interface LifeRule extends Common {
  type: Rule<'life'>
  op: GameRulesLifeOp
  /** Ausente nos prefixos de jogador implícito (`GAME_RULES_IMPLICIT_HERO_PREFIXES`). */
  objVar?: string
  value: JSExpr
}
interface ScreenTextRule extends Common {
  type: Rule<'screenText'>
  screen: GameRulesScreen
  title: string
  text: string
  button: string
}
interface GameOverRule extends Common {
  type: Rule<'gameOver'>
  result: GameRulesResult
}
interface RestartRule extends Common {
  type: Rule<'restart'>
}
interface AfterSecondsRule extends Common {
  type: Rule<'afterSeconds'>
  secs: JSExpr
  body: JSStatement[]
}
/** Começar e parar a contagem: `secs` só existe ao começar. */
interface TimerRule extends Common {
  type: Rule<'timer'>
  op: 'comecar' | 'parar'
  secs?: JSExpr
}
interface ShakeCameraRule extends Common {
  type: Rule<'shakeCamera'>
  strength: JSExpr
  secs: JSExpr
}
interface BlinkRule extends Common {
  type: Rule<'blink'>
  objVar: string
  secs: JSExpr
}
/**
 * Os cinco "Quando…" das regras num nó só, discriminado por `event` (o molde do
 * `g3d:onStage`). Cada evento usa só os campos que lhe cabem; o codec é o único que
 * escreve estes nós e o zod confere a combinação.
 */
interface OnGameRule extends Common {
  type: Rule<'onGame'>
  event: GameRulesEvent
  objVar?: string
  key?: string
  groupVar?: string
  itemName?: string
  body: JSStatement[]
}

export type GameRulesStatement =
  | CornerTextRule
  | AddScoreRule
  | LifeRule
  | ScreenTextRule
  | GameOverRule
  | RestartRule
  | AfterSecondsRule
  | TimerRule
  | ShakeCameraRule
  | BlinkRule
  | OnGameRule

/** "os pontos", "o tempo que falta" e "a vida de ⟨obj⟩". */
interface GameValueRule extends Common {
  type: Rule<'gameValue'>
  what: 'pontos' | 'tempo' | 'vida'
  objVar?: string
}
/** "um número de ⟨a⟩ a ⟨b⟩" e "tem chance de ⟨a⟩%?". */
interface RandomRule extends Common {
  type: Rule<'random'>
  op: 'entre' | 'chance'
  a: JSExpr
  b?: JSExpr
}

export type GameRulesExpression = GameValueRule | RandomRule

export const GAME_RULES_STATEMENT_NAMES = [
  'cornerText',
  'addScore',
  'life',
  'screenText',
  'gameOver',
  'restart',
  'afterSeconds',
  'timer',
  'shakeCamera',
  'blink',
  'onGame',
] as const
export const GAME_RULES_EXPRESSION_NAMES = ['gameValue', 'random'] as const
export type GameRulesStatementName = (typeof GAME_RULES_STATEMENT_NAMES)[number]

/** `g3d:onGame` → `['g3d', 'onGame']` (ou null se não é regra). */
export function splitGameRulesType(type: string): [GameRulesPrefix, string] | null {
  const colon = type.indexOf(':')
  if (colon < 0) return null
  const prefix = type.slice(0, colon) as GameRulesPrefix
  if (!(GAME_RULES_PREFIXES as readonly string[]).includes(prefix)) return null
  return [prefix, type.slice(colon + 1)]
}

const STATEMENT_NAMES: ReadonlySet<string> = new Set(GAME_RULES_STATEMENT_NAMES)
const EXPRESSION_NAMES: ReadonlySet<string> = new Set(GAME_RULES_EXPRESSION_NAMES)

export function isGameRulesStatement(value: JSStatement): value is GameRulesStatement {
  const split = splitGameRulesType(value.type)
  return split !== null && STATEMENT_NAMES.has(split[1])
}
export function isGameRulesExpression(value: JSExpr): value is GameRulesExpression {
  const split = splitGameRulesType(value.type)
  return split !== null && EXPRESSION_NAMES.has(split[1])
}

/** Todos os tipos de uma regra, nos três prefixos (para as tabelas por `type`). */
export function gameRulesTypes(name: string): string[] {
  return GAME_RULES_PREFIXES.map((prefix) => `${prefix}:${name}`)
}

/** Os tipos de statement das regras de UM prefixo (o `G3D_STATEMENT_TYPES` e irmãos). */
export function gameRulesStatementTypesFor(prefix: GameRulesPrefix): string[] {
  return GAME_RULES_STATEMENT_NAMES.map((name) => `${prefix}:${name}`)
}

/** Corpos que o runtime REGISTRA e roda depois (os "Quando…" e o "Depois de N s"). */
export const GAME_RULES_DEFERRED_TYPES: readonly string[] = [
  ...gameRulesTypes('onGame'),
  ...gameRulesTypes('afterSeconds'),
]
/**
 * O "Depois de N s": raiz de 🔁 Enquanto estiver rodando, mas que TAMBÉM cabe num corpo de
 * evento ou de função (cada chamada agenda um aviso), nunca num laço (agendaria um por quadro).
 * NÃO é laço: o corpo roda uma vez, como o de um "Quando…" (`ir/lifecycle.ts`). O espelho no
 * Blockly é o `AFTER_SECONDS_PLACEMENT` de `game3dRules/blocks.ts`.
 */
export const GAME_RULES_NESTABLE_ROOT_TYPES: readonly string[] = gameRulesTypes('afterSeconds')

/** Tecla e clique rodam dentro do gesto do navegador (liberam som). */
export function gameRulesProvidesUserGesture(statement: JSStatement): boolean {
  return (
    isGameRulesStatement(statement) &&
    statement.type.endsWith(':onGame') &&
    'event' in statement &&
    (statement.event === 'tecla' ||
      statement.event === 'clique' ||
      statement.event === 'clique-cena')
  )
}

/** O "chamando de ⟨item⟩" do encostar: a variável local do corpo, que é um objeto do jogo. */
export function gameRulesItemName(statement: JSStatement): string | undefined {
  if (!isGameRulesStatement(statement) || !statement.type.endsWith(':onGame')) return undefined
  const rule = statement as OnGameRule
  return rule.event === 'encostar' && rule.itemName ? rule.itemName : undefined
}

type IdField = { __id: z.ZodOptional<z.ZodString> }

function ruleType<N extends string>(name: N) {
  const values = GAME_RULES_ENABLED_PREFIXES.map((prefix) => `${prefix}:${name}` as Rule<N>)
  return z.enum(values as [Rule<N>, ...Rule<N>[]])
}

const optionValues = <T extends readonly (readonly [string, string])[]>(options: T) =>
  z.enum(options.map(([, value]) => value) as [T[number][1], ...T[number][1][]])

/**
 * Os campos de objeto e grupo das regras: o seletor vazio geraria `_` no código (um nome que não
 * existe) sem aviso nenhum. O zod recusa, e o diagnóstico vira o balão no bloco.
 */
const named = (value: unknown): value is string => typeof value === 'string' && value.trim() !== ''
const EMPTY_NAME = 'Escolha o nome do objeto neste bloco (o campo ficou vazio).'
const EMPTY_GROUP = 'Escolha o grupo neste bloco (o campo ficou vazio).'

function implicitHero(type: string): boolean {
  const split = splitGameRulesType(type)
  return split !== null && GAME_RULES_IMPLICIT_HERO_PREFIXES.includes(split[0])
}

type Ctx = z.core.$RefinementCtx
function requireNamed(ctx: Ctx, value: unknown, path: string, message: string): void {
  if (!named(value)) ctx.addIssue({ code: 'custom', path: [path], message })
}
function forbid(ctx: Ctx, node: Record<string, unknown>, fields: readonly string[], why: string) {
  for (const field of fields) {
    if (node[field] !== undefined) {
      ctx.addIssue({ code: 'custom', path: [field], message: `"${field}" não existe ${why}` })
    }
  }
}
/** A vida de quem: o objeto nos prefixos com objeto, NENHUM no jogador implícito (Mundo 3D). */
function checkLifeOwner(ctx: Ctx, node: { type: string; objVar?: string }): void {
  if (implicitHero(node.type)) forbid(ctx, node, ['objVar'], 'aqui: a vida é sempre do jogador')
  else requireNamed(ctx, node.objVar, 'objVar', EMPTY_NAME)
}

/**
 * O "Quando…" das regras é UM nó discriminado por `event`: cada evento usa só os campos dele
 * (o comentário do `OnGameRule`). Sem esta conferência, `tempo-acabou` com objeto e tecla,
 * `clique` sem objeto ou uma tecla que não existe passavam e geravam código morto.
 */
function checkOnGame(node: OnGameRule, ctx: Ctx): void {
  const record = node as unknown as Record<string, unknown>
  switch (node.event) {
    case 'vida-acabou':
      checkLifeOwner(ctx, node)
      forbid(ctx, record, ['key', 'groupVar', 'itemName'], 'em "quando a vida acabar"')
      return
    case 'tempo-acabou':
      forbid(
        ctx,
        record,
        ['objVar', 'key', 'groupVar', 'itemName'],
        'em "quando a contagem acabar"',
      )
      return
    case 'tecla':
      if (!isThreeKeyCode(node.key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['key'],
          message: `A tecla "${String(node.key ?? '')}" não está na lista do bloco.`,
        })
      }
      forbid(ctx, record, ['objVar', 'groupVar', 'itemName'], 'em "quando apertar a tecla"')
      return
    case 'clique':
      requireNamed(ctx, node.objVar, 'objVar', EMPTY_NAME)
      forbid(ctx, record, ['key', 'groupVar', 'itemName'], 'em "quando clicar"')
      return
    case 'clique-cena':
      forbid(ctx, record, ['objVar', 'key', 'groupVar', 'itemName'], 'em "quando clicar no jogo"')
      if (!node.type.startsWith('g3d:'))
        ctx.addIssue({
          code: 'custom',
          path: ['event'],
          message: 'Este evento pertence ao Jogo 3D.',
        })
      return
    case 'encostar':
      requireNamed(ctx, node.objVar, 'objVar', EMPTY_NAME)
      requireNamed(ctx, node.groupVar, 'groupVar', EMPTY_GROUP)
      forbid(ctx, record, ['key'], 'em "quando encostar"')
      if (node.itemName !== undefined) {
        requireNamed(ctx, node.itemName, 'itemName', 'Dê um nome a quem encostou (ex.: item).')
        // O nome de quem encostou SOMBREIA o grupo (ou o objeto) dentro do corpo: "tirar do
        // grupo estrelas a estrelas" tiraria o item dele mesmo, e o grupo some do corpo.
        if (named(node.itemName) && node.itemName === node.groupVar) {
          ctx.addIssue({
            code: 'custom',
            path: ['itemName'],
            message: `Quem encostou não pode se chamar "${node.itemName}", o mesmo nome do grupo: escolha outro (ex.: item).`,
          })
        } else if (named(node.itemName) && node.itemName === node.objVar) {
          ctx.addIssue({
            code: 'custom',
            path: ['itemName'],
            message: `Quem encostou não pode se chamar "${node.itemName}", o mesmo nome do objeto: escolha outro (ex.: item).`,
          })
        }
      }
      return
  }
}

export function gameRulesExpressionSchemas(
  expr: z.ZodType<JSExpr>,
  irText: () => z.ZodString,
  id: IdField,
) {
  return [
    z
      .object({
        type: ruleType('gameValue'),
        what: z.enum(['pontos', 'tempo', 'vida']),
        objVar: irText().optional(),
        ...id,
      })
      .superRefine((node, ctx) => {
        if (node.what === 'vida') checkLifeOwner(ctx, node)
        else forbid(ctx, node, ['objVar'], 'em pontos e tempo')
      }),
    z.object({
      type: ruleType('random'),
      op: z.enum(['entre', 'chance']),
      a: expr,
      b: expr.optional(),
      ...id,
    }),
  ] as const
}

export function gameRulesStatementSchemas(
  expr: z.ZodType<JSExpr>,
  statement: z.ZodType<JSStatement>,
  irText: () => z.ZodString,
  id: IdField,
) {
  return [
    z.object({
      type: ruleType('cornerText'),
      corner: optionValues(GAME_RULES_CORNERS),
      text: expr,
      ...id,
    }),
    z.object({ type: ruleType('addScore'), value: expr, ...id }),
    z
      .object({
        type: ruleType('life'),
        op: z.enum(['dar', 'machucar', 'curar']),
        objVar: irText().optional(),
        value: expr,
        ...id,
      })
      .superRefine((node, ctx) => checkLifeOwner(ctx, node)),
    z.object({
      type: ruleType('screenText'),
      screen: optionValues(GAME_RULES_SCREENS),
      title: z.string(),
      text: z.string(),
      button: z.string(),
      ...id,
    }),
    z.object({ type: ruleType('gameOver'), result: optionValues(GAME_RULES_RESULTS), ...id }),
    z.object({ type: ruleType('restart'), ...id }),
    z.object({
      type: ruleType('afterSeconds'),
      secs: expr,
      body: z.array(statement),
      ...id,
    }),
    z.object({
      type: ruleType('timer'),
      op: z.enum(['comecar', 'parar']),
      secs: expr.optional(),
      ...id,
    }),
    z.object({ type: ruleType('shakeCamera'), strength: expr, secs: expr, ...id }),
    z
      .object({ type: ruleType('blink'), objVar: irText(), secs: expr, ...id })
      .superRefine((node, ctx) => requireNamed(ctx, node.objVar, 'objVar', EMPTY_NAME)),
    z
      .object({
        type: ruleType('onGame'),
        event: z.enum([
          'vida-acabou',
          'tempo-acabou',
          'tecla',
          'clique',
          'clique-cena',
          'encostar',
        ]),
        objVar: irText().optional(),
        key: irText().optional(),
        groupVar: irText().optional(),
        itemName: irText().optional(),
        body: z.array(statement),
        ...id,
      })
      .superRefine((node, ctx) => checkOnGame(node as OnGameRule, ctx)),
  ] as const
}

/**
 * "Dar N de vida" é PREPARAÇÃO (começar com N vidas): num laço, a vida e a invencibilidade
 * voltariam ao começo a cada quadro e ninguém se machucaria. Cabe no início, num "Quando…" e
 * numa função; num laço, não (o espelho no Blockly é o `resource-creator` do bloco).
 */
export function isGameRulesSetLife(node: { type?: unknown; op?: unknown }): boolean {
  if (typeof node.type !== 'string' || node.op !== 'dar') return false
  const split = splitGameRulesType(node.type)
  return split !== null && split[1] === 'life'
}

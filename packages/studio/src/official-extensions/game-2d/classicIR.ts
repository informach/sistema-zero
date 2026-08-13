import { z } from 'zod'
import type { JSExpr, JSStatement } from '../../ir/schema'
import { GAME_UI_FONT_IDS } from '../gameUiFonts/catalog'
import { GAME_TWO_D_TILE_CONTACT_FILTERS, GAME_TWO_D_VECTOR_TILE_ROLES } from './classicContracts'

type IdField = { __id: z.ZodOptional<z.ZodString> }
const ACTIONS = [
  'left',
  'right',
  'up',
  'down',
  'jump',
  'action',
  'select',
  'start',
  'pause',
] as const

/**
 * Os TIPOS do que a extensão escreve na tela, aqui pelo mesmo motivo dos schemas
 * logo abaixo: a fachada `ir/schema.ts` tem teto de linhas travado, e a catraca
 * existe para empurrar código de extensão para a extensão. É o molde que a gk já
 * usa com o `GameKitCampaignStatement`.
 */
export type ClassicGameTwoDStatement = { __id?: string } & (
  | {
      type: 'g2d:paintShapeRecipe'
      ctxVar: string
      recipe: string
    }
  | {
      type: 'g2d:loadVectorCampaignLevel'
      index: number | JSExpr
      tilesetVars: string[]
      manifest: string
      size: number | JSExpr
      spawnX: number | JSExpr
      spawnY: number | JSExpr
      mapVar: string
      worldVar: string
      levelVar: string
      enemyTypeVars?: string[]
      journey?: number | JSExpr
    }
  | {
      type: 'g2d:drawPixelText'
      ctxVar: string
      text: string
      x: number | JSExpr
      y: number | JSExpr
      size: number | JSExpr
      color: string
      align: 'left' | 'center' | 'right'
    }
  // Irmão do "Escrever texto pixel" que aceita um VALOR: o placar mostra pontos,
  // moedas e tempo, que são variáveis, e o de texto só aceita literal.
  | {
      type: 'g2d:drawPixelScore'
      ctxVar: string
      label: string
      value: number | JSExpr
      x: number | JSExpr
      y: number | JSExpr
      size: number | JSExpr
      color: string
    }
  | { type: 'g2d:drawFade'; ctxVar: string; percent: number | JSExpr; color: string }
  // A letra de TODO texto do jogo. Quem resolve a escolha é quem MONTA o documento
  // (só a fonte escolhida é embutida), então o runtime só confere se foi obedecido.
  | { type: 'g2d:useFont'; font: string }
  // Uma TELA feita de imagem. Cobre igual ao cenário e, ao contrário dele, ANUNCIA.
  | { type: 'g2d:showImageScreen'; ctxVar: string; image: string }
)

/** Schemas do lote clássico ficam na extensão, não na fachada central da IR. */
export function classicGameTwoDExpressionSchemas(
  expr: z.ZodType<JSExpr>,
  irText: () => z.ZodString,
  id: IdField,
) {
  return [
    z.object({ type: z.literal('g2d:actionDown'), action: z.enum(ACTIONS), ...id }),
    z.object({ type: z.literal('g2d:actionPressed'), action: z.enum(ACTIONS), ...id }),
    z.object({ type: z.literal('g2d:tileContactIs'), contactVar: irText(), index: expr, ...id }),
    z.object({
      type: z.literal('g2d:campaignValue'),
      key: irText(),
      fallback: expr,
      ...id,
    }),
  ] as const
}

export function classicGameTwoDStatementSchemas(
  expr: z.ZodType<JSExpr>,
  statement: z.ZodType<JSStatement>,
  irText: () => z.ZodString,
  id: IdField,
) {
  const numeric = z.union([expr, z.number()])
  return [
    z.object({
      type: z.literal('g2d:paintShapeRecipe'),
      ctxVar: irText(),
      recipe: irText(),
      ...id,
    }),
    z.object({
      type: z.literal('g2d:loadVectorCampaignLevel'),
      index: numeric,
      tilesetVars: z.array(irText()).min(1).max(32),
      manifest: irText(),
      size: numeric,
      spawnX: numeric,
      spawnY: numeric,
      mapVar: irText(),
      worldVar: irText(),
      levelVar: irText(),
      enemyTypeVars: z.array(irText()).max(32).optional(),
      journey: numeric.optional(),
      ...id,
    }),
    z.object({
      type: z.literal('g2d:onActionPressed'),
      action: z.enum(ACTIONS),
      body: z.array(statement),
      ...id,
    }),
    z.object({
      type: z.literal('g2d:setEnemyStompMode'),
      typeVar: irText(),
      mode: z.enum(['defeat', 'damage', 'squash', 'shell', 'spiky']),
      ...id,
    }),
    z.object({
      type: z.literal('g2d:updateEnemyShells'),
      typeVar: irText(),
      worldVar: irText(),
      ...id,
    }),
    z.object({
      type: z.literal('g2d:enableClassicControls'),
      mode: z.enum(['auto', 'always', 'off']),
      ...id,
    }),
    z.object({
      type: z.literal('g2d:classicPlatformer'),
      spriteVar: irText(),
      speed: numeric,
      jump: numeric,
      ...id,
    }),
    z.object({
      type: z.literal('g2d:createVectorTileset'),
      varName: irText(),
      size: numeric,
      ...id,
    }),
    z.object({
      type: z.literal('g2d:defineVectorTile'),
      tilesetVar: irText(),
      index: numeric,
      shape: irText(),
      // 'contact' = a criança ATRAVESSA a peça e o jogo avisa. É o que faltava para
      // moeda, lava e água existirem no cenário: o contato de tile só nascia da
      // RESOLUÇÃO de colisão, então valia apenas para sólido e plataforma.
      role: z.enum(GAME_TWO_D_VECTOR_TILE_ROLES),
      ...id,
    }),
    z.object({
      type: z.literal('g2d:createVectorTileMap'),
      varName: irText(),
      tilesetVar: irText(),
      grid: irText(),
      ...id,
    }),
    z.object({
      type: z.literal('g2d:forEachTileContact'),
      spriteVar: irText(),
      mapVar: irText(),
      side: z.enum(GAME_TWO_D_TILE_CONTACT_FILTERS),
      contactName: irText(),
      body: z.array(statement),
      ...id,
    }),
    z.object({
      type: z.literal('g2d:setTileAtContact'),
      contactVar: irText(),
      index: numeric,
      ...id,
    }),
    z.object({
      type: z.literal('g2d:drawPixelText'),
      ctxVar: irText(),
      text: irText(),
      x: numeric,
      y: numeric,
      size: numeric,
      color: irText(),
      align: z.enum(['left', 'center', 'right']),
      ...id,
    }),
    // Irmão do "Escrever texto pixel" que aceita um VALOR. Nasceu porque o HUD do
    // Reino Zero precisava mostrar pontos, moedas e tempo — que são variáveis — e o
    // bloco de texto só aceita literal, obrigando o placar a usar a fonte proporcional
    // enquanto as telas usavam a de pixel. Duas tipografias no mesmo jogo.
    z.object({
      type: z.literal('g2d:drawPixelScore'),
      ctxVar: irText(),
      label: irText(),
      value: numeric,
      x: numeric,
      y: numeric,
      size: numeric,
      color: irText(),
      ...id,
    }),
    z.object({
      type: z.literal('g2d:showImageScreen'),
      ctxVar: irText(),
      image: irText(),
      ...id,
    }),
    // ⚠️ Enum, e não texto livre: um nome fora do catálogo só vem de código escrito
    // à mão no modo Código, e aceitá-lo faria o bloco nascer com um valor que o
    // `FieldDropdown` coage para a PRIMEIRA opção — trocando a fonte da criança em
    // silêncio. Recusado aqui, o trecho vira "código avançado" e ela vê o que escreveu.
    z.object({
      type: z.literal('g2d:useFont'),
      font: z.enum(GAME_UI_FONT_IDS),
      ...id,
    }),
    z.object({
      type: z.literal('g2d:drawFade'),
      ctxVar: irText(),
      percent: numeric,
      color: irText(),
      ...id,
    }),
  ] as const
}

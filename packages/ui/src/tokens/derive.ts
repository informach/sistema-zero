/**
 * A derivação: id de paleta → os 37 tokens, como hexadecimal.
 *
 * Pura e sem estado, de propósito: o gerador de CSS, o teste de contraste, o `themeColor` da aba
 * do navegador, as caixinhas do seletor e o espelho do Blockly (que não lê custom property
 * nenhuma) chamam esta MESMA função. Uma receita, vários renderizadores — é o que impede o
 * espelho manual de divergir quando entra uma cor nova.
 */
import type { Palette as PaletteId } from '@sistemazero/core/palette'
import { oklchToHex, oklchToOklab } from './color'
import { paletteRecipe } from './palettes'
import {
  ACTION_FAMILY,
  type ActionFamilyToken,
  actionFor,
  actionRelativeFor,
  FIXED_TOKENS,
  NEUTRAL_RECIPE,
  type NeutralToken,
  neutralFor,
  type PaletteToken,
  type TokenName,
} from './recipe'

/** Só os 19 que seguem a cor — é o que cada bloco `[data-sz-palette="…"]` declara. */
export function derivePaletteTokens(id: PaletteId): Record<PaletteToken, string> {
  const recipe = paletteRecipe(id)
  const action = actionFor(recipe.hue, recipe.chromaCap)
  const actionLab = oklchToOklab(action)

  const tokens = { action: oklchToHex(action) } as Record<PaletteToken, string>
  for (const token of Object.keys(NEUTRAL_RECIPE) as NeutralToken[])
    tokens[token] = neutralFor(token, actionLab)
  for (const token of Object.keys(ACTION_FAMILY) as ActionFamilyToken[])
    tokens[token] = actionRelativeFor(token, action)

  for (const [token, value] of Object.entries(recipe.overrides ?? {}))
    tokens[token as PaletteToken] = value

  return tokens
}

/** A paleta inteira: os 19 que seguem a cor mais os 18 que nunca mudam. */
export function derive(id: PaletteId): Record<TokenName, string> {
  return { ...FIXED_TOKENS, ...derivePaletteTokens(id) }
}

/** O que a fórmula geraria SEM os overrides — é contra isto que o teste os confere. */
export function deriveWithoutOverrides(id: PaletteId): Record<PaletteToken, string> {
  const recipe = paletteRecipe(id)
  const action = actionFor(recipe.hue, recipe.chromaCap)
  const actionLab = oklchToOklab(action)

  const tokens = { action: oklchToHex(action) } as Record<PaletteToken, string>
  for (const token of Object.keys(NEUTRAL_RECIPE) as NeutralToken[])
    tokens[token] = neutralFor(token, actionLab)
  for (const token of Object.keys(ACTION_FAMILY) as ActionFamilyToken[])
    tokens[token] = actionRelativeFor(token, action)
  return tokens
}

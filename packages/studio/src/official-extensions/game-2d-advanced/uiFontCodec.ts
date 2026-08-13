/**
 * A escolha da fonte do Jogo 2D Avançado, do bloco ao código e de volta.
 *
 * ⚠️ Mora aqui, e não nas fachadas, porque `parsers/js.ts` e `blockly/buildIR.ts`
 * estão no teto de linhas travado por `generators/__tests__/architecture.test.ts`
 * — a catraca existe justamente para empurrar código de extensão para a extensão.
 * As duas fachadas alcançam este módulo pelo despachante que a gk já tinha
 * (`campaignBlockCodec` / `campaignParserCodec`), sem crescer uma linha.
 */
import type * as Babel from '@babel/types'
import type * as Blockly from 'blockly/core'
import { z } from 'zod'
import type { JSStatement } from '../../ir/schema'
import { GAME_UI_FONT_IDS } from '../gameUiFonts/catalog'

/**
 * A letra de TODO texto do jogo. Quem resolve a escolha é quem MONTA o documento
 * (só a fonte escolhida é embutida), então o runtime apenas confere se foi obedecido.
 */
export type GameKitUiFontStatement = { __id?: string; type: 'gk:useFont'; font: string }

/**
 * O id da fonte é validado contra o catálogo: um nome fora dele viria de código
 * escrito à mão no modo Código, e aceitá-lo faria o bloco nascer com um valor que
 * o `FieldDropdown` coage para a primeira opção — trocando a fonte da criança em
 * silêncio. Recusado aqui, o trecho vira "código avançado" e ela vê o que escreveu.
 */
export function gameKitUiFontStatementSchema(id: { __id: z.ZodOptional<z.ZodString> }) {
  return z.object({
    type: z.literal('gk:useFont'),
    font: z.enum(GAME_UI_FONT_IDS),
    ...id,
  })
}

function isKnownFont(value: string): boolean {
  return (GAME_UI_FONT_IDS as readonly string[]).includes(value)
}

/** Bloco → IR. Devolve `null` quando o bloco não é deste módulo. */
export function gameKitUiFontBlockToIR(
  block: Blockly.Block,
  field: (block: Blockly.Block, name: string) => string,
): JSStatement | null {
  if (block.type !== 'sz_gk_use_font') return null
  const font = field(block, 'FONT')
  return isKnownFont(font) ? ({ type: 'gk:useFont', font } as JSStatement) : null
}

/** Código → IR (a Ponte). Devolve `null` quando a chamada não é deste módulo. */
export function gameKitUiFontCallToIR(
  method: string,
  args: readonly (Babel.Node | null | undefined)[],
): JSStatement | null {
  if (method !== 'useFont') return null
  // generator: SZGameKit.useFont("bungee")
  if (args[0]?.type !== 'StringLiteral') return null
  const font = args[0].value
  return isKnownFont(font) ? ({ type: 'gk:useFont', font } as JSStatement) : null
}

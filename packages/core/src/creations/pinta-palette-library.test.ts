import { describe, expect, test } from 'bun:test'
import {
  classifyPintaPaletteLibraryCreation,
  PINTA_PALETTE_LIBRARY_ITEM_ID,
  PINTA_PALETTE_LIBRARY_KIND,
  PINTA_PALETTE_LIBRARY_TOOL,
} from './pinta-palette-library'

describe('identidade reservada da biblioteca de paletas do Pinta', () => {
  test('só a combinação exata é a biblioteca', () => {
    expect(
      classifyPintaPaletteLibraryCreation({
        tool: PINTA_PALETTE_LIBRARY_TOOL,
        itemId: PINTA_PALETTE_LIBRARY_ITEM_ID,
        kind: PINTA_PALETTE_LIBRARY_KIND,
      }),
    ).toBe('palette-library')
  })

  test('qualquer marcador isolado ou combinação incompleta é inválida', () => {
    expect(
      classifyPintaPaletteLibraryCreation({
        tool: 'pinta',
        itemId: 'desenho-falso',
        kind: PINTA_PALETTE_LIBRARY_KIND,
      }),
    ).toBe('invalid-partial')
    expect(
      classifyPintaPaletteLibraryCreation({
        tool: 'pinta',
        itemId: PINTA_PALETTE_LIBRARY_ITEM_ID,
        kind: 'pixel-sprite',
      }),
    ).toBe('invalid-partial')
    expect(
      classifyPintaPaletteLibraryCreation({
        tool: 'studio',
        itemId: PINTA_PALETTE_LIBRARY_ITEM_ID,
        kind: PINTA_PALETTE_LIBRARY_KIND,
      }),
    ).toBe('invalid-partial')
  })

  test('criação comum sem marcador reservado permanece comum', () => {
    expect(
      classifyPintaPaletteLibraryCreation({
        tool: 'pinta',
        itemId: 'desenho-1',
        kind: 'pixel-sprite',
      }),
    ).toBe('regular')
  })
})

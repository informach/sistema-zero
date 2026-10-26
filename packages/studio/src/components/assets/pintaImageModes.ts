import {
  isPintaImageDataKind,
  type PintaImageRecipe,
  type PintaImageSelectionKind,
  type PintaImageSelectionSummary,
  type PintaImageSheetSize,
} from '@sistemazero/core/studio/pinta-image'

/**
 * WHAT a Python project brings from a Pinta drawing. A pygame project gets, as the default,
 * the whole drawing with its data inside the PNG (the sheet with every animation, every tile,
 * the map with its layers and objects); the single image (one frame, one tile, the flat map)
 * stays as an option. Turtle and Pygame Zero keep exactly the single image they always had.
 */
export type PintaImageMode = PintaImageSelectionKind

type Facts = Exclude<PintaImageSelectionSummary, { kind: 'unavailable' }>

/** The modes offered for these facts, the default first. One mode = no choice to show. */
export function pintaImageModesFor(
  facts: PintaImageSelectionSummary | undefined,
  pygame: boolean,
): PintaImageMode[] {
  if (!facts || facts.kind === 'unavailable') return []
  const sheet = pygame && sheetOf(facts) !== undefined
  switch (facts.kind) {
    case 'frame':
      return sheet ? ['spritesheet', 'frame'] : ['frame']
    case 'tile':
      return sheet ? ['tileset', 'tile'] : ['tile']
    case 'tilemap':
      return sheet ? ['map', 'tilemap'] : ['tilemap']
    case 'background':
      return ['background']
  }
}

function sheetOf(facts: Facts): PintaImageSheetSize | undefined {
  return facts.kind === 'background' ? undefined : facts.sheet
}

/** A material being reviewed keeps its kind when it is still offered; otherwise the default. */
export function initialPintaImageMode(
  modes: readonly PintaImageMode[],
  reviewing?: Pick<PintaImageRecipe, 'selection'>,
): PintaImageMode | undefined {
  const kept = reviewing?.selection.kind
  return kept && modes.includes(kept) ? kept : modes[0]
}

/**
 * The gallery convention for pygame: pixel art is drawn small (32 px) and played at twice the
 * size (64 px), crisp. A material being reviewed keeps its scale; everything else starts at 1.
 */
export function defaultPintaImageScale(
  facts: PintaImageSelectionSummary | undefined,
  pygame: boolean,
  reviewing?: Pick<PintaImageRecipe, 'scale'>,
): number {
  if (reviewing) return reviewing.scale
  if (pygame && facts && facts.kind !== 'unavailable' && facts.vector !== true) return 2
  return 1
}

/** Source-pixel size of what this mode exports (before the scale). */
export function pintaImageModeSize(
  facts: PintaImageSelectionSummary | undefined,
  mode: PintaImageMode | undefined,
): PintaImageSheetSize | null {
  if (!facts || facts.kind === 'unavailable' || !mode) return null
  if (isPintaImageDataKind(mode)) return sheetOf(facts) ?? null
  return { width: facts.width, height: facts.height }
}

/** The recipe selection for a mode (positions only matter for one frame/one tile). */
export function pintaImageModeSelection(
  mode: PintaImageMode,
  position: { animationId: string; index: number },
): PintaImageRecipe['selection'] {
  switch (mode) {
    case 'frame':
      return { kind: 'frame', animationId: position.animationId, frameIndex: position.index }
    case 'tile':
      return { kind: 'tile', tileIndex: position.index }
    default:
      return { kind: mode }
  }
}

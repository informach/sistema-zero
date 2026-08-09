import type { BlockDefinition } from '../../blockly/blocks/types'
import { createProgrammingFamilyAdapters, type ProgrammingCodecAdapters } from './adapters'

export type ProgrammingBlockFamily =
  | 'language-control'
  | 'dom-events'
  | 'values-math'
  | 'functions'
  | 'objects-classes'

export type ProgrammingBlockCompatibility = 'public' | 'legacy-hidden'

/** Registro de inventário; a matriz ponta a ponta valida os adapters reais. */
export interface ProgrammingBlockRegistration {
  readonly blockType: string
  readonly family: ProgrammingBlockFamily
  readonly definition: BlockDefinition
  readonly compatibility: ProgrammingBlockCompatibility
  readonly adapters: ProgrammingCodecAdapters
}

export function registrationsForDefinitions(
  family: ProgrammingBlockFamily,
  definitions: readonly BlockDefinition[],
): ProgrammingBlockRegistration[] {
  const adapters = createProgrammingFamilyAdapters(definitions.map((definition) => definition.type))
  return definitions.map((definition) => ({
    blockType: definition.type,
    family,
    definition,
    compatibility: definition.hidden ? 'legacy-hidden' : 'public',
    adapters,
  }))
}

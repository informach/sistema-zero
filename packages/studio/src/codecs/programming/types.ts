import type { BlockDefinition } from '../../blockly/blocks/types'

export type ProgrammingCodecFamily =
  | 'language-control'
  | 'dom-events'
  | 'values-math'
  | 'functions'
  | 'objects-classes'

export type ProgrammingCodecDirection = 'block-to-ir' | 'ir-to-block' | 'ir-to-code' | 'code-to-ir'

export type ProgrammingCodecCompatibility = 'public' | 'legacy-hidden'

/** Contrato operacional que cada bloco da categoria precisa cumprir. */
export interface ProgrammingBlockCodec {
  readonly blockType: string
  readonly family: ProgrammingCodecFamily
  readonly definition: BlockDefinition
  readonly directions: readonly ProgrammingCodecDirection[]
  readonly compatibility: ProgrammingCodecCompatibility
}

export const ALL_PROGRAMMING_CODEC_DIRECTIONS = Object.freeze<ProgrammingCodecDirection[]>([
  'block-to-ir',
  'ir-to-block',
  'ir-to-code',
  'code-to-ir',
])

export function codecsForDefinitions(
  family: ProgrammingCodecFamily,
  definitions: readonly BlockDefinition[],
): ProgrammingBlockCodec[] {
  return definitions.map((definition) => ({
    blockType: definition.type,
    family,
    definition,
    directions: ALL_PROGRAMMING_CODEC_DIRECTIONS,
    compatibility: definition.hidden ? 'legacy-hidden' : 'public',
  }))
}

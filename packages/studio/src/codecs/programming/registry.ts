import {
  PROGRAMMING_COMPATIBILITY_DEFINITIONS,
  PROGRAMMING_VISIBLE_DEFINITIONS,
} from '../../blockly/programmingContract'
import { DOM_EVENT_CODECS } from './domEvents'
import { FUNCTION_CODECS } from './functions'
import { LANGUAGE_CONTROL_CODECS } from './languageControl'
import { OBJECTS_CLASSES_CODECS } from './objectsClasses'
import {
  ALL_PROGRAMMING_CODEC_DIRECTIONS,
  type ProgrammingBlockCodec,
  type ProgrammingCodecDirection,
} from './types'
import { VALUES_MATH_CODECS } from './valuesMath'

export function createProgrammingCodecRegistry(
  codecs: readonly ProgrammingBlockCodec[],
): readonly ProgrammingBlockCodec[] {
  const seen = new Set<string>()
  const requiredDirections = new Set(ALL_PROGRAMMING_CODEC_DIRECTIONS)
  const frozen = codecs.map((codec) => {
    if (seen.has(codec.blockType)) {
      throw new Error(`Codec de Programação duplicado para o bloco ${codec.blockType}.`)
    }
    const directions = new Set(codec.directions)
    if (directions.size !== codec.directions.length) {
      throw new Error(`Codec de Programação com direção duplicada para ${codec.blockType}.`)
    }
    if ([...requiredDirections].some((direction) => !directions.has(direction))) {
      throw new Error(`Codec de Programação incompleto para o bloco ${codec.blockType}.`)
    }
    const expectedCompatibility = codec.definition.hidden ? 'legacy-hidden' : 'public'
    if (codec.compatibility !== expectedCompatibility) {
      throw new Error(`Compatibilidade divergente para o bloco ${codec.blockType}.`)
    }
    if (codec.definition.type !== codec.blockType) {
      throw new Error(`Definição divergente para o bloco ${codec.blockType}.`)
    }
    seen.add(codec.blockType)
    return Object.freeze({ ...codec, directions: Object.freeze([...codec.directions]) })
  })
  return Object.freeze(frozen)
}

export const PROGRAMMING_BLOCK_CODECS = createProgrammingCodecRegistry([
  ...DOM_EVENT_CODECS,
  ...LANGUAGE_CONTROL_CODECS,
  ...VALUES_MATH_CODECS,
  ...FUNCTION_CODECS,
  ...OBJECTS_CLASSES_CODECS,
])

const expectedDefinitions = [
  ...PROGRAMMING_VISIBLE_DEFINITIONS,
  ...PROGRAMMING_COMPATIBILITY_DEFINITIONS,
]
const registeredTypes = new Set(PROGRAMMING_BLOCK_CODECS.map((codec) => codec.blockType))
const missingTypes = expectedDefinitions
  .map((definition) => definition.type)
  .filter((type) => !registeredTypes.has(type))
if (missingTypes.length > 0 || registeredTypes.size !== expectedDefinitions.length) {
  throw new Error(
    `Registry de Programação diverge do catálogo: ausentes ${missingTypes.join(', ') || 'nenhum'}.`,
  )
}

const PROGRAMMING_CODEC_BY_BLOCK_TYPE = new Map(
  PROGRAMMING_BLOCK_CODECS.map((codec) => [codec.blockType, codec] as const),
)

export function programmingCodecForBlockType(blockType: string): ProgrammingBlockCodec | undefined {
  return PROGRAMMING_CODEC_BY_BLOCK_TYPE.get(blockType)
}

export function programmingCodecSupports(
  codec: ProgrammingBlockCodec,
  direction: ProgrammingCodecDirection,
): boolean {
  return codec.directions.includes(direction)
}

import {
  PROGRAMMING_COMPATIBILITY_DEFINITIONS,
  PROGRAMMING_VISIBLE_DEFINITIONS,
} from '../../blockly/programmingContract'
import { DOM_EVENT_REGISTRATIONS } from './domEvents'
import { FUNCTION_REGISTRATIONS } from './functions'
import { LANGUAGE_CONTROL_REGISTRATIONS } from './languageControl'
import { OBJECTS_CLASSES_REGISTRATIONS } from './objectsClasses'
import type { ProgrammingBlockRegistration } from './types'
import { VALUES_MATH_REGISTRATIONS } from './valuesMath'

export function createProgrammingBlockRegistry(
  registrations: readonly ProgrammingBlockRegistration[],
): readonly ProgrammingBlockRegistration[] {
  const seen = new Set<string>()
  const frozen = registrations.map((registration) => {
    if (seen.has(registration.blockType)) {
      throw new Error(`Registro de Programação duplicado para o bloco ${registration.blockType}.`)
    }
    const expectedCompatibility = registration.definition.hidden ? 'legacy-hidden' : 'public'
    if (registration.compatibility !== expectedCompatibility) {
      throw new Error(`Compatibilidade divergente para o bloco ${registration.blockType}.`)
    }
    if (registration.definition.type !== registration.blockType) {
      throw new Error(`Definição divergente para o bloco ${registration.blockType}.`)
    }
    seen.add(registration.blockType)
    return Object.freeze({ ...registration })
  })
  return Object.freeze(frozen)
}

export const PROGRAMMING_BLOCK_REGISTRATIONS = createProgrammingBlockRegistry([
  ...DOM_EVENT_REGISTRATIONS,
  ...LANGUAGE_CONTROL_REGISTRATIONS,
  ...VALUES_MATH_REGISTRATIONS,
  ...FUNCTION_REGISTRATIONS,
  ...OBJECTS_CLASSES_REGISTRATIONS,
])

const expectedDefinitions = [
  ...PROGRAMMING_VISIBLE_DEFINITIONS,
  ...PROGRAMMING_COMPATIBILITY_DEFINITIONS,
]
const registeredTypes = new Set(
  PROGRAMMING_BLOCK_REGISTRATIONS.map((registration) => registration.blockType),
)
const missingTypes = expectedDefinitions
  .map((definition) => definition.type)
  .filter((type) => !registeredTypes.has(type))
if (missingTypes.length > 0 || registeredTypes.size !== expectedDefinitions.length) {
  throw new Error(
    `Registry de Programação diverge do catálogo: ausentes ${missingTypes.join(', ') || 'nenhum'}.`,
  )
}

const PROGRAMMING_REGISTRATION_BY_BLOCK_TYPE = new Map(
  PROGRAMMING_BLOCK_REGISTRATIONS.map(
    (registration) => [registration.blockType, registration] as const,
  ),
)

export function programmingRegistrationForBlockType(
  blockType: string,
): ProgrammingBlockRegistration | undefined {
  return PROGRAMMING_REGISTRATION_BY_BLOCK_TYPE.get(blockType)
}

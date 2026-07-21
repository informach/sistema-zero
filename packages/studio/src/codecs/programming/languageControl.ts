import {
  PROGRAMMING_CATALOG_GROUPS,
  PROGRAMMING_COMPATIBILITY_DEFINITIONS,
} from '../../blockly/programmingContract'
import { registrationsForDefinitions } from './types'

const LANGUAGE_KEYS = new Set(['language'])
const LEGACY_LANGUAGE_TYPES = new Set(['sz_js_expr_statement'])

export const LANGUAGE_CONTROL_REGISTRATIONS = registrationsForDefinitions('language-control', [
  ...PROGRAMMING_CATALOG_GROUPS.filter((group) => LANGUAGE_KEYS.has(group.key)).flatMap((group) =>
    group.definitions.filter((definition) => !definition.hidden),
  ),
  ...PROGRAMMING_COMPATIBILITY_DEFINITIONS.filter((definition) =>
    LEGACY_LANGUAGE_TYPES.has(definition.type),
  ),
])

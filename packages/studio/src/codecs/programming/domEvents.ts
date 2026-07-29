import {
  PROGRAMMING_CATALOG_GROUPS,
  PROGRAMMING_COMPATIBILITY_DEFINITIONS,
} from '../../blockly/programmingContract'
import { registrationsForDefinitions } from './types'

const DOM_EVENT_KEYS = new Set(['page-events'])
const LEGACY_DOM_EVENT_TYPES = new Set(['sz_js_on_load', 'sz_js_set_text'])

export const DOM_EVENT_REGISTRATIONS = registrationsForDefinitions('dom-events', [
  ...PROGRAMMING_CATALOG_GROUPS.filter((group) => DOM_EVENT_KEYS.has(group.key)).flatMap((group) =>
    group.definitions.filter((definition) => !definition.hidden),
  ),
  ...PROGRAMMING_COMPATIBILITY_DEFINITIONS.filter((definition) =>
    LEGACY_DOM_EVENT_TYPES.has(definition.type),
  ),
])

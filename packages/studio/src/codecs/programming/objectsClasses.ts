import {
  PROGRAMMING_CATALOG_GROUPS,
  PROGRAMMING_COMPATIBILITY_DEFINITIONS,
} from '../../blockly/programmingContract'
import { codecsForDefinitions } from './types'

const OBJECT_CLASS_KEYS = new Set(['objects', 'classes'])
const LEGACY_OBJECT_CLASS_TYPES = new Set([
  'sz_js_call_method',
  'sz_val_call_method',
  'sz_js_set_prop',
  'sz_val_get_prop',
])

export const OBJECTS_CLASSES_CODECS = codecsForDefinitions('objects-classes', [
  ...PROGRAMMING_CATALOG_GROUPS.filter((group) => OBJECT_CLASS_KEYS.has(group.key)).flatMap(
    (group) => group.definitions.filter((definition) => !definition.hidden),
  ),
  ...PROGRAMMING_COMPATIBILITY_DEFINITIONS.filter((definition) =>
    LEGACY_OBJECT_CLASS_TYPES.has(definition.type),
  ),
])

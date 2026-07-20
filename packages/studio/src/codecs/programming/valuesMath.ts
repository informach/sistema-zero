import { PROGRAMMING_CATALOG_GROUPS } from '../../blockly/programmingContract'
import { codecsForDefinitions } from './types'

const VALUE_MATH_KEYS = new Set(['values', 'math'])

export const VALUES_MATH_CODECS = codecsForDefinitions(
  'values-math',
  PROGRAMMING_CATALOG_GROUPS.filter((group) => VALUE_MATH_KEYS.has(group.key)).flatMap((group) =>
    group.definitions.filter((definition) => !definition.hidden),
  ),
)

import { PROGRAMMING_CATALOG_GROUPS } from '../../blockly/programmingContract'
import { codecsForDefinitions } from './types'

export const FUNCTION_CODECS = codecsForDefinitions(
  'functions',
  PROGRAMMING_CATALOG_GROUPS.filter((group) => group.key === 'functions').flatMap((group) =>
    group.definitions.filter((definition) => !definition.hidden),
  ),
)

import { PROGRAMMING_CATALOG_GROUPS } from '../../blockly/programmingContract'
import { registrationsForDefinitions } from './types'

export const FUNCTION_REGISTRATIONS = registrationsForDefinitions(
  'functions',
  PROGRAMMING_CATALOG_GROUPS.filter((group) => group.key === 'functions').flatMap((group) =>
    group.definitions.filter((definition) => !definition.hidden),
  ),
)

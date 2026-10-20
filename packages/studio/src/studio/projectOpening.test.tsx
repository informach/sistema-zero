import { test } from 'bun:test'
import { ISOLATED_STUDIO_CASE_TIMEOUT_MS, runIsolatedStudioCases } from '../__tests__/isolatedCases'

test(
  'project opening lifecycle owns an isolated module realm',
  () => runIsolatedStudioCases('./src/studio/__tests__/projectOpening.cases.tsx'),
  ISOLATED_STUDIO_CASE_TIMEOUT_MS,
)

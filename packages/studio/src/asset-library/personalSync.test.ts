import { test } from 'bun:test'
import { ISOLATED_STUDIO_CASE_TIMEOUT_MS, runIsolatedStudioCases } from '../__tests__/isolatedCases'

test(
  'personalSync.test.ts mock cases own an isolated module realm',
  () => runIsolatedStudioCases('./src/asset-library/__tests__/personalSync.cases.ts'),
  ISOLATED_STUDIO_CASE_TIMEOUT_MS,
)

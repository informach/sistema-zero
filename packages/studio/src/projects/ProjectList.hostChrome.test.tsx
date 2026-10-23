import { test } from 'bun:test'
import { ISOLATED_STUDIO_CASE_TIMEOUT_MS, runIsolatedStudioCases } from '../__tests__/isolatedCases'

test(
  'ProjectList.hostChrome.test.tsx mock cases own an isolated module realm',
  () => runIsolatedStudioCases('./src/projects/__tests__/ProjectList.hostChrome.cases.tsx'),
  ISOLATED_STUDIO_CASE_TIMEOUT_MS,
)

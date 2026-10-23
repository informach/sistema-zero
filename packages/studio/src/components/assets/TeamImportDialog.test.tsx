import { test } from 'bun:test'
import {
  ISOLATED_STUDIO_CASE_TIMEOUT_MS,
  runIsolatedStudioCases,
} from '../../__tests__/isolatedCases'

test(
  'TeamImportDialog.test.tsx mock cases own an isolated module realm',
  () => runIsolatedStudioCases('./src/components/assets/__tests__/TeamImportDialog.cases.tsx'),
  ISOLATED_STUDIO_CASE_TIMEOUT_MS,
)

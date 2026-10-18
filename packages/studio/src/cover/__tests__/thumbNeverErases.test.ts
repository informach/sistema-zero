import { test } from 'bun:test'
import {
  ISOLATED_STUDIO_CASE_TIMEOUT_MS,
  runIsolatedStudioCases,
} from '../../__tests__/isolatedCases'

test(
  'thumbNeverErases.test.ts mock cases own an isolated module realm',
  () => runIsolatedStudioCases('./src/cover/__tests__/thumbNeverErases.cases.ts'),
  ISOLATED_STUDIO_CASE_TIMEOUT_MS,
)

import { expect, test } from 'bun:test'
import { CENARIOS_LOTE_MAX_BYTES } from '../../packages/api-gateway/src/infrastructure/config/cenarios-routes'
import { loadEnv } from '../../packages/api-gateway/src/infrastructure/config/env'
import { SECTION_PYTHON_PROJECT_TEST_BODY_BYTES } from '../../packages/core/src/learning/python-project-checks'
import { serviceEnv } from './lib'

test('the isolated stack uses the canonical gateway envelope for its configured routes', () => {
  const env = loadEnv(
    serviceEnv('gateway', {
      PG_PASSWORD: 'disposable-test',
      JWT_HS256_SECRET: 'test-jwt-'.repeat(6),
      GATEWAY_HMAC_SECRET: 'test-hmac-'.repeat(6),
    }),
  )
  expect(env.MAX_REQUEST_BODY_BYTES).toBeGreaterThanOrEqual(CENARIOS_LOTE_MAX_BYTES)
  expect(env.MAX_REQUEST_BODY_BYTES).toBeGreaterThanOrEqual(SECTION_PYTHON_PROJECT_TEST_BODY_BYTES)
})

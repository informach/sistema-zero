import { mock } from 'bun:test'

mock.module('server-only', () => ({}))
const { getEnv } = await import('../../src/lib/env')
try {
  const env = getEnv()
  process.stdout.write(
    JSON.stringify({
      ok: true,
      configured: Boolean(env.STUDIO_PYTHON_LANGUAGE_URL && env.STUDIO_PYTHON_LANGUAGE_TOKEN),
    }),
  )
} catch (error) {
  process.stdout.write(
    JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown' }),
  )
}

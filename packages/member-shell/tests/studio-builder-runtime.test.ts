import { expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))
const { EnvSchema } = await import('../src/lib/env')
const { studioBuilderRuntimeAvailable, studioBuilderRuntimeOptions } = await import(
  '../src/server/studio-builder-runtime'
)
const environment = {
  JWT_HS256_SECRET: 'private-test-auth-secret-with-32-chars',
  STUDIO_PRO_RUNTIME_URL: 'https://javascript.test',
  STUDIO_PRO_RUNTIME_TOKEN: 'javascript-private-token',
  STUDIO_PYTHON_RUNTIME_URL: 'https://python.test',
  STUDIO_PYTHON_RUNTIME_TOKEN: 'python-private-token-with-32-characters',
  STUDIO_PYTHON_LANGUAGE_URL: 'https://language.test',
  STUDIO_PYTHON_LANGUAGE_TOKEN: 'language-private-token-with-32-characters',
}

test('each language requires its own complete provider without disabling the other', () => {
  const complete = studioBuilderRuntimeOptions(EnvSchema.parse(environment))
  expect(studioBuilderRuntimeAvailable(complete, 'javascript')).toBe(true)
  expect(studioBuilderRuntimeAvailable(complete, 'python')).toBe(true)
  for (const key of [
    'STUDIO_PYTHON_RUNTIME_URL',
    'STUDIO_PYTHON_RUNTIME_TOKEN',
    'STUDIO_PYTHON_LANGUAGE_URL',
    'STUDIO_PYTHON_LANGUAGE_TOKEN',
  ]) {
    const partial = studioBuilderRuntimeOptions(
      EnvSchema.parse({ ...environment, [key]: undefined }),
    )
    expect(studioBuilderRuntimeAvailable(partial, 'javascript')).toBe(true)
    expect(studioBuilderRuntimeAvailable(partial, 'python')).toBe(false)
  }
  const pythonOnly = studioBuilderRuntimeOptions(
    EnvSchema.parse({
      ...environment,
      STUDIO_PRO_RUNTIME_URL: undefined,
      STUDIO_PRO_RUNTIME_TOKEN: undefined,
    }),
  )
  expect(studioBuilderRuntimeAvailable(pythonOnly, 'python')).toBe(true)
  expect(studioBuilderRuntimeAvailable(pythonOnly, 'javascript')).toBe(false)
})

test.each([
  'https://user:password@python.test',
  'https://python.test?token=private',
  'https://python.test#fragment',
  'http://remote.test',
  'file:///tmp',
])('Python provider rejects unsafe endpoint %s before dispatch', (url) => {
  for (const key of ['STUDIO_PYTHON_RUNTIME_URL', 'STUDIO_PYTHON_LANGUAGE_URL']) {
    const options = studioBuilderRuntimeOptions(EnvSchema.parse({ ...environment, [key]: url }))
    expect(studioBuilderRuntimeAvailable(options, 'python')).toBe(false)
    expect(studioBuilderRuntimeAvailable(options, 'javascript')).toBe(true)
  }
})

test('loopback HTTP is explicit development behavior and forbidden in production', () => {
  const development = EnvSchema.parse({
    ...environment,
    STUDIO_PYTHON_RUNTIME_URL: 'http://127.0.0.1:8010',
  })
  expect(studioBuilderRuntimeAvailable(studioBuilderRuntimeOptions(development), 'python')).toBe(
    true,
  )
  const production = EnvSchema.parse({
    ...environment,
    STUDIO_PYTHON_RUNTIME_URL: 'http://127.0.0.1:8010',
    NODE_ENV: 'production',
    JWT_HS256_SECRET: undefined,
    JWT_JWKS_URL: 'https://auth.test/jwks',
    MEMBER_SHELL_HMAC_SECRET: 'private-hmac-secret-with-32-characters',
  })
  expect(studioBuilderRuntimeAvailable(studioBuilderRuntimeOptions(production), 'python')).toBe(
    false,
  )
})

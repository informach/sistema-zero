import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

async function run(mode: string, phase: string, environment = 'production') {
  const child = Bun.spawn(
    [
      process.execPath,
      fileURLToPath(
        new URL('../../packages/members/scripts/production-schema-a.ts', import.meta.url),
      ),
    ],
    {
      env: {
        ...process.env,
        RAILWAY_PROJECT_ID: '415d5a1c-5f75-432c-8445-b395d0977ce3',
        RAILWAY_ENVIRONMENT_NAME: environment,
        RELEASE_MAINTENANCE_MODE: mode,
        RELEASE_SCHEMA_STAGE: phase,
        DATABASE_URL: 'not-a-database',
      },
      stdout: 'pipe',
      stderr: 'pipe',
    },
  )
  const [code, output, error] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  return { code, output, error }
}

test('reopening A never runs migrations, including after a held or applied stage', async () => {
  for (const phase of ['hold', 'apply', '', 'invalid']) {
    const result = await run('off', phase)
    expect(result.code).toBe(0)
    expect(result.output).toContain('no migrations')
  }
})

test('installing the barrier holds migrations and rejects unknown stages or destinations', async () => {
  expect((await run('full', 'hold')).code).toBe(0)
  expect((await run('full', 'invalid')).code).not.toBe(0)
  expect((await run('invalid', 'hold')).code).not.toBe(0)
  expect((await run('off', 'hold', 'staging')).code).not.toBe(0)
})

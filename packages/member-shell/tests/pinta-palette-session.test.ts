import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

const accountId = '11111111-1111-4111-8111-111111111111'
const childId = '22222222-2222-4222-8222-222222222222'
test.each([
  ['0', 'qa-bucket'],
  ['1', 'qa-bucket'],
  ['1', ''],
])('RSC de paletas com candidato %s e storage %s', async (flag, bucket) => {
  const result = Bun.spawn(
    [
      process.execPath,
      '--no-env-file',
      'test',
      resolve(import.meta.dirname, 'fixtures/pinta-palette-session.fixture.ts'),
    ],
    {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        JWT_HS256_SECRET: 'synthetic-test-secret',
        MEMBER_SHELL_HMAC_SECRET: 'synthetic-test-secret',
        PINTA_PALETTE_WRITE_CANDIDATE: flag,
        PINTA_CAUSAL_CANDIDATE: '0',
        PINTA_CAUSAL_QA_PROFILES: JSON.stringify([
          { userId: accountId, accountId, audience: 'adult' },
          { userId: childId, accountId, audience: 'kids' },
        ]),
        R2_ACCOUNT_ID: 'test',
        R2_ACCESS_KEY_ID: 'test',
        R2_SECRET_ACCESS_KEY: 'test',
        R2_UGC_BUCKET: bucket,
      },
      stdout: 'pipe',
      stderr: 'pipe',
      windowsHide: true,
    },
  )
  const [code, stdout, stderr] = await Promise.all([
    result.exited,
    new Response(result.stdout).text(),
    new Response(result.stderr).text(),
  ])
  expect(code, stdout + stderr).toBe(0)
  expect(stdout + stderr).toMatch(/\b9 expect\(\) calls/)
})

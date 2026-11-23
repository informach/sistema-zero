import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

// Sem flag nem lista de perfis (23/11/2026): o escopo da conta do Pinta depende só da sessão e da
// infraestrutura do BFF (HMAC + R2 privado). As variáveis antigas, se ainda existirem no ambiente,
// não mudam nada.
test.each([
  ['qa-bucket', {}],
  ['', {}],
  [
    'qa-bucket',
    {
      PINTA_CAUSAL_CANDIDATE: '0',
      PINTA_PALETTE_WRITE_CANDIDATE: '0',
      PINTA_CAUSAL_QA_PROFILES: '[]',
      NEXT_PUBLIC_PINTA_CAUSAL_CLIENT_V1: '0',
    },
  ],
] as const)('RSC da conta do Pinta com storage %p e ambiente antigo %p', async (bucket, legacy) => {
  const result = Bun.spawn(
    [
      process.execPath,
      '--no-env-file',
      'test',
      resolve(import.meta.dirname, 'fixtures/pinta-account-session.fixture.ts'),
    ],
    {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        JWT_HS256_SECRET: 'synthetic-test-secret',
        MEMBER_SHELL_HMAC_SECRET: 'synthetic-test-secret',
        R2_ACCOUNT_ID: 'test',
        R2_ACCESS_KEY_ID: 'test',
        R2_SECRET_ACCESS_KEY: 'test',
        R2_UGC_BUCKET: bucket,
        ...legacy,
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
  expect(stdout + stderr).toMatch(/\b10 expect\(\) calls/)
})

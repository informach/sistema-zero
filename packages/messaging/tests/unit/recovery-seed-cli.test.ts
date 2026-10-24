import { expect, test } from 'bun:test'

test.each([
  {
    environment: 'production',
    databaseUrl: 'postgres://qa:private-placeholder@127.0.0.1:1/qa_test',
    code: 'RAILWAY_SCOPE',
  },
  {
    environment: 'local',
    databaseUrl: 'postgres://qa:private-placeholder@example.invalid/qa_test',
    code: 'LOCAL_SCOPE',
  },
])('seed $environment recusa escopo incorreto antes de acessar o banco, sem imprimir credenciais', async ({
  environment,
  databaseUrl,
  code,
}) => {
  const child = Bun.spawn(
    [
      process.execPath,
      '--no-env-file',
      `${import.meta.dir}/../../scripts/seed-subscription-recovery.ts`,
      '--environment',
      environment,
      '--apply',
      '--retire-legacy',
    ],
    {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        RAILWAY_PROJECT_ID: '415d5a1c-5f75-432c-8445-b395d0977ce3',
        RAILWAY_ENVIRONMENT_ID: 'wrong-environment',
      },
      stdout: 'pipe',
      stderr: 'pipe',
    },
  )
  const [exit, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  expect(exit).toBe(1)
  expect(stdout).toBe('')
  expect(JSON.parse(stderr).error).toBe(code)
  expect(stderr).not.toContain('private-placeholder')
})

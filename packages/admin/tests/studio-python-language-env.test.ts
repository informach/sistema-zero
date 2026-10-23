import { expect, it } from 'bun:test'
import { resolve } from 'node:path'

it('keeps Python analysis optional, validates the private pair and rejects short tokens', () => {
  for (const [url, token, expected] of [
    [undefined, undefined, { ok: true, configured: false }],
    ['https://language.example.test', 'a'.repeat(32), { ok: true, configured: true }],
    ['https://language.example.test', undefined, { ok: false }],
    [undefined, 'a'.repeat(32), { ok: false }],
    ['https://language.example.test', 'short', { ok: false }],
  ] satisfies [string | undefined, string | undefined, { ok: boolean; configured?: boolean }][]) {
    const result = Bun.spawnSync(
      [process.execPath, resolve(import.meta.dirname, 'fixtures/python-language-env.fixture.ts')],
      {
        env: {
          ...process.env,
          NODE_ENV: 'test',
          JWT_HS256_SECRET: 'only-for-the-local-schema-test',
          STUDIO_PRO_RUNTIME_URL: undefined,
          STUDIO_PRO_RUNTIME_TOKEN: undefined,
          STUDIO_PYTHON_LANGUAGE_URL: url,
          STUDIO_PYTHON_LANGUAGE_TOKEN: token,
        },
        stdout: 'pipe',
        stderr: 'pipe',
      },
    )
    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout.toString())).toMatchObject(expected)
  }
})

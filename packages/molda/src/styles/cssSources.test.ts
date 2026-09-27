import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

test('Molda CSS scans production UI only and both consumers inherit the same source contract', () => {
  const result = Bun.spawnSync(
    [process.execPath, resolve(import.meta.dir, '../../scripts/check-css-sources.mjs'), 'verify'],
    { cwd: resolve(import.meta.dir, '../..'), stdout: 'pipe', stderr: 'pipe' },
  )
  expect(new TextDecoder().decode(result.stderr)).toBe('')
  expect(result.exitCode).toBe(0)
  const report: unknown = JSON.parse(new TextDecoder().decode(result.stdout))
  expect(report).toMatchObject({ status: 'verified', nonProductionFileCount: 0 })
}, 30_000)

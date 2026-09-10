import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

test('publicação confirma Vimeo e sincroniza somente conteúdo publicado', () => {
  // Each process owns its gateway/media/Next mocks, including on Linux.
  const result = Bun.spawnSync(
    [process.execPath, 'test', './tests/fixtures/lesson-publication.fixture.ts'],
    { cwd: resolve(import.meta.dir, '..'), stdout: 'pipe', stderr: 'pipe' },
  )
  expect(result.exitCode, new TextDecoder().decode(result.stderr)).toBe(0)
  expect(new TextDecoder().decode(result.stderr)).toContain('5 pass')
}, 10000)

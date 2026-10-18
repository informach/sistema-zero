import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

test('submission viewer scenarios keep their editor doubles outside the authoring test process', async () => {
  // Bun module mocks are process-wide. The viewer doubles must not replace the real
  // StudioEmbed used by Python authoring, regardless of test discovery order.
  const child = Bun.spawn(
    [process.execPath, 'test', './tests/fixtures/studio-submission-viewer.fixture.tsx'],
    { cwd: resolve(import.meta.dir, '..'), stdout: 'pipe', stderr: 'pipe' },
  )
  const [output, errors, status] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  expect(status, output + errors).toBe(0)
  expect(errors).toContain('3 pass')
}, 30_000)

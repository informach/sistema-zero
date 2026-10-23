import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

test('preview revision scenarios keep their editor double outside the authoring test process', async () => {
  // Bun's module mocks also affect cached consumers. Restoring the export after this
  // fixture cannot retire its StudioEmbed double from SectionProjectExamples.
  const child = Bun.spawn(
    [
      process.execPath,
      '--no-env-file',
      'test',
      './tests/fixtures/studio-preview-revision.fixture.tsx',
    ],
    { cwd: resolve(import.meta.dir, '..'), stdout: 'pipe', stderr: 'pipe' },
  )
  const [output, errors, status] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  expect(status, output + errors).toBe(0)
  expect(errors).toContain('2 pass')
}, 30_000)

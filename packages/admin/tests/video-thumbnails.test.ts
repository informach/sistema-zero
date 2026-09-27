import { expect, test } from 'bun:test'
import { thumbnailFileError } from '../src/lib/video-thumbnails'

test('cover selection checks file format, emptiness and upload limit before sending', () => {
  expect(thumbnailFileError({ type: 'image/png', size: 1024 })).toBeNull()
  expect(thumbnailFileError({ type: 'image/svg+xml', size: 1024 })).toContain('JPG ou PNG')
  expect(thumbnailFileError({ type: 'image/png', size: 0 })).toContain('vazia')
  expect(thumbnailFileError({ type: 'image/jpeg', size: 6 * 1024 * 1024 })).toContain('5 MB')
})
test('thumbnail routes and provider adapter preserve authorization and cover selection contracts', async () => {
  const proc = Bun.spawn(
    [process.execPath, 'test', './tests/fixtures/video-thumbnails.fixture.ts'],
    { cwd: `${import.meta.dir}/..`, stdout: 'pipe', stderr: 'pipe' },
  )
  const [code, stdout, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  if (code !== 0) throw new Error(`${stdout}\n${stderr}`)
  expect(code).toBe(0)
})

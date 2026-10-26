import { expect, test } from 'bun:test'

test('mastery submissions preserve reviewed evidence in an isolated browser environment', async () => {
  // Registering happy-dom in the BFF suite replaces Request/Headers and invalidates
  // the native HTTP boundary tests. Keep the real DOM in its own process.
  const nativeRequest = globalThis.Request
  const nativeHeaders = globalThis.Headers
  const nativeFetch = globalThis.fetch
  const child = Bun.spawn([process.execPath, 'test', './qa/mastery-submission.fixture.tsx'], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [output, errors, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  expect(code, output + errors).toBe(0)
  expect(globalThis.Request).toBe(nativeRequest)
  expect(globalThis.Headers).toBe(nativeHeaders)
  expect(globalThis.fetch).toBe(nativeFetch)
}, 30000)

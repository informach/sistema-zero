import { expect, test } from 'bun:test'
import {
  assertJavaScriptCreationOptions,
  authorizeJavaScriptCreation,
} from '../src/lib/studio-javascript-creation'

const options = {
  legacyJavaScript: true,
  catalog: null,
  canCreateJavaScript: true,
  canCreatePython: false,
  canCreatePro: false,
  pythonGrantedExtensionIds: [],
  pythonCuration: { pythonLevel: 1, allowedModes: ['blocks'], allowLevelReveal: false },
}

test('JavaScript creation requires its explicit fresh right; Pro also requires Pro capability', () => {
  expect(() => assertJavaScriptCreationOptions(options, 'classic')).not.toThrow()
  expect(() => assertJavaScriptCreationOptions(options, 'pro')).toThrow()
  expect(() =>
    assertJavaScriptCreationOptions({ ...options, canCreatePro: true }, 'pro'),
  ).not.toThrow()
  for (const kind of ['classic', 'pro'] as const)
    expect(() =>
      assertJavaScriptCreationOptions(
        { ...options, canCreateJavaScript: false, canCreatePython: true, canCreatePro: true },
        kind,
      ),
    ).toThrow()
  const { canCreateJavaScript: _missing, ...incomplete } = options
  expect(() => assertJavaScriptCreationOptions(incomplete, 'classic')).toThrow()
})

test('each creation reads uncached server options and honors revocation and cancellation', async () => {
  const original = globalThis.fetch
  const requests: Array<{ url: string; cache?: RequestCache }> = []
  let granted = true
  globalThis.fetch = (async (input, init) => {
    requests.push({ url: String(input), cache: init?.cache })
    return Response.json({ ...options, canCreateJavaScript: granted })
  }) as typeof fetch
  try {
    await authorizeJavaScriptCreation('classic')
    granted = false
    await expect(authorizeJavaScriptCreation('classic')).rejects.toThrow()
    expect(requests).toEqual([
      { url: '/api/studio/free-options', cache: 'no-store' },
      { url: '/api/studio/free-options', cache: 'no-store' },
    ])
    const controller = new AbortController()
    controller.abort()
    await expect(authorizeJavaScriptCreation('classic', controller.signal)).rejects.toThrow()
    expect(requests).toHaveLength(2)
  } finally {
    globalThis.fetch = original
  }
})

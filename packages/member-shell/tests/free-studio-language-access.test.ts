import { expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))
const { assertFreeStudioLanguageAccess } = await import('../src/server/free-studio-language-access')
const current = {
  legacyJavaScript: true,
  catalog: null,
  canCreatePro: true,
  canCreateJavaScript: true,
  canCreatePython: false,
  pythonGrantedExtensionIds: [],
  pythonCuration: { pythonLevel: 3, allowedModes: ['blocks', 'bridge'], allowLevelReveal: false },
}

test('fresh free language admission distinguishes achievements from Pro capability and validates the response', async () => {
  for (const [body, code] of [
    [{ ...current, canCreateJavaScript: false, canCreatePython: true }, 403],
    [{ ...current, canCreatePro: false }, 403],
    [{ ...current, canCreateJavaScript: undefined }, 503],
  ] as const) {
    const outcome = await assertFreeStudioLanguageAccess(
      { studioFreeOptions: async () => ({ status: 200, body }) },
      'javascript',
      true,
    ).then(
      () => null,
      (error) => error.status,
    )
    expect(outcome).toBe(code)
  }
  await assertFreeStudioLanguageAccess(
    { studioFreeOptions: async () => ({ status: 200, body: current }) },
    'javascript',
    true,
  )
  for (const status of [401, 403, 500]) {
    const outcome = await assertFreeStudioLanguageAccess(
      { studioFreeOptions: async () => ({ status, body: null }) },
      'javascript',
      true,
    ).then(
      () => null,
      (error) => error.status,
    )
    expect(outcome).toBe(status === 500 ? 503 : 403)
  }
})

test('cancellation while reading admission never authorizes subsequent runtime dispatch', async () => {
  const controller = new AbortController()
  let calls = 0
  const outcome = await assertFreeStudioLanguageAccess(
    {
      studioFreeOptions: async (options) => {
        expect(options?.signal).toBe(controller.signal)
        calls++
        controller.abort()
        return { status: 200, body: current }
      },
    },
    'javascript',
    true,
    controller.signal,
  ).then(
    () => 'allowed',
    (error) => error.name,
  )
  expect(outcome).toBe('AbortError')
  expect(calls).toBe(1)
  await expect(
    assertFreeStudioLanguageAccess(
      {
        studioFreeOptions: async () => {
          calls++
          return { status: 200, body: current }
        },
      },
      'javascript',
      true,
      controller.signal,
    ),
  ).rejects.toThrow()
  expect(calls).toBe(1)
})

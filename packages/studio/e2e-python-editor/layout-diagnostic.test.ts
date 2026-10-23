import { expect, test } from 'bun:test'
import type { Page, TestInfo } from '@playwright/test'
import { tracePythonFrameLayout } from './layout-diagnostic'

for (const cpu of [false, true])
  test(`trace setup failure retires its CDP session and preserves the original error (cpu=${cpu})`, async () => {
    const key = cpu ? 'PYTHON_LIVE_PROFILE' : 'PYTHON_LAYOUT_TRACE'
    const previous = process.env[key]
    process.env[key] = '1'
    const owned = new Set<object>()
    const startError = new Error('trace start rejected')
    const session = {
      async send() {
        throw startError
      },
      async detach() {
        owned.delete(session)
      },
    }
    const page = {
      context: () => ({
        newCDPSession: async () => {
          owned.add(session)
          return session
        },
      }),
    } as unknown as Page
    try {
      const error = await tracePythonFrameLayout(
        page,
        {} as TestInfo,
        cpu ? { cpu: true } : undefined,
      ).then(
        () => undefined,
        (error: unknown) => error,
      )
      expect(error).toBe(startError)
      expect(owned.size).toBe(0)
    } finally {
      owned.clear()
      if (previous === undefined) delete process.env[key]
      else process.env[key] = previous
    }
  })

test('trace setup reports failed retirement without replacing the original setup error', async () => {
  const previous = process.env.PYTHON_LIVE_PROFILE
  process.env.PYTHON_LIVE_PROFILE = '1'
  const startError = new Error('trace start rejected')
  const cleanupError = new Error('CDP detach rejected')
  const warnings: { name: string; body: string }[] = []
  const page = {
    context: () => ({
      newCDPSession: async () => ({
        async send() {
          throw startError
        },
        async detach() {
          throw cleanupError
        },
      }),
    }),
  } as unknown as Page
  const info = {
    attach: async (name: string, value: { body: string }) => {
      warnings.push({ name, body: value.body })
    },
  } as unknown as TestInfo
  try {
    const error = await tracePythonFrameLayout(page, info, { cpu: true }).then(
      () => undefined,
      (error: unknown) => error,
    )
    expect(error).toBe(startError)
    expect(warnings).toEqual([{ name: 'trace-setup-cleanup-error', body: String(cleanupError) }])
  } finally {
    if (previous === undefined) delete process.env.PYTHON_LIVE_PROFILE
    else process.env.PYTHON_LIVE_PROFILE = previous
  }
})

import { afterEach, expect, test } from 'bun:test'
import type { AiCreditsView } from '@sistemazero/core/ai-credits'
import { act, cleanup, renderHook } from '@testing-library/react'
import { setProjectStorageNamespace } from '../../state/projectStorageRuntime'
import type { StudioTutorConfig } from '../../studio/tutor'
import { useTutorCredits } from './useTutorCredits'

afterEach(() => {
  cleanup()
  setProjectStorageNamespace('')
})
const credits = (remaining: number): AiCreditsView => ({
  dayLimit: 50,
  dayRemaining: remaining,
  monthLimit: 500,
  monthRemaining: 500,
  monthRenewsOn: '2026-11-01',
})
function deferred() {
  let resolve!: (value: AiCreditsView | null) => void
  const promise = new Promise<AiCreditsView | null>((done) => {
    resolve = done
  })
  return { resolve, promise }
}
test('refreshes after usage and rejects older reads after a response, project or profile change', async () => {
  const reads: ReturnType<typeof deferred>[] = []
  const config: StudioTutorConfig = {
    credits: credits(20),
    adapter: {
      ask: async () => {
        throw new Error('not used')
      },
      loadHistory: async () => ({ messages: [], nextCursor: null }),
      deleteHistory: async () => {},
      feedback: async () => {},
      loadCredits: () => {
        const read = deferred()
        reads.push(read)
        return read.promise
      },
    },
  }
  const hook = renderHook(({ projectId }) => useTutorCredits(config, projectId, true), {
    initialProps: { projectId: 'one' },
  })
  expect(hook.result.current.credits?.dayRemaining).toBe(20)
  await act(async () => {
    reads[0]!.resolve(credits(19))
  })
  expect(hook.result.current.credits?.dayRemaining).toBe(19)
  act(() => hook.result.current.refreshCredits())
  act(() => hook.result.current.acceptCredits(credits(17)))
  await act(async () => {
    reads[1]!.resolve(credits(18))
  })
  expect(hook.result.current.credits?.dayRemaining).toBe(17)
  act(() => hook.result.current.refreshCredits())
  hook.rerender({ projectId: 'two' })
  await act(async () => {
    reads[2]!.resolve(credits(1))
  })
  expect(hook.result.current.credits?.dayRemaining).toBe(20)
  setProjectStorageNamespace('other-child')
  await act(async () => {
    reads[3]!.resolve(credits(2))
  })
  expect(hook.result.current.credits?.dayRemaining).toBe(20)
})

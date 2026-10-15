import { expect, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { useSceneContextTransition } from './useSceneContextTransition'

test('a failed preview application keeps the requested destination; continue preserves the draft and discard resumes once', () => {
  const { result, unmount } = renderHook(useSceneContextTransition)
  let pending = true,
    applied = 0,
    discarded = 0,
    resumed = 0
  const unregister = result.current.register('preview', () =>
    pending
      ? {
          title: 'Prévia',
          applyLabel: 'Aplicar',
          canApply: true,
          apply: () => {
            applied++
            return false
          },
          discard: () => {
            pending = false
            discarded++
          },
        }
      : null,
  )
  act(() => {
    expect(result.current.queue(() => resumed++)).toBe(true)
  })
  act(() => result.current.resolve('apply'))
  expect(applied).toBe(1)
  expect(resumed).toBe(0)
  expect(result.current.error !== null).toBe(true)
  act(() => result.current.resolve('continue'))
  expect(pending).toBe(true)
  act(() => {
    result.current.queue(() => resumed++)
  })
  act(() => {
    result.current.queue(() => {
      resumed += 100
    })
  })
  act(() => result.current.resolve('discard'))
  act(() => result.current.resolve('discard'))
  expect(discarded).toBe(1)
  expect(resumed).toBe(1)
  unregister()
  unmount()
})

test('an invalidated preview cannot be applied by an old decision; a valid application can issue its own command', () => {
  const { result, unmount } = renderHook(useSceneContextTransition)
  let pending = true,
    resumed = 0,
    applied = 0
  result.current.register('preview', () =>
    pending
      ? {
          title: 'Prévia',
          applyLabel: 'Aplicar',
          canApply: true,
          apply: () => {
            expect(
              result.current.queue(() => {
                throw new Error('Reentrant transition')
              }),
            ).toBe(false)
            applied++
            pending = false
            return true
          },
          discard: () => {
            pending = false
          },
        }
      : null,
  )
  act(() => {
    result.current.queue(() => resumed++)
  })
  pending = false
  act(() => result.current.resolve('apply'))
  expect(applied).toBe(0)
  expect(resumed).toBe(0)
  act(() => result.current.resolve('continue'))
  pending = true
  act(() => {
    result.current.queue(() => resumed++)
  })
  act(() => result.current.resolve('apply'))
  expect(applied).toBe(1)
  expect(resumed).toBe(1)
  expect(result.current.decision === null).toBe(true)
  unmount()
})

import { expect, it } from 'bun:test'
import { renderHook, waitFor } from '@testing-library/react'
import { useDebounced } from './useDebounced'

it('an explicit snapshot boundary flushes immediately and subsequent edits still debounce', async () => {
  const { result, rerender } = renderHook(
    ({ value, version }) => useDebounced(value, 50, version),
    { initialProps: { value: 'original', version: 0 } },
  )
  rerender({ value: 'buffered', version: 0 })
  expect(result.current).toBe('original')
  rerender({ value: 'saved', version: 1 })
  expect(result.current).toBe('saved')
  rerender({ value: 'next edit', version: 1 })
  expect(result.current).toBe('saved')
  await waitFor(() => expect(result.current).toBe('next edit'))
})

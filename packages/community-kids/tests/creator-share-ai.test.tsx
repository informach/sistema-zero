import { expect, test } from 'bun:test'
import { useStudioShare } from '@sistemazero/member-shell/components/creator/use-studio-share'
import { renderHook } from '@testing-library/react'

test('host sem capacidade de IA não oferece geração de descrição nem desliga publicação', () => {
  const { result, rerender } = renderHook(({ enabled }) => useStudioShare(null, enabled), {
    initialProps: { enabled: false },
  })
  expect(result.current.generateDescription).toBeUndefined()
  expect(result.current.publish).toBeFunction()
  rerender({ enabled: true })
  expect(result.current.generateDescription).toBeFunction()
})
test('host Kids conserva geração de descrição por padrão', () => {
  const { result } = renderHook(() => useStudioShare(null))
  expect(result.current.generateDescription).toBeFunction()
})

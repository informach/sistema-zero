import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, render } from '@testing-library/react'
import { EditorSkeleton, Spinner } from './LoadingViews'

afterEach(cleanup)

describe('LoadingViews', () => {
  it('desativa animações quando o usuário prefere movimento reduzido', () => {
    const { container, rerender } = render(<Spinner />)
    expect(container.querySelector('.animate-spin')?.className).toContain(
      'motion-reduce:animate-none',
    )

    rerender(<EditorSkeleton message="Carregando editor" />)
    for (const animated of container.querySelectorAll('.animate-pulse')) {
      expect(animated.className).toContain('motion-reduce:animate-none')
    }
  })
})

import { afterEach, describe, expect, it, spyOn } from 'bun:test'
import { cleanup, render } from '@testing-library/react'
import type { JSX } from 'react'
import { ErrorBoundary } from '#ui'

function Boom(): JSX.Element {
  throw new Error('explodiu')
}

function ConditionalBoom({ shouldThrow }: { shouldThrow: boolean }): JSX.Element {
  if (shouldThrow) throw new Error('explodiu')
  return <p>conteúdo ok</p>
}

describe('ErrorBoundary', () => {
  afterEach(cleanup)

  it('renderiza os filhos quando não há erro', () => {
    const { getByText } = render(
      <ErrorBoundary fallback={() => <p>falhou</p>}>
        <p>tudo certo</p>
      </ErrorBoundary>,
    )
    expect(getByText('tudo certo')).toBeTruthy()
  })

  it('mostra o fallback quando um filho lança no render', () => {
    const spy = spyOn(console, 'error').mockImplementation(() => {})
    const { getByText } = render(
      <ErrorBoundary fallback={({ error }) => <p>erro: {error.message}</p>}>
        <Boom />
      </ErrorBoundary>,
    )
    expect(getByText('erro: explodiu')).toBeTruthy()
    spy.mockRestore()
  })

  it('reseta automaticamente quando resetKeys muda', () => {
    const spy = spyOn(console, 'error').mockImplementation(() => {})
    const { getByText, rerender } = render(
      <ErrorBoundary resetKeys={[1]} fallback={() => <p>tela de erro</p>}>
        <ConditionalBoom shouldThrow={true} />
      </ErrorBoundary>,
    )
    expect(getByText('tela de erro')).toBeTruthy()
    rerender(
      <ErrorBoundary resetKeys={[2]} fallback={() => <p>tela de erro</p>}>
        <ConditionalBoom shouldThrow={false} />
      </ErrorBoundary>,
    )
    expect(getByText('conteúdo ok')).toBeTruthy()
    spy.mockRestore()
  })
})

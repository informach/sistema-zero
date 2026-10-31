import { expect, test } from 'bun:test'
import { EdiAnimation } from '@sistemazero/edisvg/react'
import { act, render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'

test('module artwork has its verified reserve in SSR without downloading an animation', () => {
  const html = renderToStaticMarkup(
    <EdiAnimation
      src="https://media.test/project.edi-animation.json"
      poster="https://media.test/reserve.png"
      title="Arte do módulo"
    />,
  )
  expect(html).toContain('https://media.test/reserve.png')
  expect(html).toContain('aria-label="Arte do módulo"')
  expect(html).not.toContain('<svg')
})
test('switching a source immediately switches its reserve instead of showing the previous artwork', async () => {
  const { container, rerender } = render(
    <EdiAnimation
      animated={false}
      src="https://media.test/first.edi-animation.json"
      poster="https://media.test/first.png"
    />,
  )
  expect(container.querySelector('img')?.getAttribute('src')).toBe('https://media.test/first.png')
  rerender(
    <EdiAnimation
      animated={false}
      src="https://media.test/next.edi-animation.json"
      poster="https://media.test/next.png"
    />,
  )
  await act(async () => {})
  expect(container.querySelector('img')?.getAttribute('src')).toBe('https://media.test/next.png')
  expect(container.querySelector('svg')).toBeNull()
})

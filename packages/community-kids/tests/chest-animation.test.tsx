import { expect, test } from 'bun:test'
import { BUILTIN_ART } from '@sistemazero/edisvg/builtins'
import { renderToStaticMarkup } from 'react-dom/server'
import { ChestAnimation } from '../src/components/kids/chest-animation'
import { ChestClosedFallback, ChestIcon } from '../src/components/kids/chest-icon'

test('server render has the verified reserve without mounting an animation runtime', () => {
  const html = renderToStaticMarkup(
    <ChestAnimation
      opening={false}
      opened={false}
      onReady={() => {}}
      onFailed={() => {}}
      onOpened={() => {}}
    />,
  )
  expect(html).toContain(BUILTIN_ART.chest.poster.url)
  expect(html).not.toContain('<svg')
})
test('a previously opened chest does not mount the opening player again', () => {
  expect(
    renderToStaticMarkup(
      <ChestAnimation
        opening={false}
        opened
        onReady={() => {}}
        onFailed={() => {}}
        onOpened={() => {}}
      />,
    ),
  ).toBe('')
})
test('the static closed and opened fallback poses are distinct and exported from the authored chest', () => {
  expect(renderToStaticMarkup(<ChestClosedFallback />)).toContain(BUILTIN_ART.chest.poster.url)
  expect(renderToStaticMarkup(<ChestIcon open />)).toContain(BUILTIN_ART.chestOpen.poster.url)
  expect(BUILTIN_ART.chest.poster.url).not.toBe(BUILTIN_ART.chestOpen.poster.url)
})

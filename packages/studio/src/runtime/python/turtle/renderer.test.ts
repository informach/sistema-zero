import { expect, test } from 'bun:test'
import { createTurtleRenderer } from './renderer'

test('a Turtle screen initialized before host layout uses its logical viewport, then measures the host', async () => {
  const host = document.createElement('div')
  const dimensions = { width: 0, height: 0 }
  Object.defineProperties(host, {
    clientWidth: { get: () => dimensions.width },
    clientHeight: { get: () => dimensions.height },
  })
  const renderer = createTurtleRenderer(host)
  const viewport = async () =>
    JSON.parse(
      await renderer.exchange(
        JSON.stringify({ version: 1, operations: [], query: { type: 'viewport' } }),
        [],
      ),
    ).value
  try {
    expect(await viewport()).toEqual([640, 480])
    dimensions.width = 800
    dimensions.height = 1
    expect(await viewport()).toEqual([640, 480])
    dimensions.height = 600
    expect(await viewport()).toEqual([800, 600])
  } finally {
    renderer.dispose()
  }
})

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

test('zoom and trash use the pinned Blockly image from the host, without the demo CDN', async ({
  page,
  baseURL,
}) => {
  await page.goto('/aula?aula=cade-todo-mundo/cade-todo-mundo-aula-1')
  const image = page.locator('.blocklyTrash image').first()
  await expect(image).toBeAttached()
  const url = await image.evaluate(
    (node) => node.getAttribute('href') ?? node.getAttribute('xlink:href'),
  )
  expect(url).toBeTruthy()
  const absolute = new URL(url ?? '', page.url())
  expect(absolute.origin).toBe(new URL(baseURL ?? page.url()).origin)
  const response = await page.request.get(absolute.href)
  expect(response.ok()).toBe(true)
  const actual = createHash('sha256')
    .update(await response.body())
    .digest('hex')
  const expected = createHash('sha256')
    .update(
      readFileSync(new URL('../playground/public/studio-blockly/sprites.png', import.meta.url)),
    )
    .digest('hex')
  expect(actual).toBe(expected)
  const urls = await page
    .locator('.blocklyZoom image')
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('href') ?? node.getAttribute('xlink:href')),
    )
  expect(urls.length).toBeGreaterThan(0)
  expect(urls.every((value) => value === url)).toBe(true)
})

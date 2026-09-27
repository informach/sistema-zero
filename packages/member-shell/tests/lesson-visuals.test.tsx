import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { renderMarkdown, renderUgcMarkdown, stripImageMarkdown } from '../src/lib/markdown'
import { GET } from '../src/server/lesson-visuals'

test('reviewed lesson illustrations render with alt text, but UGC cannot embed them', async () => {
  const source = '![Dois saltos](/api/lesson-visuals/dino-impulso-v1.svg)'
  expect(renderToStaticMarkup(renderMarkdown(source))).toContain('alt="Dois saltos"')
  expect(renderToStaticMarkup(renderUgcMarkdown(source))).not.toContain('<img')
  expect(stripImageMarkdown(source)).toBe('Dois saltos')
  expect(renderToStaticMarkup(renderMarkdown('![x](//external.invalid/pixel)'))).not.toContain(
    '<img',
  )
  expect(
    renderToStaticMarkup(renderMarkdown('![x](/api/lesson-visuals/../../private.svg)')),
  ).not.toContain('<img')
  const response = await GET(new Request('http://localhost'), {
    params: Promise.resolve({ name: 'dino-impulso-v1.svg' }),
  })
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toContain('image/svg+xml')
  expect(
    (
      await GET(new Request('http://localhost'), {
        params: Promise.resolve({ name: '../../private.svg' }),
      })
    ).status,
  ).toBe(404)
})

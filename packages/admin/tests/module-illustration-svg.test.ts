import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import {
  InvalidModuleIllustrationSvgError,
  validateModuleIllustrationSvg,
} from '../src/lib/module-illustration-svg'

const existing = readFileSync(
  new URL('../../community-kids/public/trilha/desafio-nave.svg', import.meta.url),
  'utf8',
)

test('preserva a animação CSS da ilustração atual', () => {
  expect(validateModuleIllustrationSvg(existing)).toBe(existing)
  expect(validateModuleIllustrationSvg(existing)).toContain('@keyframes hover')
})

test('aceita animação SMIL e referência interna de gradiente', () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><linearGradient id="a"><stop offset="0" stop-color="red"/></linearGradient></defs><circle r="4" fill="url(#a)"><animate attributeName="opacity" from="0" to="1" dur="2s" repeatCount="indefinite"/></circle></svg>'
  expect(validateModuleIllustrationSvg(svg)).toBe(svg)
})

test('aceita declaração XML comum em arquivos exportados', () => {
  const svg =
    '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid meet"/>'
  expect(validateModuleIllustrationSvg(svg)).toBe(svg)
})

test.each([
  '<script>alert(1)</script>',
  '<foreignObject><body>bad</body></foreignObject>',
  '<image href="https://example.com/x.png"/>',
  '<circle onload="alert(1)"/>',
  '<style>@import url(https://example.com/a.css)</style>',
  '<circle style="fill:url(https://example.com/a.svg)"/>',
  '<animate attributeName="href" to="https://example.com" dur="1s"/>',
  '<!DOCTYPE svg [<!ENTITY x SYSTEM "https://example.com">]>',
])('rejeita SVG ativo ou com recursos externos: %s', (payload) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg">${payload}</svg>`
  expect(() => validateModuleIllustrationSvg(svg)).toThrow(InvalidModuleIllustrationSvgError)
})

test('rejeita XML com mais de uma raiz ou tags abertas', () => {
  const root = '<svg xmlns="http://www.w3.org/2000/svg"/>'
  expect(() => validateModuleIllustrationSvg(`${root}<script>alert(1)</script>`)).toThrow(
    InvalidModuleIllustrationSvgError,
  )
  expect(() =>
    validateModuleIllustrationSvg('<svg xmlns="http://www.w3.org/2000/svg"><path></svg>'),
  ).toThrow(InvalidModuleIllustrationSvgError)
})

import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { createVectorSpriteAsset } from '../../pinta/src/core/project'
import { buildAnimatedVectorSvg } from '../../pinta/src/export/animatedSvg'
import type { VectorShape } from '../../pinta/src/vector/model'
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

test('aceita o SVG animado gerado pelo Pinta, inclusive linha suave e fallback discreto', () => {
  const asset = createVectorSpriteAsset({ name: 'nave', frameSize: 64 })
  const animation = asset.animations[0]
  if (!animation) throw new Error('animação esperada')
  const base = { fill: 'none', stroke: { color: '#ffffff', width: 2 }, opacity: 1, rotation: 0 }
  const line = (id: string, x2: number): VectorShape => ({
    ...base,
    id,
    motionId: 'linha',
    type: 'line',
    x1: 0,
    y1: 0,
    x2,
    y2: 10,
  })
  const triangle = (id: string, offset: number): VectorShape => ({
    ...base,
    id,
    motionId: 'triangulo',
    type: 'polygon',
    points: [
      { x: offset, y: 0 },
      { x: offset + 4, y: 8 },
      { x: offset + 8, y: 0 },
    ],
  })
  const configured = {
    ...animation,
    // Nome livre que seria inseguro se o exportador o copiasse para atributos.
    name: 'andar url(https://exemplo.test) \\',
    frames: [
      [line('l1', 10), triangle('p1', 0)],
      [line('l2', 20), triangle('p2', 4)],
    ],
  }
  const result = buildAnimatedVectorSvg({ ...asset, animations: [configured] }, configured)
  if (!result.ok) throw new Error(`export falhou: ${result.reason}`)

  expect(result.svg).toContain('attributeName="x2"')
  expect(result.svg).toContain('attributeName="visibility"')
  expect(result.svg).not.toContain('exemplo.test')
  expect(validateModuleIllustrationSvg(result.svg)).toBe(result.svg)
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

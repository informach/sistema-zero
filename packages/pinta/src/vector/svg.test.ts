import { describe, expect, it } from 'bun:test'
import { createVectorAsset } from '../core/project'
import type { VectorShape } from './model'
import { shapeToMarkup, vectorToSvg } from './svg'

const base = { fill: '#78dc52', stroke: null, opacity: 1, rotation: 0 }

describe('shapeToMarkup', () => {
  it('rect com raio e stroke', () => {
    const shape: VectorShape = {
      ...base,
      id: 'r1',
      type: 'rect',
      x: 1,
      y: 2,
      w: 30,
      h: 40,
      rx: 4,
      stroke: { color: '#000000', width: 2 },
    }
    expect(shapeToMarkup(shape)).toBe(
      '<rect x="1" y="2" width="30" height="40" rx="4" fill="#78dc52" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    )
  })

  it('rotação vira transform rotate em torno do centro', () => {
    const shape: VectorShape = {
      ...base,
      id: 'r2',
      type: 'rect',
      x: 0,
      y: 0,
      w: 10,
      h: 10,
      rx: 0,
      rotation: 45,
    }
    expect(shapeToMarkup(shape)).toContain('transform="rotate(45 5 5)"')
  })

  it('texto escapa XML (anti-injeção no SVG exportado)', () => {
    const shape: VectorShape = {
      ...base,
      id: 't1',
      type: 'text',
      x: 0,
      y: 10,
      text: '<script>&"oi"',
      fontSize: 24,
    }
    const markup = shapeToMarkup(shape)
    expect(markup).toContain('&lt;script&gt;&amp;&quot;oi&quot;')
    expect(markup).not.toContain('<script>')
  })

  it('opacidade parcial e polygon points', () => {
    const shape: VectorShape = {
      ...base,
      id: 'p1',
      type: 'polygon',
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 9.129 },
      ],
      opacity: 0.5,
    }
    const markup = shapeToMarkup(shape)
    expect(markup).toContain('points="0,0 10,0 5,9.13"')
    expect(markup).toContain('opacity="0.5"')
  })
})

describe('vectorToSvg (snapshot do documento)', () => {
  it('documento completo com viewBox e z-order preservado', () => {
    const asset = createVectorAsset({ name: 'livre', width: 480, height: 360 })
    const withShapes = {
      ...asset,
      shapes: [
        { ...base, id: 'a', type: 'ellipse', cx: 10, cy: 10, rx: 5, ry: 5 },
        {
          ...base,
          id: 'b',
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 9,
          y2: 9,
          stroke: { color: '#ff2121', width: 3 },
        },
      ] as VectorShape[],
    }
    const svg = vectorToSvg(withShapes)
    expect(svg).toBe(
      [
        '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">',
        '  <ellipse cx="10" cy="10" rx="5" ry="5" fill="#78dc52"/>',
        '  <line x1="0" y1="0" x2="9" y2="9" fill="#78dc52" stroke="#ff2121" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
        '</svg>',
      ].join('\n'),
    )
  })
})

import { expect, it } from 'bun:test'
import { isBlockInView } from '../blockInView'

const SVG_NS = 'http://www.w3.org/2000/svg'
const workspace = {
  getMetricsManager: () => ({
    getViewMetrics: () => ({ left: 0, top: 0, width: 800, height: 600 }),
  }),
} as never

function block(connected: boolean) {
  const svg = document.createElementNS(SVG_NS, 'g')
  if (connected) document.body.appendChild(svg)
  return {
    getSvgRoot: () => svg,
    // A posição de um corpo desmontado para no nó solto: parece perto da origem.
    getRelativeToSurfaceXY: () => ({ x: 10, y: 10 }),
    getHeightWidth: () => ({ width: 50, height: 20 }),
  } as never
}

it('um bloco na página e dentro da vista está à vista', () => {
  expect(isBlockInView(workspace, block(true))).toBe(true)
})

it('um bloco cujo corpo saiu da página não está à vista, mesmo com posição perto da origem', () => {
  // Achado C4: sem isto o cursor do código não rolava até o bloco nem o remontava.
  expect(isBlockInView(workspace, block(false))).toBe(false)
})

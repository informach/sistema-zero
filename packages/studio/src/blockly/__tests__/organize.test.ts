import { describe, expect, it } from 'bun:test'
import { organizeBlocks } from '../organize'

/** Bloco falso com geometria controlável (o organize roda só com geometria real). */
function fakeBlock(type: string, x: number, y: number, w: number, h: number) {
  let cx = x
  let cy = y
  return {
    type,
    getBoundingRectangle: () => ({ left: cx, right: cx + w, top: cy, bottom: cy + h }),
    getRelativeToSurfaceXY: () => ({ x: cx, y: cy }),
    moveBy: (dx: number, dy: number) => {
      cx += dx
      cy += dy
    },
    isInsertionMarker: () => false,
    get pos() {
      return { x: cx, y: cy }
    },
  }
}

function fakeWorkspace(blocks: ReturnType<typeof fakeBlock>[]) {
  return {
    getTopBlocks: () => blocks,
    setResizesEnabled: () => {},
    render: () => {},
  }
}

describe('organizeBlocks — áreas em duas linhas', () => {
  it('organiza HTML/CSS na primeira linha e moldes/início/eventos/loops na segunda', () => {
    // Começam EMPILHADOS na mesma coluna (o sintoma reportado).
    const structure = fakeBlock('sz_frame_structure', 0, 0, 300, 120)
    const appearance = fakeBlock('sz_frame_appearance', 0, 140, 300, 120)
    const molds = fakeBlock('sz_frame_molds', 0, 280, 300, 120)
    const start = fakeBlock('sz_frame_start', 0, 420, 300, 120)
    const events = fakeBlock('sz_frame_events', 0, 560, 300, 120)
    const loops = fakeBlock('sz_frame_loops', 0, 700, 300, 120)
    organizeBlocks(fakeWorkspace([structure, appearance, molds, start, events, loops]) as any)

    expect(structure.pos.x).toBeLessThan(appearance.pos.x)
    expect(structure.pos.y).toBe(appearance.pos.y)
    expect(appearance.pos.x).toBeGreaterThanOrEqual(structure.pos.x + 300)
    expect(molds.pos.x).toBeLessThan(start.pos.x)
    expect(start.pos.x).toBeLessThan(events.pos.x)
    expect(events.pos.x).toBeLessThan(loops.pos.x)
    expect(molds.pos.y).toBe(start.pos.y)
    expect(start.pos.y).toBe(events.pos.y)
    expect(events.pos.y).toBe(loops.pos.y)
    expect(molds.pos.y).toBeGreaterThan(structure.pos.y)
  })

  it('o container fica no topo da coluna; rascunho solto da mesma categoria desce', () => {
    const behavior = fakeBlock('sz_frame_start', 500, 500, 300, 120)
    const draft = fakeBlock('sz_js_console_log_text', 0, 0, 200, 40)
    organizeBlocks(fakeWorkspace([draft, behavior]) as any)
    // Ambos na coluna de JS; o frame em cima, o rascunho abaixo.
    expect(behavior.pos.x).toBe(draft.pos.x)
    expect(behavior.pos.y).toBeLessThan(draft.pos.y)
  })
})

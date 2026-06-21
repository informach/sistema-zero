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

describe('organizeBlocks — blocos-container lado a lado', () => {
  it('põe Estrutura | Aparência | Comportamento em 3 colunas (mesmo y), nessa ordem', () => {
    // Começam EMPILHADOS na mesma coluna (o sintoma reportado).
    const structure = fakeBlock('sz_frame_structure', 0, 0, 300, 120)
    const appearance = fakeBlock('sz_frame_appearance', 0, 140, 300, 120)
    const behavior = fakeBlock('sz_frame_behavior', 0, 280, 300, 120)
    organizeBlocks(fakeWorkspace([structure, appearance, behavior]) as any)

    // Lado a lado: x estritamente crescente na ordem HTML → CSS → Comportamento.
    expect(structure.pos.x).toBeLessThan(appearance.pos.x)
    expect(appearance.pos.x).toBeLessThan(behavior.pos.x)
    // Alinhados no topo (mesma linha) — não um embaixo do outro.
    expect(structure.pos.y).toBe(appearance.pos.y)
    expect(appearance.pos.y).toBe(behavior.pos.y)
    // Sem sobreposição: a próxima coluna começa depois da borda direita da anterior.
    expect(appearance.pos.x).toBeGreaterThanOrEqual(structure.pos.x + 300)
    expect(behavior.pos.x).toBeGreaterThanOrEqual(appearance.pos.x + 300)
  })

  it('o container fica no topo da coluna; rascunho solto da mesma categoria desce', () => {
    const behavior = fakeBlock('sz_frame_behavior', 500, 500, 300, 120)
    const draft = fakeBlock('sz_js_console_log_text', 0, 0, 200, 40)
    organizeBlocks(fakeWorkspace([draft, behavior]) as any)
    // Ambos na coluna de JS; o frame em cima, o rascunho abaixo.
    expect(behavior.pos.x).toBe(draft.pos.x)
    expect(behavior.pos.y).toBeLessThan(draft.pos.y)
  })
})

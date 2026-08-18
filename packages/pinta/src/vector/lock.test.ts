import { describe, expect, it } from 'bun:test'
import { lockedIdsOf, lockedShapesViolation } from './lock'
import type { VectorShape } from './model'

/**
 * O guard central do cadeado do vetor. É o backstop do `commitShapes`: errar
 * para um lado deixa a criança estragar a forma trancada; errar para o outro
 * congela o editor inteiro (toda edição legítima recusada).
 */

function rect(id: string, extra: Partial<VectorShape> = {}): VectorShape {
  return {
    id,
    type: 'rect',
    x: 0,
    y: 0,
    w: 10,
    h: 10,
    rx: 0,
    fill: '#ff0000',
    stroke: null,
    opacity: 1,
    rotation: 0,
    ...extra,
  } as VectorShape
}

describe('lockedShapesViolation', () => {
  it('sem forma trancada: qualquer mudança passa (o caso comum não paga nada)', () => {
    const a = rect('a')
    expect(lockedShapesViolation([a], [])).toBe(false)
    expect(lockedShapesViolation([a], [rect('a', { x: 99 })])).toBe(false)
  })

  it('REORDENAR passa: a trancada atravessa como a mesma referência', () => {
    const locked = rect('a', { locked: true })
    const free = rect('b')
    expect(lockedShapesViolation([locked, free], [free, locked])).toBe(false)
  })

  it('editar as LIVRES passa; a trancada intocada não atrapalha', () => {
    const locked = rect('a', { locked: true })
    const free = rect('b')
    const next = [locked, rect('b', { x: 50, fill: '#00ff00' })]
    expect(lockedShapesViolation([locked, free], next)).toBe(false)
  })

  it('MOVER a trancada → violação (mesmo recriando o objeto)', () => {
    const locked = rect('a', { locked: true })
    expect(lockedShapesViolation([locked], [rect('a', { locked: true, x: 5 })])).toBe(true)
  })

  it('mudar ESTILO da trancada → violação', () => {
    const locked = rect('a', { locked: true })
    expect(lockedShapesViolation([locked], [rect('a', { locked: true, fill: '#0000ff' })])).toBe(
      true,
    )
    expect(
      lockedShapesViolation(
        [locked],
        [rect('a', { locked: true, stroke: { color: '#000000', width: 2 } })],
      ),
    ).toBe(true)
  })

  it('REMOVER a trancada → violação', () => {
    const locked = rect('a', { locked: true })
    expect(lockedShapesViolation([locked, rect('b')], [rect('b')])).toBe(true)
  })

  it('mudar o GRUPO da trancada → violação (agrupar exige destrancar)', () => {
    const locked = rect('a', { locked: true })
    expect(lockedShapesViolation([locked], [rect('a', { locked: true, groupId: 'g1' })])).toBe(true)
  })

  it('DESTRANCAR e ESCONDER passam: são os dois gestos permitidos', () => {
    const locked = rect('a', { locked: true })
    // Destrancar: a chave some, o resto idêntico.
    expect(lockedShapesViolation([locked], [rect('a')])).toBe(false)
    // Esconder: locked continua, hidden entra.
    expect(lockedShapesViolation([locked], [rect('a', { locked: true, hidden: true })])).toBe(false)
  })

  it('pontos de POLÍGONO/traço da trancada → violação (deep compare alcança arrays)', () => {
    const poly = {
      id: 'p',
      type: 'polygon',
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 10 },
      ],
      fill: '#ff0000',
      stroke: null,
      opacity: 1,
      rotation: 0,
      locked: true,
    } as VectorShape
    const moved = structuredClone(poly)
    if (moved.type === 'polygon' && moved.points[0]) moved.points[0].x = 3
    expect(lockedShapesViolation([poly], [moved])).toBe(true)
    // Clone SEM mudança também passa (a régua é estrutural, não de referência).
    expect(lockedShapesViolation([poly], [structuredClone(poly)])).toBe(false)
  })
})

describe('lockedIdsOf', () => {
  it('só os trancados entram', () => {
    const ids = lockedIdsOf([rect('a', { locked: true }), rect('b'), rect('c', { locked: true })])
    expect([...ids].sort()).toEqual(['a', 'c'])
  })
})

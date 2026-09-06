import { describe, expect, it } from 'bun:test'
import { addPointerDragListeners } from './pointerDrag'

describe('addPointerDragListeners', () => {
  it('cleanup remove listeners mesmo sem pointerup', () => {
    const target = document
    let moves = 0
    const cleanup = addPointerDragListeners(target, {
      pointerId: 0,
      onMove: () => {
        moves += 1
      },
      onEnd: () => {},
    })
    target.dispatchEvent(new PointerEvent('pointermove'))
    cleanup()
    target.dispatchEvent(new PointerEvent('pointermove'))
    expect(moves).toBe(1)
  })

  it('pointerup encerra e remove o próprio listener', () => {
    const target = document
    let ended = 0
    let moves = 0
    addPointerDragListeners(target, {
      pointerId: 0,
      onMove: () => {
        moves += 1
      },
      onEnd: () => {
        ended += 1
      },
    })
    target.dispatchEvent(new PointerEvent('pointerup'))
    target.dispatchEvent(new PointerEvent('pointermove'))
    expect(ended).toBe(1)
    expect(moves).toBe(0)
  })

  it('ignora movimento e término de outro ponteiro sem remover o gesto principal', () => {
    const target = document
    const moves: number[] = []
    const ended: number[] = []
    addPointerDragListeners(target, {
      pointerId: 7,
      onMove: (event) => moves.push(event.pointerId),
      onEnd: (event) => ended.push(event.pointerId),
    })

    target.dispatchEvent(new PointerEvent('pointermove', { pointerId: 8 }))
    target.dispatchEvent(new PointerEvent('pointermove', { pointerId: 7 }))
    target.dispatchEvent(new PointerEvent('pointerup', { pointerId: 8 }))
    target.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7 }))

    expect(moves).toEqual([7])
    expect(ended).toEqual([7])
  })
})

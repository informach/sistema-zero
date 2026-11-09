import { afterEach, beforeEach, expect, test } from 'bun:test'
import { useAndarLivre } from '@sistemazero/member-shell/components/scene-discovery-frame'
import { ModuloAndar, useMapaLivre } from '@sistemazero/member-shell/components/scene-faisca-livre'
import { INICIO, useAndar3D } from '@sistemazero/member-shell/components/scene-ilha-porta'
import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react'
import { useRef } from 'react'

const rafOriginal = window.requestAnimationFrame
const cafOriginal = window.cancelAnimationFrame
let pendentes = new Map<number, FrameRequestCallback>()
let id = 0
let agora = 0
beforeEach(() => {
  pendentes = new Map()
  agora = performance.now() + 1000
  window.requestAnimationFrame = (cb) => {
    pendentes.set(++id, cb)
    return id
  }
  window.cancelAnimationFrame = (n) => {
    pendentes.delete(n)
  }
})
afterEach(() => {
  cleanup()
  window.requestAnimationFrame = rafOriginal
  window.cancelAnimationFrame = cafOriginal
})
const quadro = () =>
  act(() => {
    agora += 50
    const fila = [...pendentes.values()]
    pendentes.clear()
    for (const cb of fila) cb(agora)
  })

const casos = [
  {
    nome: 'livre 2D',
    velocidade: 150,
    useAndar: (velocidade: number) =>
      useAndarLivre({
        inicio: { x: 100, y: 100 },
        limites: { x0: 0, x1: 400, y0: 0, y1: 300 },
        velocidade,
      }),
  },
  {
    nome: 'mapa com colisões',
    velocidade: 150,
    useAndar: (velocidade: number) => useMapaLivre({ inicio: { x: 100, y: 100 }, velocidade }),
  },
  {
    nome: 'ilha 3D',
    velocidade: 4,
    useAndar: (velocidade: number) => {
      const andar = useAndar3D(INICIO, velocidade)
      return { ...andar, pos: { x: andar.pos.x, y: andar.pos.z } }
    },
  },
]
for (const caso of casos) {
  test(`${caso.nome}: diagonal não acelera, usa a velocidade atual e soltar cancela o quadro`, () => {
    const { result, rerender, unmount } = renderHook(
      ({ velocidade }) => caso.useAndar(velocidade),
      {
        initialProps: { velocidade: caso.velocidade },
      },
    )
    const inicio = result.current.pos
    act(() => {
      result.current.segurar('direita')
      result.current.segurar('baixo')
    })
    quadro()
    const depois = result.current.pos
    expect(Math.hypot(depois.x - inicio.x, depois.y - inicio.y)).toBeCloseTo(caso.velocidade * 0.05)
    rerender({ velocidade: caso.velocidade / 2 })
    quadro()
    const lento = result.current.pos
    expect(Math.hypot(lento.x - depois.x, lento.y - depois.y)).toBeCloseTo(caso.velocidade * 0.025)
    act(() => {
      result.current.soltar('direita')
      result.current.soltar('baixo')
    })
    expect(pendentes.size).toBe(0)
    quadro()
    expect(result.current.pos).toEqual(lento)
    act(() => result.current.segurar('direita'))
    expect(pendentes.size).toBe(1)
    unmount()
    expect(pendentes.size).toBe(0)
  })

  test(`${caso.nome}: perder foco e recomeçar soltam as direções antigas`, () => {
    const { result } = renderHook(() => caso.useAndar(caso.velocidade))
    const inicio = result.current.pos
    act(() => result.current.segurar('direita'))
    quadro()
    act(() => window.dispatchEvent(new Event('blur')))
    expect(result.current.andando).toBe(false)
    expect(pendentes.size).toBe(0)
    act(() => result.current.segurar('baixo'))
    quadro()
    act(() => result.current.voltar())
    expect(result.current.pos).toEqual(inicio)
    expect(result.current.andando).toBe(false)
    expect(pendentes.size).toBe(0)
  })
}

test('colisão em um eixo permite deslizar no outro e o predicado pode mudar', () => {
  const { result, rerender } = renderHook(
    ({ parede }) =>
      useMapaLivre({
        inicio: { x: 100, y: 100 },
        pode: (p) => !parede || p.x <= 100,
      }),
    { initialProps: { parede: true } },
  )
  act(() => {
    result.current.segurar('direita')
    result.current.segurar('baixo')
  })
  quadro()
  expect(result.current.pos.x).toBe(100)
  expect(result.current.pos.y).toBeGreaterThan(100)
  rerender({ parede: false })
  quadro()
  expect(result.current.pos.x).toBeGreaterThan(100)
})

test('esconder a aba solta a seta e permite um novo toque ao voltar', () => {
  function Mapa() {
    const raiz = useRef<HTMLDivElement>(null)
    const andar = useMapaLivre({ inicio: { x: 100, y: 100 } })
    return (
      <div ref={raiz}>
        <ModuloAndar raiz={raiz} andar={andar} mao={false} />
      </div>
    )
  }
  const { container } = render(<Mapa />)
  const seta = container.querySelector('button[aria-label="Andar para a direita"]')!
  const original = Object.getOwnPropertyDescriptor(document, 'hidden')
  try {
    fireEvent.pointerDown(seta, { pointerId: 1 })
    quadro()
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(pendentes.size).toBe(0)
    expect(seta.getAttribute('aria-pressed')).toBe('false')
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    fireEvent.pointerDown(seta, { pointerId: 2 })
    expect(seta.getAttribute('aria-pressed')).toBe('true')
    expect(pendentes.size).toBe(1)
    fireEvent.pointerUp(seta, { pointerId: 2 })
    expect(pendentes.size).toBe(0)
  } finally {
    if (original) Object.defineProperty(document, 'hidden', original)
    else Reflect.deleteProperty(document, 'hidden')
  }
})

/**
 * As réguas do palco (em cima e à esquerda), em UNIDADES DO DOCUMENTO, acompanhando o zoom e
 * a rolagem. Genérica: recebe a div rolável, o conteúdo (o `<svg>` do vetor; um dia o canvas
 * do pixel) e o tamanho do documento, e não sabe nada de vetor.
 *
 * Desempenho: os traços são montados UMA vez por zoom/documento; o deslocamento pela rolagem
 * e o risquinho do cursor são escritos DIRETO no DOM por ref (`transform`), sem `setState` em
 * `scroll` nem em `pointermove`: o palco não re-renderiza porque a criança rolou.
 *
 * Acessibilidade: as réguas são decorativas (`aria-hidden`). Sem região viva de coordenadas de
 * propósito: um `role=status` a cada movimento do mouse inunda o leitor de tela.
 *
 * `enabled={false}` devolve só a célula do palco (a mesma div relativa de sempre), para o
 * chamador não duplicar a árvore.
 */
import type { JSX, ReactNode, PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { rulerTicks } from './rulerTicks'

export type RulerAxis = 'x' | 'y'

/** Espessura das réguas em px de tela (o `--pin-ruler` do CSS é a mesma medida). */
export const RULER_PX = 24

export interface StageRulersProps {
  enabled: boolean
  /** A div rolável (`overflow-auto`) que contém o papel. */
  stageRef: RefObject<HTMLDivElement | null>
  /** O conteúdo medido: o `<svg>` (ou o canvas). O zero da régua é o canto dele. */
  contentRef: RefObject<Element | null>
  docWidth: number
  docHeight: number
  zoom: number
  /** Pressionar na régua (quem cria guias a partir dela liga aqui). */
  onRulerPointerDown?: (axis: RulerAxis, event: ReactPointerEvent<SVGSVGElement>) => void
  children: ReactNode
}

const CELL_CLASS = 'relative flex min-h-0 min-w-0 flex-1'

export function StageRulers({
  enabled,
  stageRef,
  contentRef,
  docWidth,
  docHeight,
  zoom,
  onRulerPointerDown,
  children,
}: StageRulersProps): JSX.Element {
  const topRef = useRef<SVGSVGElement>(null)
  const leftRef = useRef<SVGSVGElement>(null)
  const topGroupRef = useRef<SVGGElement>(null)
  const leftGroupRef = useRef<SVGGElement>(null)
  const cursorXRef = useRef<SVGLineElement>(null)
  const cursorYRef = useRef<SVGLineElement>(null)

  const ticksX = useMemo(() => rulerTicks(docWidth, zoom), [docWidth, zoom])
  const ticksY = useMemo(() => rulerTicks(docHeight, zoom), [docHeight, zoom])

  // O deslocamento: onde o canto do conteúdo está em relação a cada régua. Muda com a
  // rolagem, com o zoom (o papel muda de tamanho e o `safe center` o move: o observador no
  // CONTEÚDO cobre) e com o tamanho da área (janela, painéis: o observador na div rolável).
  // Tudo por ref, nada por estado.
  useLayoutEffect(() => {
    if (!enabled) return
    const stage = stageRef.current
    if (!stage) return
    const update = (): void => {
      const content = contentRef.current
      const top = topRef.current
      const left = leftRef.current
      if (!content || !top || !left) return
      const c = content.getBoundingClientRect()
      const t = top.getBoundingClientRect()
      const l = left.getBoundingClientRect()
      topGroupRef.current?.setAttribute('transform', `translate(${c.left - t.left} 0)`)
      leftGroupRef.current?.setAttribute('transform', `translate(0 ${c.top - l.top})`)
    }
    update()
    stage.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    resize?.observe(stage)
    if (contentRef.current) resize?.observe(contentRef.current)
    return () => {
      stage.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      resize?.disconnect()
    }
  }, [enabled, stageRef, contentRef])

  // O risquinho da posição do cursor, na régua de cima e na da esquerda.
  useLayoutEffect(() => {
    if (!enabled) return
    const stage = stageRef.current
    if (!stage) return
    const move = (event: PointerEvent): void => {
      const top = topRef.current
      const left = leftRef.current
      if (!top || !left) return
      const t = top.getBoundingClientRect()
      const l = left.getBoundingClientRect()
      cursorXRef.current?.setAttribute('transform', `translate(${event.clientX - t.left} 0)`)
      cursorXRef.current?.setAttribute('visibility', 'visible')
      cursorYRef.current?.setAttribute('transform', `translate(0 ${event.clientY - l.top})`)
      cursorYRef.current?.setAttribute('visibility', 'visible')
    }
    const leave = (): void => {
      cursorXRef.current?.setAttribute('visibility', 'hidden')
      cursorYRef.current?.setAttribute('visibility', 'hidden')
    }
    stage.addEventListener('pointermove', move, { passive: true })
    stage.addEventListener('pointerleave', leave)
    return () => {
      stage.removeEventListener('pointermove', move)
      stage.removeEventListener('pointerleave', leave)
    }
  }, [enabled, stageRef])

  if (!enabled) return <div className={CELL_CLASS}>{children}</div>

  const interactive = onRulerPointerDown !== undefined
  return (
    <div className="pin-rulers grid h-full min-h-0 min-w-0 flex-1">
      <div aria-hidden="true" className="pin-ruler pin-ruler--corner" />
      <svg
        ref={topRef}
        aria-hidden="true"
        data-stage-ruler="x"
        className="pin-ruler pin-ruler--x block"
        style={interactive ? { cursor: 'row-resize' } : undefined}
        onPointerDown={interactive ? (event) => onRulerPointerDown('y', event) : undefined}
      >
        <g ref={topGroupRef}>
          {ticksX.map((tick) => (
            <g key={tick.pos}>
              <line
                x1={tick.pos * zoom}
                x2={tick.pos * zoom}
                y1={tick.major ? RULER_PX * 0.4 : RULER_PX * 0.7}
                y2={RULER_PX}
              />
              {tick.label !== undefined ? (
                <text data-ruler-label={tick.label} x={tick.pos * zoom + 3} y={RULER_PX * 0.45}>
                  {tick.label}
                </text>
              ) : null}
            </g>
          ))}
        </g>
        <line
          ref={cursorXRef}
          className="pin-ruler__cursor"
          x1={0}
          x2={0}
          y1={0}
          y2={RULER_PX}
          visibility="hidden"
        />
      </svg>
      <svg
        ref={leftRef}
        aria-hidden="true"
        data-stage-ruler="y"
        className="pin-ruler pin-ruler--y block"
        style={interactive ? { cursor: 'col-resize' } : undefined}
        onPointerDown={interactive ? (event) => onRulerPointerDown('x', event) : undefined}
      >
        <g ref={leftGroupRef}>
          {ticksY.map((tick) => (
            <g key={tick.pos}>
              <line
                y1={tick.pos * zoom}
                y2={tick.pos * zoom}
                x1={tick.major ? RULER_PX * 0.4 : RULER_PX * 0.7}
                x2={RULER_PX}
              />
              {tick.label !== undefined ? (
                <text data-ruler-label={tick.label} x={2} y={tick.pos * zoom + RULER_PX * 0.4}>
                  {tick.label}
                </text>
              ) : null}
            </g>
          ))}
        </g>
        <line
          ref={cursorYRef}
          className="pin-ruler__cursor"
          x1={0}
          x2={RULER_PX}
          y1={0}
          y2={0}
          visibility="hidden"
        />
      </svg>
      <div className={CELL_CLASS}>{children}</div>
    </div>
  )
}

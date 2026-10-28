import { useEffect, useRef, useState } from 'react'
import { useJogo } from '../estado/contexto'

/** Controles de toque (tablet e celular): o joystick anda; os botões pulam e usam. */
export function ControlesDeToque() {
  const { controle } = useJogo()
  const [toque, setToque] = useState(false)
  const base = useRef<HTMLDivElement>(null)
  const bolinha = useRef<HTMLElement>(null)

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    setToque(mq.matches)
    const muda = () => setToque(mq.matches)
    mq.addEventListener('change', muda)
    return () => mq.removeEventListener('change', muda)
  }, [])

  if (!toque) return null

  const mover = (e: React.PointerEvent) => {
    const el = base.current
    if (!el) return
    const r = el.getBoundingClientRect()
    let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)
    let dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
    const t = Math.hypot(dx, dy)
    if (t > 1) {
      dx /= t
      dy /= t
    }
    controle.eixoX = dx
    controle.eixoZ = -dy
    controle.correr = t > 0.95
    if (bolinha.current) bolinha.current.style.transform = `translate(${dx * 34}px, ${dy * 34}px)`
  }
  const soltar = () => {
    controle.eixoX = 0
    controle.eixoZ = 0
    controle.correr = false
    if (bolinha.current) bolinha.current.style.transform = ''
  }

  return (
    <>
      <div
        ref={base}
        className="arq-joystick"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          mover(e)
        }}
        onPointerMove={(e) => {
          if (e.buttons || e.pointerType === 'touch') mover(e)
        }}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        aria-hidden="true"
      >
        <i ref={bolinha} />
      </div>
      <div className="arq-botoes-toque">
        <button
          type="button"
          className="arq-botao"
          onPointerDown={() => {
            controle.pular = true
          }}
          onPointerUp={() => {
            controle.pular = false
          }}
          onPointerLeave={() => {
            controle.pular = false
          }}
        >
          Pular
        </button>
        <button type="button" className="arq-botao leve" onClick={() => controle.usar++}>
          Usar
        </button>
      </div>
    </>
  )
}

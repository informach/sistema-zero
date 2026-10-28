import { useRef } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { useToque } from '../estado/preferencias'

/** Do meio do joystick até o fim do curso, em pixels na tela. */
const RAIO_DO_JOYSTICK = 60

/**
 * Controles de toque (tablet e celular): o joystick anda; os botões pulam e usam. No cipó o
 * botão de pular vira "Soltar".
 */
export function ControlesDeToque() {
  const { controle } = useJogo()
  const toque = useToque()
  const modo = useEstado((s) => s.modo)
  const zona = useRef<HTMLDivElement>(null)
  const anel = useRef<HTMLDivElement>(null)
  const bolinha = useRef<HTMLElement>(null)
  /** Onde o polegar pousou (o meio do joystick enquanto ele segura), na tela. */
  const centro = useRef<{ x: number; y: number } | null>(null)

  if (!toque) return null

  const mover = (e: React.PointerEvent) => {
    const c = centro.current
    if (!c) return
    let dx = (e.clientX - c.x) / RAIO_DO_JOYSTICK
    let dy = (e.clientY - c.y) / RAIO_DO_JOYSTICK
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
    centro.current = null
    controle.eixoX = 0
    controle.eixoZ = 0
    controle.correr = false
    if (bolinha.current) bolinha.current.style.transform = ''
    // O anel volta para o lugar de descanso (o canto, onde a pessoa espera encontrar).
    if (anel.current) {
      anel.current.style.left = ''
      anel.current.style.top = ''
      anel.current.removeAttribute('data-ativo')
    }
  }

  return (
    <>
      {/* Joystick flutuante: nasce onde o polegar toca na metade esquerda de baixo, sem precisar
          achar um lugar fixo; arrastar no resto da tela gira a câmera. */}
      <div
        ref={zona}
        className="arq-zona-joystick"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          centro.current = { x: e.clientX, y: e.clientY }
          const r = zona.current?.getBoundingClientRect()
          if (anel.current && r) {
            anel.current.style.left = `${e.clientX - r.left}px`
            anel.current.style.top = `${e.clientY - r.top}px`
            anel.current.setAttribute('data-ativo', '')
          }
          mover(e)
        }}
        onPointerMove={(e) => {
          if (e.buttons || e.pointerType === 'touch') mover(e)
        }}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        aria-hidden="true"
      >
        <div ref={anel} className="arq-joystick">
          <i ref={bolinha} />
        </div>
      </div>
      <div className="arq-botoes-toque">
        <button
          type="button"
          className="arq-botao"
          onPointerDown={() => {
            controle.pular = true
            controle.pulos++
          }}
          onPointerUp={() => {
            controle.pular = false
          }}
          onPointerLeave={() => {
            controle.pular = false
          }}
        >
          {modo === 'cipo' ? 'Soltar' : 'Pular'}
        </button>
        <button type="button" className="arq-botao leve" onClick={() => controle.usar++}>
          Usar
        </button>
      </div>
    </>
  )
}

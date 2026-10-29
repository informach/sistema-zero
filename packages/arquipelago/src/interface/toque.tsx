import { useCallback, useEffect, useRef } from 'react'
import { atualizarEntrada, soltarEntrada } from '../controles/controle'
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
  const noBarco = modo === 'barco'
  const zona = useRef<HTMLDivElement>(null)
  const anel = useRef<HTMLDivElement>(null)
  const bolinha = useRef<HTMLElement>(null)
  /** Onde o polegar pousou (o meio do joystick enquanto ele segura), na tela. */
  const centro = useRef<{ x: number; y: number; pointerId: number } | null>(null)
  const pulo = useRef<number | null>(null)
  const soltar = useCallback(() => {
    centro.current = null
    atualizarEntrada(controle, 'toque', { eixoX: 0, eixoZ: 0, correr: false })
    if (bolinha.current) bolinha.current.style.transform = ''
    if (anel.current) {
      anel.current.style.left = ''
      anel.current.style.top = ''
      anel.current.removeAttribute('data-ativo')
    }
  }, [controle])
  useEffect(() => {
    const limpar = () => {
      soltar()
      pulo.current = null
      soltarEntrada(controle, 'toque')
    }
    if (!toque || noBarco) {
      limpar()
      return
    }
    window.addEventListener('blur', limpar)
    return () => {
      window.removeEventListener('blur', limpar)
      limpar()
    }
  }, [controle, soltar, toque, noBarco])
  // O "Descer" só existe no mergulho: se o modo muda com o dedo nele, o botão some sem o
  // `pointerup`, e o pedido de descer ficaria preso até o próximo mergulho.
  const mergulhando = modo === 'mergulho'
  useEffect(() => {
    if (!mergulhando) atualizarEntrada(controle, 'toque', { descer: false })
  }, [controle, mergulhando])

  if (!toque || noBarco) return null

  const mover = (e: React.PointerEvent) => {
    const c = centro.current
    if (!c || c.pointerId !== e.pointerId) return
    let dx = (e.clientX - c.x) / RAIO_DO_JOYSTICK
    let dy = (e.clientY - c.y) / RAIO_DO_JOYSTICK
    const t = Math.hypot(dx, dy)
    if (t > 1) {
      dx /= t
      dy /= t
    }
    atualizarEntrada(controle, 'toque', { eixoX: dx, eixoZ: -dy, correr: t > 0.95 })
    if (bolinha.current) bolinha.current.style.transform = `translate(${dx * 34}px, ${dy * 34}px)`
  }
  const soltarPonteiro = (e: React.PointerEvent) => {
    if (centro.current?.pointerId === e.pointerId) soltar()
  }
  const soltarPulo = (e: React.PointerEvent) => {
    if (pulo.current !== e.pointerId) return
    pulo.current = null
    atualizarEntrada(controle, 'toque', { pular: false })
  }

  return (
    <>
      {/* Joystick flutuante: nasce onde o polegar toca na metade esquerda de baixo, sem precisar
          achar um lugar fixo; arrastar no resto da tela gira a câmera. */}
      <div
        ref={zona}
        className="arq-zona-joystick"
        onPointerDown={(e) => {
          if (centro.current !== null) return
          e.currentTarget.setPointerCapture(e.pointerId)
          centro.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId }
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
        onPointerUp={soltarPonteiro}
        onPointerCancel={soltarPonteiro}
        onLostPointerCapture={soltarPonteiro}
        aria-hidden="true"
      >
        <div ref={anel} className="arq-joystick">
          <i ref={bolinha} />
        </div>
      </div>
      <div className="arq-botoes-toque">
        {mergulhando && (
          <button
            type="button"
            className="arq-botao"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              atualizarEntrada(controle, 'toque', { descer: true })
            }}
            onPointerUp={() => atualizarEntrada(controle, 'toque', { descer: false })}
            onPointerCancel={() => atualizarEntrada(controle, 'toque', { descer: false })}
            onLostPointerCapture={() => atualizarEntrada(controle, 'toque', { descer: false })}
          >
            Descer
          </button>
        )}
        <button
          type="button"
          className="arq-botao"
          onPointerDown={(e) => {
            if (pulo.current !== null) return
            pulo.current = e.pointerId
            e.currentTarget.setPointerCapture(e.pointerId)
            atualizarEntrada(controle, 'toque', { pular: true })
            controle.pulos++
          }}
          onPointerUp={soltarPulo}
          onPointerCancel={soltarPulo}
          onLostPointerCapture={soltarPulo}
        >
          {modo === 'mergulho' || modo === 'balao'
            ? 'Subir'
            : modo === 'cipo'
              ? 'Soltar'
              : modo === 'planar'
                ? 'Fechar'
                : 'Pular'}
        </button>
        <button type="button" className="arq-botao leve" onClick={() => controle.usar++}>
          Usar
        </button>
      </div>
    </>
  )
}

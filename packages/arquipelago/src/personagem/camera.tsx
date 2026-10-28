import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { MathUtils, Vector3 } from 'three'
import { useEstado, useJogo } from '../estado/contexto'
import { alturaDaIlha } from '../mundo/medidas'

/**
 * Câmera em terceira pessoa. Arrastar (mouse ou dedo fora dos botões) gira em volta do
 * avatar; a roda aproxima. Dentro de casa ela sobe e chega mais perto, para ver o quarto todo.
 */
export function Camera() {
  const { rastro } = useJogo()
  const dentro = useEstado((s) => s.dentroDeCasa)
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const distancia = useRef(9)
  const alvo = useRef(new Vector3())
  const desejada = useRef(new Vector3())

  useEffect(() => {
    const el = gl.domElement
    let arrastando: number | null = null
    let ultimoX = 0
    let ultimoY = 0
    const desce = (e: PointerEvent) => {
      arrastando = e.pointerId
      ultimoX = e.clientX
      ultimoY = e.clientY
      el.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      if (arrastando !== e.pointerId) return
      rastro.giro -= (e.clientX - ultimoX) * 0.006
      rastro.inclinacao = MathUtils.clamp(
        rastro.inclinacao + (e.clientY - ultimoY) * 0.004,
        0.12,
        1.25,
      )
      ultimoX = e.clientX
      ultimoY = e.clientY
    }
    const sobe = (e: PointerEvent) => {
      if (arrastando === e.pointerId) arrastando = null
    }
    const roda = (e: WheelEvent) => {
      e.preventDefault()
      distancia.current = MathUtils.clamp(distancia.current + e.deltaY * 0.01, 4, 18)
    }
    el.addEventListener('pointerdown', desce)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', sobe)
    el.addEventListener('pointercancel', sobe)
    el.addEventListener('wheel', roda, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', desce)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', sobe)
      el.removeEventListener('pointercancel', sobe)
      el.removeEventListener('wheel', roda)
    }
  }, [gl, rastro])

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 6)
    alvo.current.lerp({ x: rastro.x, y: rastro.y + 0.9, z: rastro.z } as Vector3, k)
    const inclinacao = dentro ? Math.max(rastro.inclinacao, 0.95) : rastro.inclinacao
    const dist = dentro ? Math.min(distancia.current, 8) : distancia.current
    const horizontal = Math.cos(inclinacao) * dist
    desejada.current.set(
      alvo.current.x + Math.sin(rastro.giro) * horizontal,
      alvo.current.y + Math.sin(inclinacao) * dist,
      alvo.current.z + Math.cos(rastro.giro) * horizontal,
    )
    // Não entra no chão.
    const chao = alturaDaIlha(desejada.current.x, desejada.current.z) + 0.6
    if (desejada.current.y < chao) desejada.current.y = chao
    camera.position.lerp(desejada.current, k)
    camera.lookAt(alvo.current)
  })
  return null
}

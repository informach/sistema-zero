import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { useJogo } from '../estado/contexto'
import { cameraDaFoto } from '../estado/foto'
import { capturarQuadro } from '../sistemas/modo-foto'

/**
 * Dentro do `<Canvas>`: registra como tirar a foto do modo foto (fase2-09). O quadro é desenhado e
 * lido na mesma chamada (`capturarQuadro`), sem ligar `preserveDrawingBuffer` no jogo todo.
 */
export function CameraDaFoto() {
  const { loja } = useJogo()
  const gl = useThree((s) => s.gl)
  const cena = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    const registro = cameraDaFoto(loja)
    const capturar = () => capturarQuadro(gl, cena, camera)
    registro.capturar = capturar
    return () => {
      if (registro.capturar === capturar) registro.capturar = null
    }
  }, [loja, gl, cena, camera])
  return null
}

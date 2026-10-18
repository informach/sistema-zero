import type { RootState } from '@react-three/fiber'

/**
 * Recuperação de contexto WebGL para um `<Canvas>` do react-three-fiber. Em tablets/celulares
 * (o público kids) o navegador descarta o contexto WebGL sob pressão de memória ou ao voltar de
 * segundo plano. Por padrão a cena fica PRETA/congelada pra sempre, sem erro nem fallback.
 *
 * `preventDefault()` no `webglcontextlost` sinaliza ao navegador que queremos restaurar; quando o
 * `webglcontextrestored` dispara, o three reinicializa o contexto e um `invalidate()` força o
 * redesenho (no-op inofensivo quando `frameloop="always"`). Os listeners morrem junto com o
 * canvas (sem vazamento). Use em `onCreated`.
 */
export function recoverWebGLContext({ gl, invalidate }: RootState) {
  const canvas = gl.domElement
  canvas.addEventListener('webglcontextlost', (e) => e.preventDefault(), false)
  canvas.addEventListener('webglcontextrestored', () => invalidate(), false)
}

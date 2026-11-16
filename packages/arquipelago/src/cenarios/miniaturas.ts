import type { ModeloDeCatalogo } from '@sistemazero/molda-cenarios-core'
import {
  Box3,
  Color,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three'
import { carregarArteDeCenario } from './arte'

let renderer: WebGLRenderer | null = null,
  fila = Promise.resolve()
/** Uma única GPU auxiliar, fila limitada pelo viewport da biblioteca e cancelamento por cartão. */
export function miniatura(m: ModeloDeCatalogo, url: string, sinal: AbortSignal): Promise<Blob> {
  const tarefa = fila.then(async () => {
    sinal.throwIfAborted()
    if (!renderer) {
      renderer = new WebGLRenderer({ alpha: true, antialias: true })
      renderer.setSize(256, 256, false)
      renderer.setClearColor(new Color('#f8f5ee'), 1)
    }
    const gl = renderer,
      arte = await carregarArteDeCenario([m], new Set([m.id]), () => url, sinal)
    try {
      const cena = new Scene(),
        objeto = arte.modelos.get(m.id)!.scene
      objeto.updateMatrixWorld(true)
      const box = new Box3().setFromObject(objeto),
        centro = box.getCenter(new Vector3()),
        tamanho = box.getSize(new Vector3()),
        dist = Math.max(tamanho.x, tamanho.y, tamanho.z) * 1.7
      const camera = new PerspectiveCamera(40, 1, 0.01, Math.max(100, dist * 5))
      camera.position.copy(centro).add(new Vector3(dist * 0.65, dist * 0.45, dist))
      camera.lookAt(centro)
      cena.add(objeto, new HemisphereLight('#fff8e8', '#6b8061', 2))
      const sol = new DirectionalLight('#fff4df', 2)
      sol.position.set(5, 10, 6)
      cena.add(sol)
      await gl.compileAsync(cena, camera)
      sinal.throwIfAborted()
      gl.render(cena, camera)
      return await new Promise<Blob>((resolve, reject) =>
        gl.domElement.toBlob(
          (b) => (b ? resolve(b) : reject(Error('Falha ao gerar miniatura'))),
          'image/png',
        ),
      )
    } finally {
      arte.soltar()
      await new Promise((r) => requestAnimationFrame(r))
    }
  })
  fila = tarefa.then(
    () => {},
    () => {},
  )
  return tarefa
}
export function liberarMiniaturas() {
  fila.finally(() => {
    renderer?.dispose()
    renderer = null
  })
}

import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  type BufferGeometry,
  CircleGeometry,
  type InstancedMesh,
  MeshBasicMaterial,
  Object3D,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { FORMA_DA_PEGADA, type PegadaNoChao, RASTRO, type TipoDePegada } from '../sistemas/pegadas'

/** Um pouco acima do chão, para a pegada não brigar com a grama (com `polygonOffset` também). */
const ACIMA_DO_CHAO = 0.02

const material = new MeshBasicMaterial({
  color: '#4a2e18',
  transparent: true,
  opacity: 0.75,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
})

/**
 * Uma pegada deitada no chão, das elipses de `FORMA_DA_PEGADA` (o quadro de 64 do SVG, com o y
 * para baixo): a ponta dos dedos fica para −z, e o giro de cada pegada a vira para o esconderijo.
 */
function geometriaDaPegada(bicho: TipoDePegada, tamanho: number): BufferGeometry {
  const escala = tamanho / 64
  const partes = FORMA_DA_PEGADA[bicho].map((e) => {
    const g = new CircleGeometry(1, 14)
    g.scale(e.rx, e.ry, 1)
    g.rotateZ((-(e.giro ?? 0) * Math.PI) / 180)
    g.translate(e.x - 32, 32 - e.y, 0)
    g.scale(escala, escala, escala)
    return g
  })
  const junta = mergeGeometries(partes) ?? new CircleGeometry(tamanho / 2, 14)
  for (const p of partes) p.dispose()
  junta.rotateX(-Math.PI / 2)
  return junta
}

const auxiliar = new Object3D()

/**
 * O rastro de pegadas de um bicho ainda escondido (`rastroAteOEsconderijo`), no chão do Bosque:
 * uma malha instanciada só, que some quando ele é achado.
 */
export function RastroDePegadas({
  bicho,
  pegadas,
  y,
  tamanho = RASTRO.tamanho,
}: {
  bicho: TipoDePegada
  pegadas: readonly PegadaNoChao[]
  y: number
  tamanho?: number
}) {
  const malha = useRef<InstancedMesh>(null)
  const geometria = useMemo(() => geometriaDaPegada(bicho, tamanho), [bicho, tamanho])
  useLayoutEffect(() => () => geometria.dispose(), [geometria])

  useLayoutEffect(() => {
    const m = malha.current
    if (!m) return
    pegadas.forEach((p, i) => {
      auxiliar.position.set(p.x, y + ACIMA_DO_CHAO, p.z)
      // A ponta (−z da geometria) vai para (sin g, cos g): girar meia volta a mais.
      auxiliar.rotation.set(0, p.giro + Math.PI, 0)
      auxiliar.updateMatrix()
      m.setMatrixAt(i, auxiliar.matrix)
    })
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  }, [pegadas, y])

  return (
    <instancedMesh
      ref={malha}
      args={[geometria, material, pegadas.length]}
      renderOrder={1}
      name={`rastro-${bicho}`}
    />
  )
}

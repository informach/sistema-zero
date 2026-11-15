import { RigidBody, TrimeshCollider } from '@react-three/rapier'
import { useEffect, useMemo } from 'react'
import { type BufferGeometry, Matrix4, type Mesh, Vector3 } from 'three'
import { pisoDaFaisca } from '../../sistemas/assentamento-da-faisca'
import {
  EIXO_DO_PISO,
  INICIO_DO_PISO,
  PISOS_DO_REFINO,
  type PisoDaFaisca,
} from '../../sistemas/refino-da-faisca'
import type { ArteDoPiloto } from './carregar-piloto'

/** O piso usa a mesma geometria conformada na imagem e na colisão, mantendo UV/material do GLB. */
export function PisosDeCatalogo({ arte, piso }: { arte: ArteDoPiloto; piso: PisoDaFaisca }) {
  const partes = useMemo(() => {
    const glb = arte.modelos.get(PISOS_DO_REFINO[piso])!
    const partes: {
      geo: BufferGeometry
      material: Mesh['material']
      vertices: Float32Array
      indices: Uint32Array
    }[] = []
    glb.scene.updateMatrixWorld(true)
    for (let copia = 0; copia < 3; copia++)
      glb.scene.traverse((o) => {
        const mesh = o as Mesh
        if (!mesh.isMesh) return
        const geo = mesh.geometry.clone(),
          pos = geo.getAttribute('position'),
          normal = geo.getAttribute('normal')
        let topoMin = Infinity
        for (let i = 0; i < pos.count; i++)
          if (!normal || normal.getY(i) > 0.65) topoMin = Math.min(topoMin, pos.getY(i))
        if (!Number.isFinite(topoMin)) throw Error('O caminho não tem piso superior')
        const m = new Matrix4().makeRotationY(EIXO_DO_PISO.giro),
          v = new Vector3()
        m.setPosition(
          INICIO_DO_PISO.x + (3.5 + copia * 7) * Math.cos(EIXO_DO_PISO.giro),
          0,
          INICIO_DO_PISO.z - (3.5 + copia * 7) * Math.sin(EIXO_DO_PISO.giro),
        )
        m.multiply(mesh.matrixWorld)
        for (let i = 0; i < pos.count; i++) {
          const localX = pos.getX(i),
            y = pos.getY(i)
          v.fromBufferAttribute(pos, i).applyMatrix4(m)
          const t = localX + 3.5 + copia * 7,
            ponta = Math.max(0, Math.min(1, t / 0.8, (21 - t) / 0.8))
          const perfil = (y - topoMin + 0.025) * ponta
          pos.setXYZ(i, v.x, pisoDaFaisca(v.x, v.z) + perfil, v.z)
        }
        geo.morphAttributes = {}
        geo.computeVertexNormals()
        geo.computeBoundingBox()
        geo.computeBoundingSphere()
        const vertices = new Float32Array(pos.array),
          indices = geo.index
            ? new Uint32Array(geo.index.array)
            : Uint32Array.from({ length: pos.count }, (_, i) => i)
        partes.push({ geo, material: mesh.material, vertices, indices })
      })
    return partes
  }, [arte, piso])
  useEffect(
    () => () => {
      for (const p of partes) p.geo.dispose()
    },
    [partes],
  )
  return (
    <RigidBody type="fixed" colliders={false}>
      {partes.map((p) => (
        <group key={p.geo.uuid}>
          <mesh geometry={p.geo} material={p.material} receiveShadow dispose={null} />
          <TrimeshCollider args={[p.vertices, p.indices]} />
        </group>
      ))}
    </RigidBody>
  )
}

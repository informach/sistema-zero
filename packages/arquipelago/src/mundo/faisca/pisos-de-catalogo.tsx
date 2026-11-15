import { RigidBody, TrimeshCollider } from '@react-three/rapier'
import { useEffect, useMemo } from 'react'
import { type BufferGeometry, Matrix4, type Mesh, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { ilhaDoArquipelago } from '../../sistemas/geografia-do-arquipelago'
import { passeiosDaFaisca } from '../../sistemas/passeios-da-faisca'
import type { PisoDaFaisca } from '../../sistemas/refino-da-faisca'
import { alturaNaMalhaDoSetor } from '../../sistemas/setores-do-arquipelago'
import { TRIANGULOS_DA_PRACA } from '../../sistemas/solo-da-praca'
import type { ArteDoPiloto } from './carregar-piloto'
import { recortarMalha } from './recortar-malha'

/** Rede do trecho piloto: juntas recortadas de verdade e a mesma malha no desenho/Rapier. */
export function PisosDeCatalogo({ arte, piso }: { arte: ArteDoPiloto; piso: PisoDaFaisca }) {
  const partes = useMemo(() => {
    const rede = passeiosDaFaisca(piso)
    const partes: {
      geo: BufferGeometry
      material: Mesh['material']
      vertices: Float32Array
      indices: Uint32Array
    }[] = []
    const ocupados: (readonly { x: number; z: number }[])[] = [...TRIANGULOS_DA_PRACA]
    let referencia = Infinity
    for (const id of new Set(rede.map((p) => p.modelo))) {
      const glb = arte.modelos.get(id)!
      if (!glb) throw Error(`Módulo de piso não carregado: ${id}`)
      glb.scene.updateMatrixWorld(true)
      glb.scene.traverse((o) => {
        const m = o as Mesh
        if (!m.isMesh) return
        const p = m.geometry.getAttribute('position'),
          n = m.geometry.getAttribute('normal')
        for (let i = 0; i < p.count; i++)
          if (!n || n.getY(i) > 0.65) referencia = Math.min(referencia, p.getY(i))
      })
    }
    if (!Number.isFinite(referencia)) throw Error('Piso sem face superior')
    const ilha = ilhaDoArquipelago('sua-ilha')
    for (const modulo of rede)
      arte.modelos.get(modulo.modelo)!.scene.traverse((o) => {
        const mesh = o as Mesh
        if (!mesh.isMesh) return
        const local = recortarMalha(mesh.geometry, modulo.planos),
          m = new Matrix4().makeRotationY(modulo.giro)
        m.setPosition(modulo.x, 0, modulo.z)
        m.multiply(mesh.matrixWorld)
        local.applyMatrix4(m)
        const geo = recortarMalha(local, [], ocupados)
        local.dispose()
        const pos = geo.getAttribute('position'),
          v = new Vector3()
        if (pos.count === 0) {
          geo.dispose()
          return
        }
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i)
          pos.setY(i, alturaNaMalhaDoSetor(ilha, v.x, v.z) + v.y - referencia + 0.025)
        }
        geo.computeVertexNormals()
        geo.computeBoundingBox()
        geo.computeBoundingSphere()
        for (let i = 0; i < pos.count; i += 3) {
          const ax = pos.getX(i),
            az = pos.getZ(i),
            bx = pos.getX(i + 1),
            bz = pos.getZ(i + 1),
            cx = pos.getX(i + 2),
            cz = pos.getZ(i + 2)
          if ((bz - az) * (cx - ax) - (bx - ax) * (cz - az) > 1e-7)
            ocupados.push([
              { x: ax, z: az },
              { x: bx, z: bz },
              { x: cx, z: cz },
            ])
        }
        partes.push({
          geo,
          material: mesh.material,
          vertices: new Float32Array(pos.array),
          indices: Uint32Array.from({ length: pos.count }, (_, i) => i),
        })
      })
    // Os módulos já estão em coordenadas de mundo. Agrupar por material reduz chamadas
    // sem alterar UV, silhueta ou a geometria compartilhada com a física.
    const grupos = new Map<Mesh['material'], BufferGeometry[]>()
    for (const p of partes) {
      if (!grupos.has(p.material)) grupos.set(p.material, [])
      grupos.get(p.material)!.push(p.geo)
    }
    return [...grupos].map(([material, geometrias]) => {
      const geo = geometrias.length === 1 ? geometrias[0]! : mergeGeometries(geometrias)
      if (!geo) throw Error('Atributos incompatíveis nos módulos de passeio')
      if (geometrias.length > 1) for (const g of geometrias) g.dispose()
      geo.computeBoundingBox()
      geo.computeBoundingSphere()
      const pos = geo.getAttribute('position')
      return {
        geo,
        material,
        vertices: new Float32Array(pos.array),
        indices: Uint32Array.from({ length: pos.count }, (_, i) => i),
      }
    })
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

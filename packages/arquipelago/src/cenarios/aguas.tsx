// biome-ignore-all lint/a11y/noStaticElementInteractions: Objetos Three.js; os mesmos controles existem no painel de água.
import { RigidBody, TrimeshCollider } from '@react-three/rapier'
import type { DocumentoDeCenario } from '@sistemazero/molda-cenarios-core'
import { useEffect, useMemo } from 'react'
import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  type Mesh,
  ShapeUtils,
  Vector2,
  Vector3,
} from 'three'
import { ARTE_DA_FAISCA } from '../mundo/faisca/arte.generated'
import { estadoHerdado } from './apoio'
import type { ArteDeCenario } from './arte'
import { geometriaDaBacia } from './bacia'

function Agua({
  a,
  arte,
  escolher,
  altura,
}: {
  a: DocumentoDeCenario['aguas'][number]
  arte: ArteDeCenario
  escolher: (id: string) => void
  altura: (x: number, z: number) => number
}) {
  const preparada = useMemo(() => {
    const g = a.modelo ? arte.modelos.get(a.modelo) : null
    if (!g) {
      const ps = a.contorno.map((p) => new Vector2(p.x, p.z)),
        faces = ShapeUtils.triangulateShape(ps, []),
        geo = new BufferGeometry()
      geo.setAttribute(
        'position',
        new Float32BufferAttribute(
          a.contorno.flatMap((p) => [p.x, 0, p.z]),
          3,
        ),
      )
      geo.setIndex(faces.flatMap((f) => [f[0]!, f[2]!, f[1]!]))
      geo.computeVertexNormals()
      const bacia = geometriaDaBacia(a, altura)
      return {
        raiz: null,
        geo,
        bacia: bacia.geo,
        nivel: 0,
        colisores: [{ id: 'bacia', vertices: bacia.vertices, indices: bacia.indices }],
      }
    }
    const raiz = g.scene.clone(true),
      colisores: { id: string; vertices: Float32Array; indices: Uint32Array }[] = []
    raiz.updateMatrixWorld(true)
    let nivel = -Infinity
    raiz.traverse((o) => {
      const m = o as Mesh
      if (!m.isMesh) return
      const materiais = Array.isArray(m.material) ? m.material : [m.material],
        nomes = materiais.map((m) => m.name),
        attr = m.geometry.getAttribute('position'),
        v = new Vector3()
      const vertices = new Float32Array(attr.count * 3)
      for (let i = 0; i < attr.count; i++) {
        v.fromBufferAttribute(attr, i).applyMatrix4(m.matrixWorld)
        vertices.set(v.toArray(), i * 3)
        if (nomes.includes('agua')) nivel = Math.max(nivel, v.y)
      }
      if (nomes.some((n) => n === 'cor' || n === 'cor_2'))
        colisores.push({
          id: m.uuid,
          vertices,
          indices: m.geometry.index
            ? new Uint32Array(m.geometry.index.array)
            : Uint32Array.from({ length: attr.count }, (_, i) => i),
        })
      m.receiveShadow = true
    })
    // Os metadados de fabricação têm o nível de referência sem a ondulação do modelo.
    const referencia = Object.values(ARTE_DA_FAISCA.pecas).find(
      (m) => 'lago' in m && g.scene.userData.digest === m.digest,
    )
    if (referencia && 'lago' in referencia && referencia.lago) nivel = referencia.lago.nivel
    if (!Number.isFinite(nivel)) throw Error('Modelo de lago sem superfície de água identificável')
    return { raiz, geo: null, bacia: null, nivel, colisores }
  }, [a, arte, altura])
  useEffect(
    () => () => {
      preparada.geo?.dispose()
      preparada.bacia?.dispose()
    },
    [preparada],
  )
  const y = a.nivel - preparada.nivel * a.escala
  return (
    <RigidBody
      type="fixed"
      colliders={false}
      position={[a.centro.x, y, a.centro.z]}
      rotation={[0, a.giro, 0]}
      scale={a.escala}
    >
      <group
        onClick={(e) => {
          e.stopPropagation()
          escolher(a.id)
        }}
      >
        {preparada.raiz ? (
          <primitive object={preparada.raiz} dispose={null} />
        ) : (
          <mesh geometry={preparada.geo!}>
            <meshStandardMaterial color="#69b5b8" roughness={0.35} transparent opacity={0.9} />
          </mesh>
        )}
      </group>
      {preparada.bacia && (
        <mesh geometry={preparada.bacia} receiveShadow dispose={null}>
          <meshStandardMaterial color="#9a8b68" roughness={1} side={DoubleSide} />
        </mesh>
      )}
      {preparada.colisores.map((m) => (
        <TrimeshCollider key={m.id} args={[m.vertices, m.indices]} />
      ))}
    </RigidBody>
  )
}
export function AguasDoCenario({
  doc,
  arte,
  escolher,
  altura,
}: {
  doc: DocumentoDeCenario
  arte: ArteDeCenario
  escolher: (id: string) => void
  altura: (x: number, z: number) => number
}) {
  return doc.aguas
    .filter((a) => !estadoHerdado(doc, a).oculto)
    .map((a) => <Agua key={a.id} a={a} arte={arte} escolher={escolher} altura={altura} />)
}

import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import { useMemo } from 'react'
import { BufferAttribute, Color, PlaneGeometry } from 'three'
import { alturaDaIlha, chaoEm, PIER, RAIO_DO_RASO } from './medidas'

const CORES = {
  grama: [new Color('#7dbb5a'), new Color('#6fae4f')],
  areia: [new Color('#e8d6a3'), new Color('#e1cc94')],
  'areia-molhada': [new Color('#c9b37c'), new Color('#bfa970')],
} as const

/** O chão da sua ilha: o mesmo desenho vira a colisão (trimesh). */
function Terreno() {
  const geometria = useMemo(() => {
    const lado = (RAIO_DO_RASO + 4) * 2
    const g = new PlaneGeometry(lado, lado, lado, lado)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position as BufferAttribute
    const cores = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      pos.setY(i, alturaDaIlha(x, z))
      const par = CORES[chaoEm(x, z)]
      const c = par[(Math.floor(x * 0.7) + Math.floor(z * 0.7)) & 1] ?? par[0]
      cores.set([c.r, c.g, c.b], i * 3)
    }
    g.setAttribute('color', new BufferAttribute(cores, 3))
    g.computeVertexNormals()
    return g
  }, [])
  return (
    <RigidBody type="fixed" colliders="trimesh">
      <mesh geometry={geometria}>
        <meshStandardMaterial vertexColors flatShading roughness={1} />
      </mesh>
    </RigidBody>
  )
}

const ARVORES: [number, number, number][] = [
  [-9, 4, 1.2],
  [-14, -3, 1],
  [-16, 6, 1.3],
  [-6, 12, 1.1],
  [6, 14, 1.2],
  [15, 10, 1],
  [17, -10, 1.3],
  [4, -16, 1.1],
  [-4, -17, 1],
  [-19, -6, 1.2],
  [12, 16, 0.9],
  [-12, 15, 1],
]
const VERDES = ['#3f9a4f', '#58b05a', '#2f8a5f', '#6cc46a']

function Arvores() {
  return (
    <>
      {ARVORES.map(([x, z, s], i) => {
        const y = alturaDaIlha(x, z)
        return (
          <group key={`${x},${z}`} position={[x, y, z]} scale={s}>
            <mesh position={[0, 0.9, 0]}>
              <cylinderGeometry args={[0.18, 0.26, 1.8, 6]} />
              <meshStandardMaterial color="#7c5836" flatShading />
            </mesh>
            <mesh position={[0, 2.5, 0]}>
              <icosahedronGeometry args={[1.25, 0]} />
              <meshStandardMaterial color={VERDES[i % 4]} flatShading />
            </mesh>
            <mesh position={[0.55, 2.0, 0.4]}>
              <icosahedronGeometry args={[0.8, 0]} />
              <meshStandardMaterial color={VERDES[(i + 1) % 4]} flatShading />
            </mesh>
            <RigidBody type="fixed" colliders={false}>
              <CylinderCollider args={[0.9, 0.3]} position={[0, 0.9, 0]} />
            </RigidBody>
          </group>
        )
      })}
    </>
  )
}

function Pier() {
  const tabuas = Math.floor(PIER.comprimento / 0.5)
  const y = 0.55
  return (
    <group position={[PIER.x, 0, PIER.z]}>
      {Array.from({ length: tabuas }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: tábuas fixas, a posição é a identidade.
        <mesh key={i} position={[0, y, i * 0.5]}>
          <boxGeometry args={[2, 0.12, 0.42]} />
          <meshStandardMaterial color={i % 2 ? '#a8754a' : '#b98657'} flatShading />
        </mesh>
      ))}
      {[0, 1, 2, 3].map((i) =>
        [-0.95, 0.95].map((x) => (
          <mesh key={`${i}${x}`} position={[x, -0.6, i * (PIER.comprimento / 3)]}>
            <cylinderGeometry args={[0.1, 0.1, 2.6, 6]} />
            <meshStandardMaterial color="#7c5836" />
          </mesh>
        )),
      )}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[1, 0.06, PIER.comprimento / 2]}
          position={[0, y, PIER.comprimento / 2 - 0.25]}
        />
      </RigidBody>
    </group>
  )
}

export function IlhaCentral() {
  return (
    <>
      <Terreno />
      <Arvores />
      <Pier />
    </>
  )
}

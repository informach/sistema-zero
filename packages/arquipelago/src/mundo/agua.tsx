import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { DoubleSide } from 'three'
import { FUNDO_DO_MAR, NIVEL_DA_AGUA } from './medidas'

/** O mar em volta de tudo, e um fundo para ninguém cair para sempre. */
export function Agua() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, NIVEL_DA_AGUA, 0]} renderOrder={1}>
        <circleGeometry args={[700, 64]} />
        <meshStandardMaterial
          side={DoubleSide}
          color="#3aa6c4"
          transparent
          opacity={0.82}
          roughness={0.25}
          metalness={0.05}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FUNDO_DO_MAR - 0.05, 0]}>
        <circleGeometry args={[700, 32]} />
        <meshStandardMaterial color="#2a7a8f" />
      </mesh>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[700, 0.5, 700]} position={[0, FUNDO_DO_MAR - 0.5, 0]} />
      </RigidBody>
    </>
  )
}

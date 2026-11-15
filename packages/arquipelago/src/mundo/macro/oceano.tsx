import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { FUNDO_DO_ARQUIPELAGO, NIVEL_DO_OCEANO } from '../../sistemas/geografia-do-arquipelago'

export const RAIO_DO_OCEANO_MACRO = 3200
/** Água comum de blockout. Não presume portabilidade dos shaders dos packs. */
export function OceanoMacro() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, NIVEL_DO_OCEANO, 0]}>
        <circleGeometry args={[RAIO_DO_OCEANO_MACRO, 96]} />
        <meshStandardMaterial
          color="#6aafb9"
          roughness={0.4}
          transparent
          opacity={0.88}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FUNDO_DO_ARQUIPELAGO - 0.2, 0]}>
        <circleGeometry args={[RAIO_DO_OCEANO_MACRO, 64]} />
        <meshStandardMaterial color="#457e86" />
      </mesh>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[RAIO_DO_OCEANO_MACRO, 0.5, RAIO_DO_OCEANO_MACRO]}
          position={[0, FUNDO_DO_ARQUIPELAGO - 0.7, 0]}
        />
      </RigidBody>
    </>
  )
}

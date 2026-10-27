import { useFrame } from '@react-three/fiber'
import { CylinderCollider, RigidBody } from '@react-three/rapier'
import { useRef } from 'react'
import type { Group, MeshStandardMaterial, PointLight } from 'three'
import { useEstado } from '../estado/contexto'
import { ALTURA_DA_TERRA, FAROL } from './medidas'

/** O Farol fica na sua ilha, ao lado da casa. Apagado até a Lenda (posição 8). */
export function Farol() {
  const aceso = useEstado((s) => s.jornada >= 8)
  const lampada = useRef<MeshStandardMaterial>(null)
  const luz = useRef<PointLight>(null)
  const facho = useRef<Group>(null)
  useFrame((_, dt) => {
    if (facho.current && aceso) facho.current.rotation.y += dt * 0.6
  })
  return (
    <group position={[FAROL.x, ALTURA_DA_TERRA, FAROL.z]}>
      <mesh position={[0, 0.6, 0]}>
        <dodecahedronGeometry args={[2.2, 0]} />
        <meshStandardMaterial color="#8d929c" flatShading />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[0, 2.2 + i * 1.5, 0]}>
          <cylinderGeometry args={[1.0 - i * 0.09, 1.1 - i * 0.09, 1.5, 12]} />
          <meshStandardMaterial
            color={aceso ? (i % 2 ? '#ffffff' : '#e0584f') : i % 2 ? '#c4c8cf' : '#8f949e'}
            flatShading
          />
        </mesh>
      ))}
      <mesh position={[0, 9.9, 0]}>
        <sphereGeometry args={[0.75, 14, 10]} />
        <meshStandardMaterial
          ref={lampada}
          color={aceso ? '#fff3b0' : '#6f7480'}
          emissive={aceso ? '#ffd84f' : '#000000'}
          emissiveIntensity={aceso ? 2.5 : 0}
        />
      </mesh>
      {aceso ? (
        <>
          <pointLight
            ref={luz}
            position={[0, 9.9, 0]}
            intensity={60}
            distance={60}
            color="#ffd27a"
          />
          <group ref={facho} position={[0, 9.9, 0]}>
            <mesh position={[0, 0, 14]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[3, 28, 16, 1, true]} />
              <meshBasicMaterial color="#fff1a8" transparent opacity={0.12} depthWrite={false} />
            </mesh>
          </group>
        </>
      ) : null}
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[5, 1.6]} position={[0, 4, 0]} />
      </RigidBody>
    </group>
  )
}

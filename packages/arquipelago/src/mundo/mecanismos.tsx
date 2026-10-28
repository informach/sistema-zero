import {
  CuboidCollider,
  type RapierRigidBody,
  RigidBody,
  useBeforePhysicsStep,
  useRevoluteJoint,
} from '@react-three/rapier'
import { useEffect, useMemo, useRef } from 'react'
import type { MeshStandardMaterial } from 'three'
import { alvoDoAlcapao, caixaNaPlaca, MECANISMOS } from '../sistemas/mecanismos'
import { GRUPO_SO_DO_CORPO } from './grupos'
export const mecanismosAgora = {
  montado: false,
  placa: false,
  porta: 0,
  alcapao: 0,
  caixaX: 0,
  caixaY: 0,
  caixaZ: 0,
}
/** Dobradiças reais. O chão sob o alçapão continua seguro, sem buraco no percurso. */
export function Mecanismos({
  x,
  y,
  z,
  giro = 0,
}: {
  x: number
  y: number
  z: number
  giro?: number
}) {
  const quadro = useRef<RapierRigidBody>(null!),
    porta = useRef<RapierRigidBody>(null!),
    alcapao = useRef<RapierRigidBody>(null!),
    caixa = useRef<RapierRigidBody>(null!)
  const luz = useRef<MeshStandardMaterial>(null)
  const origem = useMemo(
    () => ({
      x: x + Math.cos(giro) * 0.65 + Math.sin(giro) * 1.3,
      y: y + 0.39,
      z: z - Math.sin(giro) * 0.65 + Math.cos(giro) * 1.3,
    }),
    [x, y, z, giro],
  )
  const zero = useMemo(() => ({ x: 0, y: 0, z: 0 }), [])
  const jp = useRevoluteJoint(quadro, porta, [
    [0, 0.99, 0],
    [-0.55, 0, 0],
    [0, 1, 0],
    [-1.4, 1.4],
  ])
  const ja = useRevoluteJoint(quadro, alcapao, [
    [-0.55, 0.12, 1.2],
    [-0.35, 0, 0],
    [0, 0, 1],
    [0, 1.3],
  ])
  useEffect(() => {
    mecanismosAgora.montado = true
    return () => {
      mecanismosAgora.montado = false
    }
  }, [])
  useBeforePhysicsStep(() => {
    jp.current?.setContactsEnabled(false)
    ja.current?.setContactsEnabled(false)
    jp.current?.configureMotorPosition(0, MECANISMOS.rigidez, MECANISMOS.amortecimento)
    const c = caixa.current
    if (!c) return
    const p = c.translation()
    const dx = p.x - x,
      dz = p.z - z,
      co = Math.cos(giro),
      si = Math.sin(giro)
    const ligado = caixaNaPlaca(dx * co - dz * si, p.y - y, dx * si + dz * co, 0.65, 0.06, 0.4)
    ja.current?.configureMotorPosition(alvoDoAlcapao(ligado), 30, 8)
    if (ligado !== mecanismosAgora.placa) alcapao.current?.wakeUp()
    mecanismosAgora.placa = ligado
    mecanismosAgora.caixaX = p.x
    mecanismosAgora.caixaY = p.y
    mecanismosAgora.caixaZ = p.z
    const rp = porta.current?.rotation(),
      ra = alcapao.current?.rotation()
    if (rp) mecanismosAgora.porta = 2 * Math.atan2(rp.y, rp.w) - giro
    if (ra)
      mecanismosAgora.alcapao =
        2 *
        Math.atan2(
          Math.cos(giro / 2) * ra.z + Math.sin(giro / 2) * ra.x,
          Math.cos(giro / 2) * ra.w + Math.sin(giro / 2) * ra.y,
        )
    if (luz.current) luz.current.color.set(ligado ? '#4b9ee8' : '#d6b56b')
    if (p.y < y - 3) {
      c.setTranslation(origem, true)
      c.setLinvel(zero, true)
      c.setAngvel(zero, true)
    }
  })
  return (
    <group position={[x, y, z]} rotation={[0, giro, 0]}>
      <RigidBody ref={quadro} type="fixed" colliders={false}>
        <mesh position={[-0.08, 0.95, 0]}>
          <boxGeometry args={[0.12, 1.9, 0.18]} />
          <meshStandardMaterial color="#8b6849" />
        </mesh>
        <mesh position={[1.18, 0.95, 0]}>
          <boxGeometry args={[0.12, 1.9, 0.18]} />
          <meshStandardMaterial color="#8b6849" />
        </mesh>
        <CuboidCollider
          collisionGroups={GRUPO_SO_DO_CORPO}
          args={[0.06, 0.95, 0.09]}
          position={[-0.08, 0.95, 0]}
        />
        <CuboidCollider
          collisionGroups={GRUPO_SO_DO_CORPO}
          args={[0.06, 0.95, 0.09]}
          position={[1.18, 0.95, 0]}
        />
      </RigidBody>
      <RigidBody
        ref={porta}
        colliders={false}
        position={[0.55, 0.99, 0]}
        gravityScale={0}
        angularDamping={2}
        canSleep
      >
        <CuboidCollider collisionGroups={GRUPO_SO_DO_CORPO} args={[0.55, 0.89, 0.045]} mass={2} />
        <mesh>
          <boxGeometry args={[1.1, 1.78, 0.09]} />
          <meshStandardMaterial color="#bd8b58" />
        </mesh>
        <mesh position={[0.4, 0, -0.09]}>
          <sphereGeometry args={[0.06, 8, 6]} />
          <meshStandardMaterial color="#e9be5b" />
        </mesh>
      </RigidBody>
      <RigidBody
        ref={alcapao}
        colliders={false}
        position={[-0.2, 0.12, 1.2]}
        gravityScale={0}
        angularDamping={3}
        canSleep
      >
        <CuboidCollider collisionGroups={GRUPO_SO_DO_CORPO} args={[0.35, 0.05, 0.3]} mass={2} />
        <mesh>
          <boxGeometry args={[0.7, 0.1, 0.6]} />
          <meshStandardMaterial color="#a97945" />
        </mesh>
      </RigidBody>
      <RigidBody
        ref={caixa}
        colliders={false}
        position={[0.65, 0.39, 1.3]}
        linearDamping={1}
        angularDamping={2}
        canSleep
      >
        <CuboidCollider
          collisionGroups={GRUPO_SO_DO_CORPO}
          args={[0.25, 0.36, 0.25]}
          mass={1.5}
          friction={0.6}
        />
        <mesh>
          <boxGeometry args={[0.5, 0.72, 0.5]} />
          <meshStandardMaterial color="#bc8b52" />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders={false} position={[0.65, 0.03, 0.4]}>
        <CuboidCollider collisionGroups={GRUPO_SO_DO_CORPO} args={[0.4, 0.03, 0.4]} />
        <mesh>
          <boxGeometry args={[0.8, 0.06, 0.8]} />
          <meshStandardMaterial ref={luz} color="#d6b56b" />
        </mesh>
      </RigidBody>
    </group>
  )
}

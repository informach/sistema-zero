import {
  BallCollider,
  type RapierRigidBody,
  RigidBody,
  useBeforePhysicsStep,
} from '@react-three/rapier'
import { useMemo, useRef } from 'react'
import { type CampoDeVento, ventoEm } from '../sistemas/vento'
import { GRUPO_SO_DO_CORPO } from './grupos'
import { PASSO_DA_FISICA } from './medidas'

/** Onde estão a folha e a pena (para o medidor). */
export const folhasAgora = {
  pecas: Array.from({ length: 2 }, () => ({ x: 0, y: 0, z: 0, dormindo: false })),
}

/** Duas peças soltas tocáveis. A folhagem presa na árvore continua toda no shader. */
export function FolhasAoVento({
  vento,
  x,
  y,
  z,
}: {
  vento: CampoDeVento
  x: number
  y: number
  z: number
}) {
  return (
    <>
      <Folha vento={vento} x={x} y={y} z={z} pena={false} indice={0} />
      <Folha vento={vento} x={x + 0.6} y={y + 0.7} z={z} pena indice={1} />
    </>
  )
}
function Folha({
  vento,
  x,
  y,
  z,
  pena,
  indice,
}: {
  vento: CampoDeVento
  x: number
  y: number
  z: number
  pena: boolean
  indice: number
}) {
  const corpo = useRef<RapierRigidBody>(null)
  const brisa = useMemo(() => ({ x: 0, z: 0 }), [])
  const impulso = useMemo(() => ({ x: 0, y: 0, z: 0 }), [])
  useBeforePhysicsStep(() => {
    const b = corpo.current
    if (!b) return
    const p = b.translation()
    const medida = folhasAgora.pecas[indice]
    if (medida) {
      medida.x = p.x
      medida.y = p.y
      medida.z = p.z
      medida.dormindo = b.isSleeping()
    }
    if (medida?.dormindo) return
    // No chão para de receber vento, para poder dormir. Sem reciclagem infinita.
    if (p.y < 1.12) return
    ventoEm(p.x, p.z, vento, brisa)
    impulso.x = brisa.x * 0.03 * 3 * PASSO_DA_FISICA
    impulso.z = brisa.z * 0.03 * 3 * PASSO_DA_FISICA
    b.applyImpulse(impulso, false)
  })
  return (
    <RigidBody
      ref={corpo}
      position={[x, y, z]}
      colliders={false}
      gravityScale={0.06}
      linearDamping={3}
      angularDamping={3}
      canSleep
    >
      <BallCollider args={[0.08]} mass={0.03} friction={1} collisionGroups={GRUPO_SO_DO_CORPO} />
      <mesh scale={[pena ? 0.09 : 0.17, 0.025, 0.3]} rotation={[0, 0.5, 0]}>
        <sphereGeometry args={[1, 6, 4]} />
        <meshStandardMaterial color={pena ? '#f2e7cd' : '#c8a95b'} flatShading />
      </mesh>
    </RigidBody>
  )
}

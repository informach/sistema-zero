import {
  BallCollider,
  CuboidCollider,
  CylinderCollider,
  type RapierRigidBody,
  RigidBody,
  useBeforePhysicsStep,
} from '@react-three/rapier'
import { useEffect, useMemo, useRef } from 'react'
import { Box3, type Mesh, type Object3D } from 'three'
import propsGlb from '../assets/ilhas/bosque-props.glb'
import { useJogo } from '../estado/contexto'
import { CORPO } from '../sistemas/corpo'
import { MATERIAIS, massaDe } from '../sistemas/materiais-fisicos'
import { passoDoGalho } from '../sistemas/mundo-reativo'
import { GRUPO_SO_DO_CORPO } from './grupos'
import { PASSO_DA_FISICA } from './medidas'
import { copiarNo, useModelo } from './modelos'

export interface PecaSolta {
  tipo: 'pedra' | 'cogumelo'
  x: number
  y: number
  z: number
}
const URL_DAS_PECAS = new URL(propsGlb, import.meta.url).href
const RAIO_DA_PEDRA = 0.18
export const reativosAgora = {
  montado: false,
  pecas: Array.from({ length: 4 }, () => ({ x: 0, y: 0, z: 0, dormindo: false })),
  galhoQuebrado: false,
  galhoX: 0,
  galhoY: 0,
  galhoZ: 0,
}

/** Poucas peças soltas. O resto da ilha conserva a colisão estática simples. */
export function ObjetosReativos({
  pecas,
  galho,
}: {
  pecas: readonly PecaSolta[]
  galho: { x: number; y: number; z: number }
}) {
  const modelo = useModelo(URL_DAS_PECAS)
  useEffect(() => {
    reativosAgora.montado = true
    return () => {
      reativosAgora.montado = false
    }
  }, [])
  return (
    <>
      {pecas.map((p, i) => (
        <Peca key={`${p.x}:${p.z}`} p={p} indice={i} modelo={modelo} />
      ))}
      <GalhoSeco {...galho} />
    </>
  )
}
function Peca({ p, indice, modelo }: { p: PecaSolta; indice: number; modelo: Object3D }) {
  const corpo = useRef<RapierRigidBody>(null)
  const altura = p.tipo === 'pedra' ? RAIO_DA_PEDRA : 0.38
  const origem = useMemo(() => ({ x: p.x, y: p.y + altura + 0.05, z: p.z }), [p, altura])
  const zero = useMemo(() => ({ x: 0, y: 0, z: 0 }), [])
  const desenho = useMemo(() => {
    if (p.tipo !== 'cogumelo') return null
    const o = copiarNo(modelo, 'cogumelo')
    o.position.set(0, 0, 0)
    o.updateMatrixWorld(true)
    const b = new Box3().setFromObject(o),
      escala = 0.75 / (b.max.y - b.min.y)
    o.scale.multiplyScalar(escala)
    o.position.set(
      -(b.min.x + b.max.x) * 0.5 * escala,
      -b.min.y * escala - 0.38,
      -(b.min.z + b.max.z) * 0.5 * escala,
    )
    return o
  }, [modelo, p.tipo])
  useBeforePhysicsStep(() => {
    const b = corpo.current
    if (!b) return
    const t = b.translation(),
      medida = reativosAgora.pecas[indice]
    if (medida) {
      medida.x = t.x
      medida.y = t.y
      medida.z = t.z
      medida.dormindo = b.isSleeping()
    }
    if (t.y < p.y - 3) {
      b.setTranslation(origem, true)
      b.setLinvel(zero, true)
      b.setAngvel(zero, true)
    }
  })
  return (
    <RigidBody
      ref={corpo}
      position={[origem.x, origem.y, origem.z]}
      colliders={false}
      linearDamping={1}
      angularDamping={1.5}
      canSleep
    >
      {p.tipo === 'pedra' ? (
        <>
          <BallCollider
            args={[RAIO_DA_PEDRA]}
            mass={massaDe('pedra', (4 / 3) * Math.PI * RAIO_DA_PEDRA ** 3)}
            friction={MATERIAIS.pedra.atrito}
            restitution={MATERIAIS.pedra.quique}
            collisionGroups={GRUPO_SO_DO_CORPO}
          />
          <mesh scale={[1, 0.95, 1.05]}>
            <icosahedronGeometry args={[RAIO_DA_PEDRA, 1]} />
            <meshStandardMaterial color="#91978c" flatShading />
          </mesh>
        </>
      ) : (
        <>
          <CylinderCollider
            args={[0.22, 0.12]}
            position={[0, -0.16, 0]}
            mass={0.4}
            friction={0.6}
            collisionGroups={GRUPO_SO_DO_CORPO}
          />
          <CylinderCollider
            args={[0.12, 0.31]}
            position={[0, 0.23, 0]}
            mass={0.8}
            friction={0.6}
            collisionGroups={GRUPO_SO_DO_CORPO}
          />
          {desenho && <primitive object={desenho} />}
        </>
      )}
    </RigidBody>
  )
}
function GalhoSeco({ x, y, z }: { x: number; y: number; z: number }) {
  const { rastro, movimento } = useJogo()
  const inteiro = useRef<RapierRigidBody>(null),
    desenho = useRef<Mesh>(null)
  const pedacos = useRef<(RapierRigidBody | null)[]>([]),
    desenhos = useRef<(Mesh | null)[]>([])
  const estado = useMemo(() => ({ carga: 0, quebrado: false }), [])
  const impulso = useMemo(() => ({ x: 0, y: 0, z: 0.25 }), [])
  const torque = useMemo(() => ({ x: 0, y: 0, z: 0 }), [])
  useEffect(() => {
    reativosAgora.galhoQuebrado = false
    for (const p of pedacos.current) p?.setEnabled(false)
    return () => {
      reativosAgora.galhoQuebrado = false
    }
  }, [])
  useBeforePhysicsStep(() => {
    reativosAgora.galhoX = x
    reativosAgora.galhoY = y
    reativosAgora.galhoZ = z
    if (estado.quebrado) {
      for (let i = 0; i < pedacos.current.length; i++) {
        const p = pedacos.current[i]
        if (p?.isEnabled() && p.translation().y < y - 3) {
          p.setEnabled(false)
          const d = desenhos.current[i]
          if (d) d.visible = false
        }
      }
      return
    }
    const peso =
      movimento.noChao &&
      Math.abs(rastro.x - x) < 0.72 &&
      Math.abs(rastro.z - z) < 0.35 &&
      Math.abs(rastro.y - CORPO.doCentroAoPe - y - 0.4) < 0.16
    if (!passoDoGalho(estado, peso, PASSO_DA_FISICA)) return
    inteiro.current?.setEnabled(false)
    if (desenho.current) desenho.current.visible = false
    for (let i = 0; i < pedacos.current.length; i++) {
      const p = pedacos.current[i],
        d = desenhos.current[i]
      if (d) d.visible = true
      if (p) {
        p.setEnabled(true)
        impulso.z = i === 0 ? 0.25 : -0.25
        torque.y = i === 0 ? 0.015 : -0.015
        p.applyImpulse(impulso, true)
        p.applyTorqueImpulse(torque, true)
      }
    }
    reativosAgora.galhoQuebrado = true
  })
  return (
    <group position={[x, y, z]}>
      {[-0.72, 0.72].map((lado) => (
        <mesh key={lado} position={[lado, 0.1, 0]} scale={[0.2, 0.12, 0.2]}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#8b9085" flatShading />
        </mesh>
      ))}
      <RigidBody ref={inteiro} type="fixed" colliders={false} position={[0, 0.28, 0]}>
        <CuboidCollider args={[0.8, 0.12, 0.12]} collisionGroups={GRUPO_SO_DO_CORPO} />
        <mesh ref={desenho} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.14, 1.6, 7]} />
          <meshStandardMaterial color="#95724e" />
        </mesh>
      </RigidBody>
      {[-0.4, 0.4].map((lado, i) => (
        <RigidBody
          key={lado}
          ref={(b) => {
            pedacos.current[i] = b
          }}
          colliders={false}
          position={[lado, 0.28, 0]}
          canSleep
          angularDamping={1}
        >
          <CuboidCollider args={[0.39, 0.1, 0.1]} mass={0.4} collisionGroups={GRUPO_SO_DO_CORPO} />
          <mesh
            ref={(m) => {
              desenhos.current[i] = m
            }}
            visible={false}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.1, 0.13, 0.78, 7]} />
            <meshStandardMaterial color="#95724e" />
          </mesh>
        </RigidBody>
      ))}
    </group>
  )
}

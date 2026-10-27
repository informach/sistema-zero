import { useFrame } from '@react-three/fiber'
import { CuboidCollider, CylinderCollider, RigidBody, TrimeshCollider } from '@react-three/rapier'
import { useMemo } from 'react'
import { BufferAttribute, type BufferGeometry, Color, PlaneGeometry } from 'three'
import { useJogo } from '../estado/contexto'
import { alturaDaIlha, chaoEm, PIER, RAIO_DO_RASO } from './medidas'
import { ComReserva, copiarNo, MODELOS, materiaisDe, useModelo } from './modelos'

const CORES = {
  grama: [new Color('#7dbb5a'), new Color('#6fae4f')],
  areia: [new Color('#e8d6a3'), new Color('#e1cc94')],
  'areia-molhada': [new Color('#c9b37c'), new Color('#bfa970')],
} as const

/** O chão de antes (formas do código), calculado da mesma altura que a colisão. */
function geometriaDoChao(): BufferGeometry {
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
}

/**
 * O chão da sua ilha. A colisão continua saindo de `alturaDaIlha` (trimesh); o desenho é o do
 * Blender (`terreno.glb`, mesma altura, com capim, flores, moitas, pedras e a espuma).
 */
function Terreno() {
  const geometria = useMemo(geometriaDoChao, [])
  const colisao = useMemo(() => {
    const pos = geometria.attributes.position as BufferAttribute
    const indice = geometria.index
    return {
      vertices: new Float32Array(pos.array),
      indices: new Uint32Array(indice ? indice.array : []),
    }
  }, [geometria])
  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        <TrimeshCollider args={[colisao.vertices, colisao.indices]} />
      </RigidBody>
      <ComReserva
        reserva={
          <mesh geometry={geometria}>
            <meshStandardMaterial vertexColors flatShading roughness={1} />
          </mesh>
        }
      >
        <ChaoDoModelo />
      </ComReserva>
    </>
  )
}

function ChaoDoModelo() {
  const raiz = useModelo(MODELOS.terreno)
  const { chao, enfeites, espuma } = useMemo(() => {
    const espuma = copiarNo(raiz, 'espuma', true)
    // A espuma é desenhada depois do mar (os dois são translúcidos).
    espuma.renderOrder = 2
    for (const m of materiaisDe(espuma)) m.depthWrite = false
    return { chao: copiarNo(raiz, 'chao'), enfeites: copiarNo(raiz, 'enfeites'), espuma }
  }, [raiz])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    espuma.position.y = Math.sin(t * 0.8) * 0.025
    espuma.scale.setScalar(1 + Math.sin(t * 0.8 + 1) * 0.004)
  })
  return (
    <>
      <primitive object={chao} />
      <primitive object={enfeites} />
      <primitive object={espuma} />
    </>
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
/** Qual árvore do Blender vai em cada lugar (os coqueiros ficam nas mais perto da praia). */
const VARIEDADES = ['arvore-redonda', 'arvore-frutas', 'arvore-pinheiro'] as const
function variedade(x: number, z: number, i: number): string {
  return Math.hypot(x, z) > 19.5 ? 'coqueiro' : (VARIEDADES[i % 3] ?? 'arvore-redonda')
}

/** A árvore de antes (formas do código): aparece enquanto o modelo baixa. */
function ArvoreDeAntes({ i }: { i: number }) {
  return (
    <>
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
    </>
  )
}

function ArvoreDoModelo({ nome, giro }: { nome: string; giro: number }) {
  const raiz = useModelo(MODELOS.arvores)
  const arvore = useMemo(() => copiarNo(raiz, nome), [raiz, nome])
  return <primitive object={arvore} rotation-y={giro} />
}

function Arvores() {
  return (
    <>
      {ARVORES.map(([x, z, s], i) => {
        const y = alturaDaIlha(x, z)
        return (
          <group key={`${x},${z}`} position={[x, y, z]} scale={s}>
            <ComReserva reserva={<ArvoreDeAntes i={i} />}>
              <ArvoreDoModelo nome={variedade(x, z, i)} giro={i * 1.7} />
            </ComReserva>
            <RigidBody type="fixed" colliders={false}>
              <CylinderCollider args={[0.9, 0.3]} position={[0, 0.9, 0]} />
            </RigidBody>
          </group>
        )
      })}
    </>
  )
}

/** O píer de antes (formas do código). */
function PierDeAntes() {
  const tabuas = Math.floor(PIER.comprimento / 0.5)
  return (
    <>
      {Array.from({ length: tabuas }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: tábuas fixas, a posição é a identidade.
        <mesh key={i} position={[0, ALTURA_DO_PIER, i * 0.5]}>
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
    </>
  )
}

/** O píer do Blender, com o barquinho; o lampião da ponta acende à noite. */
function PierDoModelo() {
  const { ambiente } = useJogo()
  const raiz = useModelo(MODELOS.pier)
  const { pier, lanternas } = useMemo(() => {
    const copia = copiarNo(raiz, 'pier', true)
    return { pier: copia, lanternas: materiaisDe(copia, 'lanterna') }
  }, [raiz])
  useFrame(() => {
    for (const m of lanternas) m.emissiveIntensity = ambiente.noite ? 2.2 : 0
  })
  return <primitive object={pier} />
}

const ALTURA_DO_PIER = 0.55

function Pier() {
  return (
    <group position={[PIER.x, 0, PIER.z]}>
      <ComReserva reserva={<PierDeAntes />}>
        <PierDoModelo />
      </ComReserva>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[1, 0.06, PIER.comprimento / 2]}
          position={[0, ALTURA_DO_PIER, PIER.comprimento / 2 - 0.25]}
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

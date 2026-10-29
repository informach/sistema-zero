import { useFrame } from '@react-three/fiber'
import { useBeforePhysicsStep } from '@react-three/rapier'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useEffect, useMemo, useRef } from 'react'
import {
  type InstancedMesh,
  type Mesh,
  type MeshStandardMaterial,
  Object3D,
  type PointLight,
} from 'three'
import { useJogo } from '../estado/contexto'
import {
  acender,
  criarObjetoMaterial,
  molhar,
  passoDosMateriais,
} from '../sistemas/estados-dos-materiais'
import { type CampoDeVento, ventoEm } from '../sistemas/vento'
import { useInterativo } from './interativos'
import { PASSO_DA_FISICA } from './medidas'

export const fogoAgora = { montado: false, acesas: 0, molhadas: 0, queimadas: 0, x: 0, y: 0, z: 0 }
const BRISA_DA_SALA: CampoDeVento = { tempo: 0, hora: 15 }

/** Recinto único. Não registra casas, bichos ou plantas no sistema de calor. */
export function FogueiraViva({
  x,
  y,
  z,
  vento = BRISA_DA_SALA,
}: {
  x: number
  y: number
  z: number
  vento?: CampoDeVento
}) {
  const { loja, rastro } = useJogo()
  const menosMovimento = useReducedMotion()
  const objetos = useMemo(() => {
    const lista = [
      criarObjetoMaterial('palha', x - 0.45, z, 1),
      criarObjetoMaterial('madeira', x, z, 1),
      criarObjetoMaterial('madeira', x + 0.45, z, 1),
      criarObjetoMaterial('palha', x + 0.1, z + 0.45, 1),
    ]
    molhar(lista[2]!)
    return lista
  }, [x, z])
  const calor = useMemo(() => new Float64Array(4), [])
  const brisa = useMemo(() => ({ x: 0, z: 0 }), [])
  const chamas = useRef<(Mesh | null)[]>([])
  const lenhas = useRef<(MeshStandardMaterial | null)[]>([])
  const luz = useRef<PointLight>(null)
  const pedras = useRef<InstancedMesh>(null)
  const tempo = useRef(0)
  useEffect(() => {
    fogoAgora.montado = true
    const m = new Object3D()
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6
      m.position.set(Math.cos(a) * 0.95, 0.12, Math.sin(a) * 0.95)
      m.scale.set(0.23, 0.16, 0.2)
      m.rotation.set(0, a, i * 0.1)
      m.updateMatrix()
      pedras.current?.setMatrixAt(i, m.matrix)
    }
    if (pedras.current) {
      pedras.current.instanceMatrix.needsUpdate = true
      pedras.current.computeBoundingSphere()
    }
    return () => {
      fogoAgora.montado = false
      fogoAgora.acesas = 0
    }
  }, [])
  const temChama = () => {
    for (const o of objetos) if (o.estado === 'queimando') return true
    return false
  }
  const noChao = () => Math.abs(rastro.y - y - 0.96) < 0.8
  useInterativo('fisica:fogueira', {
    x,
    z,
    raio: 1.6,
    rotulo: () =>
      !noChao()
        ? null
        : temChama()
          ? null
          : objetos[0]!.combustivel <= 0
            ? 'Colocar lenha nova'
            : objetos[0]!.umidade > 0
              ? 'Ver a lenha molhada'
              : 'Acender a palha',
    agir: () => {
      if (objetos[0]!.combustivel <= 0) {
        for (const o of objetos) {
          o.estado = 'seco'
          o.combustivel = 1
          o.calor = 0
          o.umidade = 0
        }
        molhar(objetos[2]!)
        loja.getState().dizer('Lenha nova. A peça mais escura está molhada.')
      } else if (acender(objetos[0]!))
        loja
          .getState()
          .dizer(
            'A palha acendeu. A lenha molhada não pega fogo. O balde ao lado apaga a fogueira.',
          )
      else loja.getState().dizer('A lenha está molhada. Ela precisa secar antes de acender.')
    },
  })
  useInterativo('fisica:balde', {
    x: x + 1.65,
    z,
    raio: 0.85,
    rotulo: () => (noChao() ? 'Jogar água na fogueira' : null),
    agir: () => {
      for (const o of objetos) molhar(o)
      loja.getState().dizer('A água apagou o fogo e molhou a lenha.')
    },
  })
  useBeforePhysicsStep(() => {
    ventoEm(x, z, vento, brisa)
    passoDosMateriais(objetos, calor, brisa, PASSO_DA_FISICA)
    fogoAgora.acesas = 0
    fogoAgora.molhadas = 0
    fogoAgora.queimadas = 0
    fogoAgora.x = x
    fogoAgora.y = y
    fogoAgora.z = z
    for (const o of objetos) {
      if (o.estado === 'queimando') fogoAgora.acesas++
      if (o.umidade > 0) fogoAgora.molhadas++
      if (o.estado === 'queimado') fogoAgora.queimadas++
    }
  })
  useFrame((_, dt) => {
    tempo.current += Math.min(dt, 0.1)
    let acesas = 0
    for (let i = 0; i < objetos.length; i++) {
      const o = objetos[i]!,
        chama = chamas.current[i],
        lenha = lenhas.current[i]
      if (o.estado === 'queimando') acesas++
      if (chama) {
        chama.visible = o.estado === 'queimando'
        chama.scale.y = menosMovimento ? 1 : 1 + Math.sin(tempo.current * 6 + i) * 0.12
        chama.rotation.z = -brisa.x * 0.18
      }
      if (lenha)
        lenha.color.set(
          o.estado === 'queimado'
            ? '#39352f'
            : o.umidade > 0
              ? '#594a39'
              : o.material === 'palha'
                ? '#d7b96c'
                : '#a57648',
        )
    }
    if (luz.current) {
      luz.current.intensity = acesas * 0.8
      luz.current.visible = acesas > 0
    }
  })
  return (
    <group position={[x, y, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[0.92, 16]} />
        <meshStandardMaterial color="#675848" />
      </mesh>
      <instancedMesh ref={pedras} args={[undefined, undefined, 12]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#898c86" flatShading />
      </instancedMesh>
      {objetos.map((o, i) => (
        <group key={o.x} position={[o.x - x, 0, o.z - z]}>
          <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.13, 0.55, 7]} />
            <meshStandardMaterial
              ref={(m) => {
                lenhas.current[i] = m
              }}
            />
          </mesh>
          <mesh
            ref={(m) => {
              chamas.current[i] = m
            }}
            position={[0, 0.42, 0]}
            visible={false}
          >
            <coneGeometry args={[0.16, 0.6, 6]} />
            <meshBasicMaterial color="#ffba48" toneMapped={false} />
          </mesh>
        </group>
      ))}
      <mesh position={[1.65, 0.2, 0]}>
        <cylinderGeometry args={[0.22, 0.17, 0.4, 10]} />
        <meshStandardMaterial color="#598ba8" />
      </mesh>
      <mesh position={[1.65, 0.405, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.19, 10]} />
        <meshBasicMaterial color="#9bd9e5" />
      </mesh>
      <pointLight
        ref={luz}
        position={[0, 0.65, 0]}
        color="#ffd18a"
        intensity={0}
        distance={4}
        decay={2}
      />
    </group>
  )
}

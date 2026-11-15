import { useFrame } from '@react-three/fiber'
import { RigidBody, TrimeshCollider } from '@react-three/rapier'
import { useEffect, useMemo, useState } from 'react'
import { BufferAttribute, BufferGeometry, Color } from 'three'
import { useJogo } from '../../estado/contexto'
import { ARQUIPELAGO, type IlhaDoArquipelago } from '../../sistemas/geografia-do-arquipelago'
import {
  LADO_DO_SETOR,
  malhaDistante,
  malhaDoSetor,
  type SetorDoTerritorio,
  setoresPerto,
} from '../../sistemas/setores-do-arquipelago'

type DadosDaMalha = { vertices: Float32Array; indices: Uint32Array }
function useGeometria(dados: DadosDaMalha, ilha: IlhaDoArquipelago) {
  const geometria = useMemo(() => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(dados.vertices, 3))
    geo.setIndex(new BufferAttribute(dados.indices, 1))
    const cores = new Float32Array(dados.vertices.length)
    const cor = new Color(ilha.cor)
    const areia = new Color('#d9c997')
    const pedra = new Color('#8d9184')
    const pintada = new Color()
    for (let i = 0; i < dados.vertices.length; i += 3) {
      const y = dados.vertices[i + 1] ?? 0
      pintada.copy(y < ilha.elevacao + 2 ? areia : cor)
      if (y > ilha.elevacao + ilha.relevo * 0.85) pintada.lerp(pedra, 0.35)
      cores.set([pintada.r, pintada.g, pintada.b], i)
    }
    geo.setAttribute('color', new BufferAttribute(cores, 3))
    geo.computeVertexNormals()
    return geo
  }, [dados, ilha])
  useEffect(() => () => geometria.dispose(), [geometria])
  return geometria
}

function Setor({ ilha, setor }: { ilha: IlhaDoArquipelago; setor: SetorDoTerritorio }) {
  const dados = useMemo(() => malhaDoSetor(ilha, setor.x, setor.z), [ilha, setor.x, setor.z])
  const geometria = useGeometria(dados, ilha)
  return (
    <RigidBody type="fixed" colliders={false}>
      <mesh geometry={geometria}>
        <meshStandardMaterial vertexColors roughness={0.95} />
      </mesh>
      <TrimeshCollider args={[dados.vertices, dados.indices]} />
    </RigidBody>
  )
}

function Territorio({
  ilha,
  setores,
}: {
  ilha: IlhaDoArquipelago
  setores: readonly SetorDoTerritorio[]
}) {
  const dados = useMemo(
    () => malhaDistante(ilha, new Set(setores.map((s) => s.id))),
    [ilha, setores],
  )
  const geometria = useGeometria(dados, ilha)
  return (
    <group position={[ilha.centro.x, 0, ilha.centro.z]}>
      <mesh geometry={geometria}>
        <meshStandardMaterial vertexColors roughness={1} />
      </mesh>
      {setores.map((setor) => (
        <Setor key={setor.id} ilha={ilha} setor={setor} />
      ))}
    </group>
  )
}

export function TerrenosMacro({
  aoMudar,
  foco,
  aoPronto,
}: {
  aoMudar: (quantidade: number) => void
  foco: { x: number; z: number } | null
  aoPronto: (x: number, z: number) => void
}) {
  const { rastro } = useJogo()
  const [celula, setCelula] = useState(() => ({
    x: Math.floor(rastro.x / LADO_DO_SETOR),
    z: Math.floor(rastro.z / LADO_DO_SETOR),
  }))
  useFrame(() => {
    const x = Math.floor((foco ?? rastro).x / LADO_DO_SETOR)
    const z = Math.floor((foco ?? rastro).z / LADO_DO_SETOR)
    if (x !== celula.x || z !== celula.z) setCelula({ x, z })
  })
  const territorios = useMemo(
    () =>
      ARQUIPELAGO.map((ilha) => ({
        ilha,
        setores: setoresPerto(ilha, {
          x: (celula.x + 0.5) * LADO_DO_SETOR - ilha.centro.x,
          z: (celula.z + 0.5) * LADO_DO_SETOR - ilha.centro.z,
        }),
      })),
    [celula],
  )
  useEffect(
    () => aoMudar(territorios.reduce((n, t) => n + t.setores.length, 0)),
    [territorios, aoMudar],
  )
  useEffect(() => aoPronto(celula.x, celula.z), [celula, aoPronto])
  return territorios.map((t) => <Territorio key={t.ilha.id} {...t} />)
}

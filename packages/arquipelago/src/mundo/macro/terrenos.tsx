import { useFrame } from '@react-three/fiber'
import { RigidBody, TrimeshCollider } from '@react-three/rapier'
import { useEffect, useMemo, useState } from 'react'
import { BufferAttribute, BufferGeometry, Color } from 'three'
import { useJogo } from '../../estado/contexto'
import {
  ARQUIPELAGO,
  type IlhaDoArquipelago,
  type TerritorioId,
} from '../../sistemas/geografia-do-arquipelago'
import { regiaoDoCenario } from '../../sistemas/regiao-do-cenario'
import {
  LADO_DO_SETOR,
  malhaDistante,
  malhaDoSetor,
  type SetorDoTerritorio,
  setoresPerto,
} from '../../sistemas/setores-do-arquipelago'
import { MaterialDoSolo } from '../faisca/pintura-do-solo'

type DadosDaMalha = { vertices: Float32Array; indices: Uint32Array }
export interface FonteDoTerreno {
  setor(ilha: IlhaDoArquipelago, x: number, z: number): DadosDaMalha
  distante(ilha: IlhaDoArquipelago, excluir: ReadonlySet<string>): DadosDaMalha
}
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
      if (ilha.id === 'sua-ilha' && y > 2) {
        const x = dados.vertices[i]!,
          z = dados.vertices[i + 2]!
        const peso = Math.max(0, 1 - Math.hypot(x, z - 135) / 140)
        pintada.multiplyScalar(1 + peso * 0.055 * (Math.sin(x / 7) + Math.cos(z / 11)))
      }
      cores.set([pintada.r, pintada.g, pintada.b], i)
    }
    geo.setAttribute('color', new BufferAttribute(cores, 3))
    geo.computeVertexNormals()
    return geo
  }, [dados, ilha])
  useEffect(() => () => geometria.dispose(), [geometria])
  return geometria
}

function Setor({
  ilha,
  setor,
  fonte,
}: {
  ilha: IlhaDoArquipelago
  setor: SetorDoTerritorio
  fonte?: FonteDoTerreno
}) {
  const dados = useMemo(
    () => (fonte ? fonte.setor(ilha, setor.x, setor.z) : malhaDoSetor(ilha, setor.x, setor.z)),
    [ilha, setor.x, setor.z, fonte],
  )
  const geometria = useGeometria(dados, ilha)
  return (
    <RigidBody type="fixed" colliders={false}>
      <mesh geometry={geometria} receiveShadow userData={{ chao: true }}>
        <MaterialDoSolo faisca={ilha.id === 'sua-ilha'} />
      </mesh>
      <TrimeshCollider args={[dados.vertices, dados.indices]} />
    </RigidBody>
  )
}

function Territorio({
  ilha,
  setores,
  fonte,
  publicado = false,
  recortar = false,
}: {
  ilha: IlhaDoArquipelago
  setores: readonly SetorDoTerritorio[]
  fonte?: FonteDoTerreno
  publicado?: boolean
  recortar?: boolean
}) {
  const dados = useMemo(
    () => (fonte?.distante ?? malhaDistante)(ilha, new Set(setores.map((s) => s.id))),
    [ilha, setores, fonte],
  )
  const geometria = useGeometria(dados, ilha)
  const planos = useMemo(
    () => (recortar ? regiaoDoCenario(ilha.id).planos : undefined),
    [ilha.id, recortar],
  )
  return (
    <group position={[ilha.centro.x, 0, ilha.centro.z]}>
      <mesh geometry={geometria}>
        <MaterialDoSolo faisca={!publicado && ilha.id === 'sua-ilha'} planos={planos} />
      </mesh>
      {!publicado &&
        setores.map((setor) => <Setor key={setor.id} ilha={ilha} setor={setor} fonte={fonte} />)}
    </group>
  )
}

export function TerrenosMacro({
  aoMudar,
  foco,
  aoPronto,
  fonte,
  publicadas,
}: {
  aoMudar: (quantidade: number) => void
  foco: { x: number; z: number } | null
  aoPronto: (x: number, z: number) => void
  fonte?: FonteDoTerreno
  /** O detalhe destas ilhas vem da malha compilada e dos seus próprios colisores. */
  publicadas?: ReadonlySet<TerritorioId>
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
  return territorios.map((t) => (
    <Territorio
      key={t.ilha.id}
      {...t}
      fonte={fonte}
      publicado={publicadas?.has(t.ilha.id)}
      recortar={!!publicadas?.size}
    />
  ))
}

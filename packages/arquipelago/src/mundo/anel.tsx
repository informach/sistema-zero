import { useFrame } from '@react-three/fiber'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import { type Ilha, ilhaAberta } from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Color,
  CylinderGeometry,
  Euler,
  type InstancedMesh,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three'
import { useEstado, useJogo } from '../estado/contexto'
import { useInterativo } from './interativos'
import { ALTURA_DA_TERRA, ilhasEmVolta, RAIO_DA_ILHA_DO_ANEL, trajetoDaPonte } from './medidas'

const CINZA = new Color('#b3b8c1')
const TRECHO_QUEBRADO = 0.25
const DURACAO_DA_CHEGADA_MS = 4500

/** Cor da ilha: cinza antes do posto; a cor volta conforme `cor` (0 a 1). */
function tinta(hex: string, cor: number): string {
  return `#${CINZA.clone().lerp(new Color(hex), cor).getHexString()}`
}

function geometriaDeIlha(raio: number, semente: number): CylinderGeometry {
  const g = new CylinderGeometry(raio, raio * 0.82, 1.6, 18, 1)
  const p = g.attributes.position
  if (p) {
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i)
      const z = p.getZ(i)
      const a = Math.atan2(z, x)
      const k = 1 + 0.12 * Math.sin(a * 3 + semente) + 0.07 * Math.sin(a * 7 + semente * 2)
      p.setX(i, x * k)
      p.setZ(i, z * k)
    }
  }
  g.computeVertexNormals()
  return g
}

/** O que dá a cara de cada ilha na versão leve (silhueta). */
function Enfeites({ id, cor }: { id: Ilha['id']; cor: number }) {
  const t = (hex: string) => tinta(hex, cor)
  switch (id) {
    case 'bosque':
      return (
        <>
          {[
            [-4, 2],
            [3, 3],
            [0, -4],
            [5, -2],
            [-5, -3],
            [1, 5],
            [-1, 0],
          ].map(([x, z], i) => (
            <group key={`${x},${z}`} position={[x ?? 0, 0, z ?? 0]} scale={1 + (i % 3) * 0.25}>
              <mesh position={[0, 0.8, 0]}>
                <cylinderGeometry args={[0.2, 0.28, 1.6, 6]} />
                <meshStandardMaterial color={t('#7c5836')} flatShading />
              </mesh>
              <mesh position={[0, 2.3, 0]}>
                <icosahedronGeometry args={[1.2, 0]} />
                <meshStandardMaterial color={t(i % 2 ? '#3f9a4f' : '#58b05a')} flatShading />
              </mesh>
            </group>
          ))}
          <group position={[0, 0, 0]}>
            <mesh position={[0, 1.4, 0]}>
              <cylinderGeometry args={[0.3, 0.35, 2.8, 6]} />
              <meshStandardMaterial color={t('#7c5836')} />
            </mesh>
            <mesh position={[0, 3.3, 0]}>
              <boxGeometry args={[2.2, 1.2, 2.2]} />
              <meshStandardMaterial color={t('#f3c26b')} flatShading />
            </mesh>
            <mesh position={[0, 4.3, 0]} rotation={[0, Math.PI / 4, 0]}>
              <coneGeometry args={[1.9, 1, 4]} />
              <meshStandardMaterial color={t('#e0498f')} flatShading />
            </mesh>
          </group>
        </>
      )
    case 'vila-doce':
      return (
        <>
          {[
            [-3, 2],
            [2, -3],
            [3.5, 2.5],
            [-2, -3.5],
            [0, 0],
          ].map(([x, z], i) => (
            <group key={`${x},${z}`} position={[x ?? 0, 0, z ?? 0]}>
              <mesh position={[0, 1, 0]}>
                <boxGeometry args={[2.4, 2, 2.2]} />
                <meshStandardMaterial
                  color={t(['#ffd6e5', '#fff1c9', '#d9f2ff'][i % 3] ?? '#ffffff')}
                  flatShading
                />
              </mesh>
              <mesh position={[0, 2.5, 0]}>
                <sphereGeometry args={[1.35, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial
                  color={t(['#ff8fb8', '#f2a541', '#7fc8f8'][i % 3] ?? '#ffffff')}
                  flatShading
                />
              </mesh>
            </group>
          ))}
        </>
      )
    case 'recife':
      return (
        <>
          <mesh position={[0, 0.82, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[5.5, 14]} />
            <meshStandardMaterial color={t('#4fc3d9')} />
          </mesh>
          {Array.from({ length: 9 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: enfeite fixo.
            <mesh key={i} position={[Math.cos(i * 0.7) * 7, 1.1, Math.sin(i * 0.7) * 7]}>
              <dodecahedronGeometry args={[0.9, 0]} />
              <meshStandardMaterial color={t(i % 2 ? '#ff8a7a' : '#ffb3c7')} flatShading />
            </mesh>
          ))}
        </>
      )
    case 'pico':
      return (
        <>
          <mesh position={[0, 6, 0]}>
            <coneGeometry args={[8, 11, 7]} />
            <meshStandardMaterial color={t('#8fa3b8')} flatShading />
          </mesh>
          <mesh position={[0, 10.2, 0]}>
            <coneGeometry args={[3.2, 3, 7]} />
            <meshStandardMaterial color="#f4f7fb" flatShading />
          </mesh>
        </>
      )
    case 'vale-dos-dinos':
      return (
        <>
          <mesh position={[0, 3.2, -2]}>
            <cylinderGeometry args={[1.8, 5.5, 6, 8]} />
            <meshStandardMaterial color={t('#8a5a44')} flatShading />
          </mesh>
          <mesh position={[0, 6.25, -2]}>
            <cylinderGeometry args={[1.5, 1.5, 0.1, 8]} />
            <meshStandardMaterial
              color={t('#ff7a3d')}
              emissive={t('#ff5a1f')}
              emissiveIntensity={cor * 0.8}
            />
          </mesh>
        </>
      )
    case 'nuvens':
      return (
        <>
          {[
            [3, 0.5, 3, 1],
            [-4, -0.5, -2, 1.3],
            [1, 1.5, -4, 0.9],
          ].map(([x, y, z, s]) => (
            <group key={`${x},${z}`} position={[x ?? 0, (y ?? 0) + 1, z ?? 0]} scale={s ?? 1}>
              {[
                [0, 0, 0, 1.2],
                [1, -0.1, 0.2, 0.9],
                [-1, -0.15, 0, 0.85],
              ].map(([a, b, c, r]) => (
                <mesh key={`${a}${c}`} position={[a ?? 0, b ?? 0, c ?? 0]}>
                  <icosahedronGeometry args={[r ?? 1, 1]} />
                  <meshStandardMaterial color={t('#ffffff')} flatShading />
                </mesh>
              ))}
            </group>
          ))}
        </>
      )
    default:
      return null
  }
}

const ALTURA_DAS_NUVENS = 7

function IlhaDoAnel({
  ilha,
  centro,
  cor,
}: {
  ilha: Ilha
  centro: { x: number; z: number }
  cor: number
}) {
  const geometria = useMemo(
    () => geometriaDeIlha(RAIO_DA_ILHA_DO_ANEL, ilha.posicao * 1.7),
    [ilha.posicao],
  )
  const flutua = ilha.id === 'nuvens'
  const y = flutua ? ALTURA_DAS_NUVENS : 0
  return (
    <group position={[centro.x, y, centro.z]}>
      <mesh geometry={geometria} position={[0, ALTURA_DA_TERRA - 0.8, 0]}>
        <meshStandardMaterial
          color={tinta(ilha.id === 'pico' ? '#e8eef5' : '#7dbb5a', cor)}
          flatShading
        />
      </mesh>
      {flutua ? (
        <mesh position={[0, -2.6, 0]}>
          <coneGeometry args={[RAIO_DA_ILHA_DO_ANEL * 0.85, 6, 8]} />
          <meshStandardMaterial color={tinta('#8a6a4a', cor)} flatShading />
        </mesh>
      ) : null}
      <group position={[0, ALTURA_DA_TERRA, 0]}>
        <Enfeites id={ilha.id} cor={cor} />
      </group>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider
          args={[0.8, RAIO_DA_ILHA_DO_ANEL - 0.5]}
          position={[0, ALTURA_DA_TERRA - 0.8, 0]}
        />
      </RigidBody>
    </group>
  )
}

const tmpM = new Matrix4()
const tmpQ = new Quaternion()
const tmpE = new Euler(0, 0, 0, 'YXZ')
const tmpV = new Vector3()
const UM = new Vector3(1, 1, 1)

/** Tábuas da ponte (uma malha instanciada) e a colisão por trechos. */
function Ponte({
  ilha,
  inteira,
  tabuasVisiveis,
}: {
  ilha: Ilha
  inteira: boolean
  tabuasVisiveis: number
}) {
  const pontos = useMemo(() => trajetoDaPonte(ilha, 36), [ilha])
  const tabuas = useMemo(() => {
    const lista: { x: number; y: number; z: number; giro: number; incl: number }[] = []
    for (let i = 0; i < pontos.length - 1; i++) {
      const a = pontos[i]
      const b = pontos[i + 1]
      if (!a || !b) continue
      const giro = Math.atan2(b.x - a.x, b.z - a.z)
      const incl = -Math.atan2(b.y - a.y, Math.hypot(b.x - a.x, b.z - a.z))
      for (let k = 0; k < 2; k++) {
        const t = k / 2 + 0.25
        lista.push({
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
          z: a.z + (b.z - a.z) * t,
          giro,
          incl,
        })
      }
    }
    return lista
  }, [pontos])
  const malha = useRef<InstancedMesh>(null)
  const limite = Math.floor(tabuas.length * (inteira ? tabuasVisiveis : TRECHO_QUEBRADO))
  useEffect(() => {
    const m = malha.current
    if (!m) return
    tabuas.forEach((t, i) => {
      tmpE.set(t.incl, t.giro, 0)
      tmpQ.setFromEuler(tmpE)
      tmpV.set(t.x, i < limite ? t.y : -50, t.z)
      tmpM.compose(tmpV, tmpQ, UM)
      m.setMatrixAt(i, tmpM)
    })
    m.instanceMatrix.needsUpdate = true
  }, [tabuas, limite])

  const trechos = useMemo(() => {
    const ate = inteira ? pontos.length - 1 : Math.floor((pontos.length - 1) * TRECHO_QUEBRADO)
    const lista: { pos: [number, number, number]; rot: [number, number, number]; meio: number }[] =
      []
    for (let i = 0; i < ate; i++) {
      const a = pontos[i]
      const b = pontos[i + 1]
      if (!a || !b) continue
      const giro = Math.atan2(b.x - a.x, b.z - a.z)
      const incl = -Math.atan2(b.y - a.y, Math.hypot(b.x - a.x, b.z - a.z))
      const e = new Euler(incl, giro, 0, 'YXZ')
      const q = new Quaternion().setFromEuler(e)
      const xyz = new Euler().setFromQuaternion(q, 'XYZ')
      lista.push({
        pos: [(a.x + b.x) / 2, (a.y + b.y) / 2 - 0.05, (a.z + b.z) / 2],
        rot: [xyz.x, xyz.y, xyz.z],
        meio: Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) / 2 + 0.02,
      })
    }
    return lista
  }, [pontos, inteira])

  return (
    <>
      <instancedMesh ref={malha} args={[undefined, undefined, tabuas.length]} frustumCulled={false}>
        <boxGeometry args={[2.2, 0.14, 0.5]} />
        <meshStandardMaterial color={inteira ? '#b07c4f' : '#9aa0aa'} flatShading />
      </instancedMesh>
      {inteira && tabuasVisiveis < 1 ? null : (
        <RigidBody type="fixed" colliders={false}>
          {trechos.map((t, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: os trechos seguem a ordem do trajeto.
            <CuboidCollider key={i} args={[1.1, 0.08, t.meio]} position={t.pos} rotation={t.rot} />
          ))}
        </RigidBody>
      )}
    </>
  )
}

/** Quando a ponte acabou de abrir: a cor escorre pela ilha e as tábuas aparecem uma a uma. */
function useChegada(ilha: Ilha, aberta: boolean): number {
  const { loja } = useJogo()
  const jaViu = useEstado((s) => s.salvamento.pontesVistas.includes(ilha.id))
  const [progresso, setProgresso] = useState(aberta && !jaViu ? 0 : 1)
  const inicio = useRef<number | null>(null)
  useEffect(() => {
    if (aberta && !jaViu && progresso === 0) {
      loja.getState().dizer(`A ponte para o ${ilha.nome} ficou pronta. A cor voltou para lá.`)
    }
  }, [aberta, jaViu, progresso, ilha.nome, loja])
  useFrame(() => {
    if (progresso >= 1) return
    if (inicio.current === null) inicio.current = performance.now()
    const p = Math.min(1, (performance.now() - inicio.current) / DURACAO_DA_CHEGADA_MS)
    setProgresso(p)
    if (p >= 1) {
      loja
        .getState()
        .mudar((s) =>
          s.pontesVistas.includes(ilha.id)
            ? s
            : { ...s, pontesVistas: [...s.pontesVistas, ilha.id] },
        )
    }
  })
  return progresso
}

function IlhaComPonte({ ilha, centro }: { ilha: Ilha; centro: { x: number; z: number } }) {
  const { loja } = useJogo()
  const jornada = useEstado((s) => s.jornada)
  const aberta = ilhaAberta(ilha.id, jornada)
  const chegada = useChegada(ilha, aberta)
  // Na ilha aberta (nesta fase só a silhueta), o Zappy explica o que vem.
  useInterativo(`ilha-${ilha.id}`, {
    x: centro.x,
    z: centro.z,
    raio: aberta ? RAIO_DA_ILHA_DO_ANEL : 0,
    rotulo: () => 'Olhar em volta',
    agir: () =>
      loja
        .getState()
        .dizer(
          `Este é o ${ilha.nome}. Os moradores e os bichos chegam aqui na próxima fase do jogo.`,
        ),
  })
  return (
    <>
      <IlhaDoAnel ilha={ilha} centro={centro} cor={aberta ? chegada : 0} />
      <Ponte ilha={ilha} inteira={aberta} tabuasVisiveis={chegada} />
    </>
  )
}

export function Anel() {
  const ilhas = useMemo(() => ilhasEmVolta(), [])
  return (
    <>
      {ilhas.map(({ ilha, centro }) => (
        <IlhaComPonte key={ilha.id} ilha={ilha} centro={centro} />
      ))}
    </>
  )
}

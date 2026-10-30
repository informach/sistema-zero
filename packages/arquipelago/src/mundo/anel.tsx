import { useFrame } from '@react-three/fiber'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import { type Ilha, type IlhaId, ilhaAberta } from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  type BufferGeometry,
  Color,
  CylinderGeometry,
  Euler,
  type InstancedMesh,
  type Material,
  Matrix4,
  type Mesh,
  type MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three'
import { useChegada as useChegadaDaPonte } from '../estado/chegada'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDosDesafios, useDesafios } from '../estado/desafios'
import { andarPedacos, corMedia, pedacosPintados } from '../sistemas/cor-da-ilha'
import { BOIAS_DA_ILHA_DO_ANEL, RODA_DA_ILHA_CENTRAL } from '../sistemas/correnteza'
import { completaColide, completaNaCena, type EstadoDaIlha } from '../sistemas/ilhas-completas'
import { Boias } from './boias'
import { BosqueVivo } from './bosque-vivo'
import { progressoDaChegada } from './chegada-da-ponte'
import {
  ALTURA_DA_CORDA,
  corrimaosDaPonte,
  postesDaPonte,
  type Tabua,
  tabuasDaPonte,
} from './colisao-da-ilha-central'
import { Colisores } from './colisores'
import { DescobertaDaIlha } from './descoberta-da-ilha'
import {
  aplicarOpacidade,
  IlhaCompleta,
  type IlhaPreparada,
  type Troca,
  useIlhaCompleta,
} from './ilha-completa'
import {
  ALTURA_DA_TERRA,
  ALTURA_DAS_NUVENS,
  apoiosDaIlhaLeve,
  fracaoMontada,
  giroDaIlha,
  ilhasEmVolta,
  RAIO_DA_ILHA_DO_ANEL,
  rodasDaIlhaNoModelo,
  trajetoDaPonte,
} from './medidas'
import { CINZA, ComReserva, copiarNo, MODELOS, materiaisDe, useModelo } from './modelos'
import { NuvensVivo } from './nuvens-vivo'
import { PicoVivo } from './pico-vivo'
import { pintarMateriais, pinturaDaIlha } from './pintura-da-ilha'
import { PlacaDaPonte } from './placa-da-ponte'
import { QuadroDasCores } from './quadro-das-cores'
import { RecifeVivo } from './recife-vivo'
import { ValeVivo } from './vale-vivo'
import { VilaViva } from './vila-viva'

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

/** O que mexe em cada ilha completa (montado com ela ativa, em coordenadas do mundo). */
const ILHAS_VIVAS: Partial<Record<IlhaId, typeof BosqueVivo>> = {
  bosque: BosqueVivo,
  'vila-doce': VilaViva,
  recife: RecifeVivo,
  pico: PicoVivo,
  'vale-dos-dinos': ValeVivo,
  nuvens: NuvensVivo,
}

function IlhaDoAnel({
  ilha,
  centro,
  cor,
  estado,
  preparada,
  troca,
}: {
  ilha: Ilha
  centro: { x: number; z: number }
  cor: number
  estado: EstadoDaIlha
  preparada: IlhaPreparada | null
  troca: Troca
}) {
  const flutua = ilha.id === 'nuvens'
  const Viva = ILHAS_VIVAS[ilha.id]
  const y = flutua ? ALTURA_DAS_NUVENS : 0
  const areaDaDescoberta = useMemo(
    () => ({ ilha: ilha.id, ...centro, raio: 12, alturaMinima: y + ALTURA_DA_TERRA }),
    [ilha.id, centro, y],
  )
  // O chão de antes, girado como o modelo (o grupo fica sem giro; a cópia do modelo é que gira).
  const apoios = useMemo(() => {
    const g = giroDaIlha(ilha)
    return apoiosDaIlhaLeve(ilha).map((a) => ({
      x: a.x * Math.cos(g) + a.z * Math.sin(g),
      z: -a.x * Math.sin(g) + a.z * Math.cos(g),
      raio: a.raio,
    }))
  }, [ilha])
  // A leve fica sempre montada: é a reserva enquanto a completa baixa ou se ela falhar, e some
  // esmaecendo quando a completa entra. Só uma das duas colide por vez.
  return (
    <>
      <group position={[centro.x, y, centro.z]}>
        <ComReserva reserva={<IlhaDeAntes ilha={ilha} cor={cor} />}>
          <IlhaDoModelo ilha={ilha} troca={troca} />
        </ComReserva>
        {!completaColide(estado) && (
          <RigidBody type="fixed" colliders={false}>
            {apoios.map((a) => (
              <CylinderCollider
                key={`${a.x},${a.z}`}
                args={[0.8, a.raio]}
                position={[a.x, ALTURA_DA_TERRA - 0.8, a.z]}
              />
            ))}
          </RigidBody>
        )}
        {preparada && completaNaCena(estado) && (
          <IlhaCompleta preparada={preparada} colide={completaColide(estado)} troca={troca} />
        )}
        {preparada && completaColide(estado) && (
          <ComReserva reserva={null}>
            <QuadroDasCores ilha={ilha} centro={centro} preparada={preparada} />
          </ComReserva>
        )}
      </group>
      {/* O que mexe na ilha (no Bosque: cipós, escalada, lago, percurso): só com a completa ativa. */}
      {preparada && completaColide(estado) ? <DescobertaDaIlha area={areaDaDescoberta} /> : null}
      {preparada && completaColide(estado) && Viva ? (
        <Viva ilha={ilha} centro={centro} preparada={preparada} troca={troca} />
      ) : null}
    </>
  )
}

/**
 * A ilha do Blender (`ilhas-do-anel.glb`, um nó por ilha). O lado da chegada da ponte (+x do
 * modelo) é virado para a sua ilha; os pedaços saem do cinza pela tinta da ilha (a lava acende junto).
 */
function IlhaDoModelo({ ilha, troca }: { ilha: Ilha; troca: Troca }) {
  const raiz = useModelo(MODELOS.ilhas)
  const { modelo, materiais } = useMemo(() => {
    const copia = copiarNo(raiz, ilha.id, true)
    copia.rotation.y = giroDaIlha(ilha)
    const materiais = materiaisDe(copia)
    // Os pedaços saem do cinza no shader (`pintura-da-ilha.ts`), os mesmos da completa.
    pintarMateriais(materiais, pinturaDaIlha(ilha))
    return { modelo: copia, materiais }
  }, [raiz, ilha])
  useEffect(() => {
    troca.leve = modelo
    return () => {
      if (troca.leve === modelo) troca.leve = undefined
    }
  }, [troca, modelo])
  // Sai esmaecendo quando a completa entra (e volta quando ela sai); parada, não mexe em nada.
  const aplicada = useRef(1)
  useFrame(() => {
    const opacidade = 1 - troca.opacidade
    if (opacidade === aplicada.current) return
    aplicada.current = opacidade
    aplicarOpacidade(materiais, opacidade)
    modelo.visible = opacidade > 0
  })
  return <primitive object={modelo} />
}

/** A silhueta de antes (formas do código). */
function IlhaDeAntes({ ilha, cor }: { ilha: Ilha; cor: number }) {
  const geometria = useMemo(
    () => geometriaDeIlha(RAIO_DA_ILHA_DO_ANEL, ilha.posicao * 1.7),
    [ilha.posicao],
  )
  const flutua = ilha.id === 'nuvens'
  return (
    <>
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
    </>
  )
}

const tmpM = new Matrix4()
const tmpQ = new Quaternion()
const tmpE = new Euler(0, 0, 0, 'YXZ')
const tmpV = new Vector3()
const UM = new Vector3(1, 1, 1)

/** Tábuas da ponte (instanciadas), postes e corda, e a colisão por trechos. */
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
  const tabuas = useMemo(() => tabuasDaPonte(pontos), [pontos])
  // A corda da ponte inteira segura o corpo (uma parede baixa sob cada corda, só para o corpo).
  const corrimaos = useMemo(() => corrimaosDaPonte(ilha.id, postesDaPonte(tabuas)), [ilha, tabuas])
  const montada = fracaoMontada(inteira, tabuasVisiveis)
  const limite = Math.floor(tabuas.length * montada)
  // O chão que segura o corpo acompanha as tábuas (só muda quando um trecho inteiro entra).
  const ate = Math.floor((pontos.length - 1) * montada)

  const trechos = useMemo(() => {
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
  }, [pontos, ate])

  return (
    <>
      <ComReserva reserva={<TabuasDeAntes tabuas={tabuas} limite={limite} inteira={inteira} />}>
        <PonteDoModelo tabuas={tabuas} limite={limite} inteira={inteira} />
      </ComReserva>
      <RigidBody type="fixed" colliders={false}>
        {trechos.map((t, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: os trechos seguem a ordem do trajeto.
          <CuboidCollider key={i} args={[1.1, 0.08, t.meio]} position={t.pos} rotation={t.rot} />
        ))}
      </RigidBody>
      {inteira && tabuasVisiveis >= 1 && <Colisores lista={corrimaos} />}
      {!inteira && tabuas[limite - 1] && <PlacaDaPonte ilha={ilha} tabua={tabuas[limite - 1]!} />}
    </>
  )
}

/** Põe cada tábua no lugar; as que ainda não chegaram ficam escondidas lá embaixo. */
function useTabuasNoLugar(malha: InstancedMesh | null, tabuas: Tabua[], limite: number) {
  useEffect(() => {
    if (!malha) return
    tabuas.forEach((t, i) => {
      tmpE.set(t.incl, t.giro, 0)
      tmpQ.setFromEuler(tmpE)
      tmpV.set(t.x, i < limite ? t.y : -50, t.z)
      tmpM.compose(tmpV, tmpQ, UM)
      malha.setMatrixAt(i, tmpM)
    })
    malha.instanceMatrix.needsUpdate = true
  }, [malha, tabuas, limite])
}

function TabuasDeAntes({
  tabuas,
  limite,
  inteira,
}: {
  tabuas: Tabua[]
  limite: number
  inteira: boolean
}) {
  const [malha, setMalha] = useState<InstancedMesh | null>(null)
  useTabuasNoLugar(malha, tabuas, limite)
  return (
    <instancedMesh
      ref={setMalha}
      args={[undefined, undefined, tabuas.length]}
      frustumCulled={false}
    >
      <boxGeometry args={[2.2, 0.14, 0.5]} />
      <meshStandardMaterial color={inteira ? '#b07c4f' : '#9aa0aa'} flatShading />
    </instancedMesh>
  )
}

const CINZA_DA_PONTE = new Color('#9aa0aa')
const FRENTE = new Vector3(0, 0, 1)
const tmpA = new Vector3()
const tmpB = new Vector3()
const tmpD = new Vector3()

function geometriaEMaterial(raiz: ReturnType<typeof useModelo>, nome: string) {
  const malha = copiarNo(raiz, nome, true) as Mesh
  return {
    geometria: malha.geometry as BufferGeometry,
    material: malha.material as MeshStandardMaterial,
  }
}

/**
 * A ponte do Blender: tábuas, postes e corda instanciados. Quebrada, fica cinza e sem corda;
 * quando abre, tábuas e postes aparecem um a um e a corda vai junto.
 */
function PonteDoModelo({
  tabuas,
  limite,
  inteira,
}: {
  tabuas: Tabua[]
  limite: number
  inteira: boolean
}) {
  const raiz = useModelo(MODELOS.ponte)
  const pecas = useMemo(() => {
    const tabua = geometriaEMaterial(raiz, 'tabua')
    const poste = geometriaEMaterial(raiz, 'poste')
    const corda = geometriaEMaterial(raiz, 'corda')
    return {
      tabua,
      poste,
      corda,
      corDaTabua: tabua.material.color.clone(),
      corDoPoste: poste.material.color.clone(),
    }
  }, [raiz])
  useEffect(() => {
    pecas.tabua.material.color.copy(inteira ? pecas.corDaTabua : CINZA_DA_PONTE)
    pecas.poste.material.color.copy(inteira ? pecas.corDoPoste : CINZA_DA_PONTE)
  }, [inteira, pecas])

  // Postes: dos dois lados, de tantas em tantas tábuas, com a base no tampo da tábua.
  const postes = useMemo(
    () =>
      postesDaPonte(tabuas).map((p) => ({
        tabua: p.tabua,
        pos: new Vector3(...p.pos),
        q: new Quaternion().setFromEuler(new Euler(0, p.giro, 0)),
      })),
    [tabuas],
  )
  const [malhaTabuas, setMalhaTabuas] = useState<InstancedMesh | null>(null)
  const [malhaPostes, setMalhaPostes] = useState<InstancedMesh | null>(null)
  const [malhaCorda, setMalhaCorda] = useState<InstancedMesh | null>(null)
  useTabuasNoLugar(malhaTabuas, tabuas, limite)
  useEffect(() => {
    if (!malhaPostes) return
    postes.forEach((p, i) => {
      tmpV.copy(p.pos)
      if (p.tabua >= limite) tmpV.y = -50
      tmpM.compose(tmpV, p.q, UM)
      malhaPostes.setMatrixAt(i, tmpM)
    })
    malhaPostes.instanceMatrix.needsUpdate = true
  }, [malhaPostes, postes, limite])
  useEffect(() => {
    if (!malhaCorda) return
    // Corda: de um poste ao próximo do mesmo lado (os postes vêm em pares, lado -1 e +1).
    for (let i = 0; i < postes.length; i++) {
      const a = postes[i]
      const b = postes[i + 2]
      const visivel = inteira && a && b && b.tabua < limite
      if (!a || !b || !visivel) {
        tmpM.makeScale(0, 0, 0)
        malhaCorda.setMatrixAt(i, tmpM)
        continue
      }
      tmpA.copy(a.pos).setY(a.pos.y + ALTURA_DA_CORDA)
      tmpB.copy(b.pos).setY(b.pos.y + ALTURA_DA_CORDA)
      tmpD.subVectors(tmpB, tmpA)
      const comprimento = tmpD.length()
      tmpQ.setFromUnitVectors(FRENTE, tmpD.normalize())
      tmpV.set(1, 1, comprimento)
      tmpM.compose(tmpA, tmpQ, tmpV)
      malhaCorda.setMatrixAt(i, tmpM)
    }
    malhaCorda.instanceMatrix.needsUpdate = true
  }, [malhaCorda, postes, limite, inteira])
  return (
    <>
      <instancedMesh
        ref={setMalhaTabuas}
        args={[pecas.tabua.geometria, pecas.tabua.material as Material, tabuas.length]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={setMalhaPostes}
        args={[pecas.poste.geometria, pecas.poste.material as Material, postes.length]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={setMalhaCorda}
        args={[pecas.corda.geometria, pecas.corda.material as Material, postes.length]}
        frustumCulled={false}
      />
    </>
  )
}

/**
 * A tinta da ilha a cada quadro: a chegada da ponte e os seis pedaços do Quadro das Cores (o feito
 * escorre; a primeira leitura vai na hora). Devolve a cor média, para as formas simples.
 */
function usePinturaDaIlha(ilha: Ilha, chegada: number): number {
  const { loja, plataforma } = useJogo()
  const desafios = lojaDosDesafios(loja, plataforma)
  const cores = useDesafios(desafios, (s) => s.cores)
  const pintura = pinturaDaIlha(ilha)
  // O catálogo pode faltar; a pintura usa somente posições confirmadas desta pessoa.
  const alvo = useMemo(
    () => pedacosPintados(null, cores.ilhas.find((i) => i.id === ilha.id)?.quadros),
    [cores, ilha.id],
  )
  const primeira = useRef(true)
  useFrame((_, dt) => {
    pintura.uniforms.uArqChegada.value = chegada
    andarPedacos(pintura.uniforms.uArqPedacos.value, alvo, Math.min(dt, 0.1), primeira.current)
    primeira.current = false
  })
  return corMedia(chegada, alvo)
}

/**
 * Quanto a ponte nova já se montou e a cor já escorreu (0 a 1). A ponte que a pessoa ainda não viu
 * chegar espera a cena da subida de posto (`mundo/cena-da-chegada.tsx`): fechada e cinza até lá,
 * e se monta durante ela. Depois de vista, fica inteira.
 */
function useChegada(ilha: Ilha, aberta: boolean): number {
  const { loja } = useJogo()
  const jaViu = useEstado((s) => s.salvamento.pontesVistas.includes(ilha.id))
  const naCena = useChegadaDaPonte(loja, (c) => c.ilha === ilha.id)
  const tempo = useChegadaDaPonte(loja, (c) => (c.ilha === ilha.id ? c.tempo : 0))
  const menos = useChegadaDaPonte(loja, (c) => c.menosMovimento)
  if (!aberta) return 0
  if (jaViu) return 1
  return naCena ? progressoDaChegada(tempo, menos) : 0
}

function IlhaComPonte({ ilha, centro }: { ilha: Ilha; centro: { x: number; z: number } }) {
  const { movimento } = useJogo()
  const jornada = useEstado((s) => s.jornada)
  const aberta = ilhaAberta(ilha.id, jornada)
  const chegada = useChegada(ilha, aberta)
  const cor = usePinturaDaIlha(ilha, aberta ? chegada : 0)
  const troca = useRef<Troca>({ opacidade: 0 }).current
  const { estado, preparada } = useIlhaCompleta(ilha, centro, aberta, troca)
  // A ilha aberta ganha as rodas de boias dela: dá para nadar em volta (a das Nuvens fica no céu).
  // No Bosque o meio da roda vai para o lado da ponta de campo; o Recife tem também as do navio e
  // do labirinto (`rodasDaIlhaNoModelo`).
  const rodas = useMemo(() => {
    const g = giroDaIlha(ilha)
    return rodasDaIlhaNoModelo(ilha, BOIAS_DA_ILHA_DO_ANEL).map((r) => ({
      x: centro.x + r.x * Math.cos(g) + r.z * Math.sin(g),
      z: centro.z - r.x * Math.sin(g) + r.z * Math.cos(g),
      livre: r.livre,
    }))
  }, [centro, ilha])
  const temRoda = aberta && ilha.id !== 'nuvens'
  useEffect(() => {
    if (!temRoda) return
    movimento.rodasDeNado.push(...rodas)
    return () => {
      for (const roda of rodas) {
        const i = movimento.rodasDeNado.indexOf(roda)
        if (i >= 0) movimento.rodasDeNado.splice(i, 1)
      }
    }
  }, [temRoda, rodas, movimento])
  return (
    <>
      <IlhaDoAnel
        ilha={ilha}
        centro={centro}
        cor={cor}
        estado={estado}
        preparada={preparada}
        troca={troca}
      />
      <Ponte ilha={ilha} inteira={aberta} tabuasVisiveis={chegada} />
      {temRoda &&
        rodas.map((roda, i) => (
          <Boias
            // biome-ignore lint/suspicious/noArrayIndexKey: as rodas de uma ilha são fixas e na ordem
            key={i}
            roda={roda}
            outras={rodas.filter((r) => r !== roda)}
          />
        ))}
    </>
  )
}

export function Anel() {
  const ilhas = useMemo(() => ilhasEmVolta(), [])
  // A lista dos desafios pinta os pedaços de todas as ilhas: lida uma vez ao abrir o jogo.
  const { loja, plataforma } = useJogo()
  useEffect(() => {
    const desafios = lojaDosDesafios(loja, plataforma)
    void desafios.getState().carregar()
    return () => desafios.getState().cancelar()
  }, [loja, plataforma])
  return (
    <>
      <Boias roda={RODA_DA_ILHA_CENTRAL} />
      {ilhas.map(({ ilha, centro }) => (
        <IlhaComPonte key={ilha.id} ilha={ilha} centro={centro} />
      ))}
    </>
  )
}

import { useFrame } from '@react-three/fiber'
import { RigidBody, TrimeshCollider } from '@react-three/rapier'
import { ilha } from '@sistemazero/arquipelago-contracts'
import { useMemo, useRef, useState } from 'react'
import { BufferAttribute, type BufferGeometry, Color, PlaneGeometry } from 'three'
import { useJogo } from '../estado/contexto'
import { lanternaDoZappy } from '../sistemas/borroes'
import { jogoPausado } from '../sistemas/pausa'
import { PERCURSO_DA_PRAIA } from '../sistemas/percurso'
import { momentoDoDia } from '../sistemas/tempo-do-dia'
import { BorroesDaIlha } from './borroes-da-ilha'
import { CataVento } from './cata-vento'
import {
  ALTURA_DO_PIER,
  ARVORES,
  COLISORES_DO_PIER,
  colisoresDasArvores,
  variedadeDaArvore,
} from './colisao-da-ilha-central'
import { Colisores } from './colisores'
import { type ColisorDaIlha, lerColisores } from './colisores-da-ilha'
import { type CoresDoColetavel, CorridaNaIlha } from './corrida-na-ilha'
import { lugarDoQuadroNaSuaIlha } from './lugar-do-quadro'
import { DISTANCIA_DOS_LUMIS_DA_PRAIA, LUGARES_DOS_LUMIS_DA_PRAIA } from './lugares-da-praia'
import { LunetaDoPier } from './luneta'
import { alturaDaIlha, chaoEm, PIER, RAIO_DO_RASO } from './medidas'
import { ComReserva, copiarNo, MODELOS, materiaisDe, useModelo } from './modelos'
import { percursoDaPraia } from './percursos-das-ilhas'
import { QuadroDasCores } from './quadro-das-cores'

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

/**
 * O chão do Blender com os enfeites. Moitas e pedras colidem pelos nós `col-*` do arquivo (lidos
 * junto com o desenho, então só existem quando ele aparece); capim, flores, pedras do caminho e
 * estrelas do mar não colidem.
 */
function ChaoDoModelo() {
  const raiz = useModelo(MODELOS.terreno)
  const { chao, enfeites, espuma, colisores } = useMemo(() => {
    const espuma = copiarNo(raiz, 'espuma', true)
    // A espuma é desenhada depois do mar (os dois são translúcidos).
    espuma.renderOrder = 2
    for (const m of materiaisDe(espuma)) m.depthWrite = false
    return {
      chao: copiarNo(raiz, 'chao'),
      enfeites: copiarNo(raiz, 'enfeites'),
      espuma,
      colisores: lerColisores(raiz),
    }
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
      <Colisores lista={colisores} />
      <CorridaDaPraia colisores={colisores} />
      <BorroesDaIlha ilha="sua-ilha" ancoras={LUMIS_DA_PRAIA} meio={MEIO_DA_ILHA} />
      <LanternaDoZappy />
    </>
  )
}

const MEIO_DA_ILHA = { x: 0, y: 0, z: 0 }
/** Os lugares dos Lumis da praia no mundo (a altura do chão em cada um). */
const LUMIS_DA_PRAIA = LUGARES_DOS_LUMIS_DA_PRAIA.map(({ angulo }) => {
  const a = (angulo * Math.PI) / 180
  const x = Math.cos(a) * DISTANCIA_DOS_LUMIS_DA_PRAIA
  const z = Math.sin(a) * DISTANCIA_DOS_LUMIS_DA_PRAIA
  return { x, y: alturaDaIlha(x, z), z }
})

/**
 * A lanterna da HUD da proposta: na primeira noite, quem ainda não tem ganha a lanterna do Zappy
 * (uma tentativa por noite; sem gravar, como na visita ou no suporte, nada muda). O Bento continua
 * dando outra se ela sumir da mochila.
 */
function LanternaDoZappy() {
  const { loja, ambiente } = useJogo()
  const tentou = useRef<number | null>(null)
  useFrame(() => {
    if (!ambiente.noite) return
    const s = loja.getState()
    if (jogoPausado(s) || s.visita) return
    const noite = momentoDoDia(Date.now(), Date.parse(s.salvamento.criadoEm)).dia
    if (tentou.current === noite) return
    tentou.current = noite
    const r = lanternaDoZappy(s.salvamento)
    if (!r) return
    s.mudar(() => r.salvamento)
    if (loja.getState().salvamento === r.salvamento) s.dizer(r.fala)
  })
  return null
}

/** A conchinha da volta pela praia: madrepérola com brilho de areia. */
const CORES_DA_CONCHA: CoresDoColetavel = {
  nucleo: '#fff6ea',
  brilho: '#ffd9b0',
  degrade: ['rgba(255,247,236,1)', 'rgba(255,214,170,0.55)', 'rgba(255,190,140,0)'],
}

/** A volta pela praia (V19), lida das pedras do `terreno.glb`: só existe com o chão do modelo. */
function CorridaDaPraia({ colisores }: { colisores: readonly ColisorDaIlha[] }) {
  const praia = useMemo(() => percursoDaPraia(colisores, RAIO_DO_RASO), [colisores])
  if (!praia) return null
  return (
    <CorridaNaIlha
      ilhaId="sua-ilha"
      config={PERCURSO_DA_PRAIA}
      pontos={praia}
      largada={praia.largada}
      // Ninguém cai na areia: as paradas ficam no chão; entrar no mar volta à última pedra.
      alturaDoChao={Number.NEGATIVE_INFINITY}
      cores={CORES_DA_CONCHA}
    />
  )
}

const VERDES = ['#3f9a4f', '#58b05a', '#2f8a5f', '#6cc46a']

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

const COLISORES_DAS_ARVORES = colisoresDasArvores()

function Arvores() {
  return (
    <>
      {ARVORES.map(([x, z, s], i) => {
        const y = alturaDaIlha(x, z)
        return (
          <group key={`${x},${z}`} position={[x, y, z]} scale={s}>
            <ComReserva reserva={<ArvoreDeAntes i={i} />}>
              <ArvoreDoModelo nome={variedadeDaArvore(x, z, i)} giro={i * 1.7} />
            </ComReserva>
          </group>
        )
      })}
      {/* Fora do grupo com escala: as medidas já vêm no mundo. */}
      <Colisores lista={COLISORES_DAS_ARVORES} />
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

/**
 * O píer do Blender, com o barquinho; o lampião da ponta acende à noite. Estacas, poste e lanterna
 * do lampião e o casco do barquinho colidem pelos nós `col-*` do arquivo. O barquinho é um nó à
 * parte (`barquinho-decorativo`, com o casco no `col-barco-1`) para o barco da viagem poder
 * ficar no lugar dele; as âncoras `barco` e `embarque` dizem onde (fase3-04).
 */
function PierDoModelo() {
  const { ambiente, movimento } = useJogo()
  const [viagemDisponivel, definirDisponivel] = useState(false)
  const raiz = useModelo(MODELOS.pier)
  const { pier, barquinho, lanternas, colisores } = useMemo(() => {
    const copia = copiarNo(raiz, 'pier', true)
    return {
      pier: copia,
      barquinho: copiarNo(raiz, 'barquinho-decorativo'),
      lanternas: materiaisDe(copia, 'lanterna'),
      colisores: lerColisores(raiz),
    }
  }, [raiz])
  useFrame(() => {
    if (viagemDisponivel !== (movimento.barco !== null)) definirDisponivel(movimento.barco !== null)
    for (const m of lanternas) m.emissiveIntensity = ambiente.noite ? 2.2 : 0
  })
  const semBarquinho = useMemo(() => colisores.filter((c) => c.nome !== 'col-barco-1'), [colisores])
  return (
    <>
      <primitive object={pier} />
      {!viagemDisponivel && <primitive object={barquinho} />}
      <Colisores lista={viagemDisponivel ? semBarquinho : colisores} />
    </>
  )
}

function Pier() {
  return (
    <group position={[PIER.x, 0, PIER.z]}>
      <ComReserva reserva={<PierDeAntes />}>
        <PierDoModelo />
      </ComReserva>
      <Colisores lista={COLISORES_DO_PIER} />
    </group>
  )
}

export function IlhaCentral() {
  return (
    <>
      <Terreno />
      <Arvores />
      <Pier />
      <LunetaDoPier />
      <CataVento />
      <ComReserva reserva={null}>
        <QuadroDasCores ilha={SUA_ILHA} centro={CENTRO} lugar={LUGAR_DO_QUADRO} />
      </ComReserva>
    </>
  )
}

const SUA_ILHA = ilha('sua-ilha')
const CENTRO = { x: 0, z: 0 } as const
const LUGAR_DO_QUADRO = lugarDoQuadroNaSuaIlha()

import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  type AnimationClip,
  AnimationMixer,
  type Group,
  type Material,
  type Mesh,
  MeshStandardMaterial,
  type Object3D,
  Vector3,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import balaoUrl from '../assets/ilhas/nuvens-balao.glb'
import { lojaDoConforto } from '../estado/conforto'
import { useJogo } from '../estado/contexto'
import { useToque } from '../estado/preferencias'
import { BALAO, criarVoo, guardarBalao, podeSubirNoBalao } from '../sistemas/balao'
import { CORPO } from '../sistemas/corpo'
import { jogoPausado } from '../sistemas/pausa'
import { paraOMundo } from './bosque'
import { liberarObjeto } from './carregar-ilha'
import { gruposDoColisor } from './grupos'
import { useInterativo } from './interativos'

type Ponto = { x: number; y: number; z: number }

/** Com menos movimento (aparelho ou menu), o clipe `flutuar` toca nesta fração da velocidade. */
const FLUTUAR_COM_MENOS_MOVIMENTO = 0.35
/** O cesto do `nuvens-balao.glb`: 1,1 × 0,82 × 1,1 m, com a base em y = 0. */
const CESTO = { meio: [0.55, 0.41, 0.55] as [number, number, number] }
/** O brilho da chama: apagada (só o piloto) e com o fogo aceso. */
const CHAMA = { piloto: 0.35, acesa: 2.2 }
/** Os pés de quem olha o cesto (o rótulo é lido a cada quadro, sem alocar). */
const pes = { x: 0, y: 0, z: 0 }

export const FALA_DO_BALAO = {
  teclado: 'Segure espaço para acender o fogo e subir. Solte e o balão desce devagar.',
  toque: 'Segure Subir para acender o fogo e subir. Solte e o balão desce devagar.',
} as const

interface ArteDoBalao {
  cena: Object3D
  /** O nó `balao`, que o clipe `flutuar` sobe, desce e balança. */
  no: Object3D
  clipes: AnimationClip[]
  chama: MeshStandardMaterial[]
  soltar: () => void
}

/** O `nuvens-balao.glb`, sem cache global: sai da memória junto com a ilha (como os corais). */
async function carregarBalao(): Promise<ArteDoBalao> {
  const g = await new GLTFLoader().loadAsync(new URL(balaoUrl, import.meta.url).href)
  const soltar = () => liberarObjeto(g.scene)
  const no = g.scene.getObjectByName('balao')
  if (!no) {
    soltar()
    throw new Error('nuvens-balao sem o nó balao')
  }
  const chama = new Set<MeshStandardMaterial>()
  g.scene.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh) return
    for (const mat of ([] as Material[]).concat(m.material)) {
      if (mat instanceof MeshStandardMaterial && mat.name === 'chama') {
        mat.emissive.copy(mat.color)
        chama.add(mat)
      }
    }
  })
  return { cena: g.scene, no, clipes: g.animations, chama: [...chama], soltar }
}

/** A âncora `balao` do `nuvens.glb` no mundo (a base do cesto parado), ou `null` sem ela. */
export function lugarDoBalao(modelo: Object3D, meio: Ponto, giro: number): Ponto | null {
  const no = modelo.getObjectByName('balao')
  if (!no) return null
  return paraOMundo(no.position, meio, giro, { x: 0, y: 0, z: 0 })
}

/**
 * O balão da Ilha das Nuvens (fase4-09): parado na âncora `balao`, "Subir no balão" perto dele e o
 * voo pelo modo `balao` (`sistemas/modos/balao.ts`). O cesto parado segura só o corpo. Montado
 * pelo `NuvensVivo`: só existe com a ilha completa ativa.
 */
export function BalaoDasNuvens({
  modelo,
  meio,
  giro,
}: {
  modelo: Object3D
  meio: Ponto
  giro: number
}) {
  const [arte, definirArte] = useState<ArteDoBalao | null>(null)
  useEffect(() => {
    let vivo = true
    let soltar: (() => void) | null = null
    carregarBalao()
      .then((a) => {
        if (!vivo) {
          a.soltar()
          return
        }
        soltar = a.soltar
        definirArte(a)
      })
      // Sem o balão, a ilha fica como era: nada a pilotar até ela carregar de novo.
      .catch(() => {})
    return () => {
      vivo = false
      soltar?.()
    }
  }, [])
  const casa = useMemo(() => lugarDoBalao(modelo, meio, giro), [modelo, meio, giro])
  if (!arte || !casa) return null
  return <Balao arte={arte} casa={casa} meio={meio} giro={giro} />
}

function Balao({
  arte,
  casa,
  meio,
  giro,
}: {
  arte: ArteDoBalao
  casa: Ponto
  meio: Ponto
  giro: number
}) {
  const { loja, movimento, pedidos, rastro } = useJogo()
  const toque = useToque()
  const aparelhoPedeMenos = useReducedMotion()
  // O tampo da ilha é o y da âncora (o chão onde o cesto para).
  const voo = useMemo(() => criarVoo(casa, { x: meio.x, z: meio.z }, casa.y), [casa, meio])
  const grupo = useRef<Group>(null)
  const noMundo = useMemo(() => new Vector3(), [])
  const mixer = useMemo(() => new AnimationMixer(arte.cena), [arte])
  useEffect(() => {
    const clipe = arte.clipes.find((c) => c.name === 'flutuar')
    if (clipe) mixer.clipAction(clipe).play()
    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(arte.cena)
    }
  }, [arte, mixer])

  useEffect(() => {
    movimento.balao = voo
    return () => {
      // A ilha saiu com a criança no cesto: o balão volta ao lugar e o corpo volta a andar.
      guardarBalao(voo)
      if (movimento.balao === voo) movimento.balao = null
    }
  }, [movimento, voo])

  useInterativo('nuvens:balao', {
    x: casa.x,
    z: casa.z,
    raio: BALAO.alcance,
    rotulo: () => {
      if (movimento.modo !== 'chao' || voo.fase !== 'parado') return null
      pes.x = rastro.x
      pes.y = rastro.y - CORPO.doCentroAoPe - CORPO.folga
      pes.z = rastro.z
      return podeSubirNoBalao(voo, pes, movimento.noChao) ? 'Subir no balão' : null
    },
    agir: () => {
      movimento.pedido = { tipo: 'balao', voo }
      loja.getState().dizer(toque ? FALA_DO_BALAO.toque : FALA_DO_BALAO.teclado)
    },
  })

  // Antes do personagem (que desenha a criança no cesto) e da câmera.
  useFrame((_, dtBruto) => {
    const dt = Math.min(dtBruto, 0.1)
    const s = loja.getState()
    const menos = aparelhoPedeMenos || lojaDoConforto(loja).getState().conforto.menosMovimento
    if (!jogoPausado(s)) mixer.update(menos ? dt * FLUTUAR_COM_MENOS_MOVIMENTO : dt)
    const g = grupo.current
    if (!g) return
    const p = voo.fase === 'voo' ? voo.pe : voo.casa
    g.position.set(p.x, p.y, p.z)
    g.updateMatrixWorld(true)
    arte.no.getWorldPosition(noMundo)
    voo.visual.x = noMundo.x
    voo.visual.y = noMundo.y
    voo.visual.z = noMundo.z
    const brilho = voo.fase === 'voo' && voo.fogo ? CHAMA.acesa : CHAMA.piloto
    for (const m of arte.chama) m.emissiveIntensity = brilho
    // Desceu perto do lugar do balão: a criança sai para o lado, fora do cesto parado.
    if (voo.saida) {
      pedidos.teleporte = {
        x: voo.saida.x,
        y: voo.saida.y + CORPO.doCentroAoPe + CORPO.folga + 0.05,
        z: voo.saida.z,
      }
      voo.saida = null
    }
  }, -0.5)

  return (
    <>
      <group ref={grupo} rotation-y={giro}>
        <primitive object={arte.cena} />
      </group>
      {/* O cesto parado segura só quem anda em volta (no modo `balao` o corpo passa por ele). */}
      <RigidBody
        type="fixed"
        colliders={false}
        userData={{ balao: true }}
        position={[casa.x, casa.y + CESTO.meio[1], casa.z]}
        rotation-y={giro}
      >
        <CuboidCollider args={CESTO.meio} {...gruposDoColisor(true)} />
      </RigidBody>
    </>
  )
}

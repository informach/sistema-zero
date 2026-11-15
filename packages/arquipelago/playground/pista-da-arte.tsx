import { useGLTF } from '@react-three/drei'
import { advance, Canvas, useThree } from '@react-three/fiber'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { AVATAR_CATALOG } from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Box3, Vector3 } from 'three'
import { Contexto, type ContextoDoJogo } from '../src/estado/contexto'
import { criarLoja } from '../src/estado/loja'
import { AvatarDoJogo } from '../src/personagem/avatar-do-jogo'
import { CORPO } from '../src/sistemas/corpo'
import type { EntradaDaLocomocao } from '../src/sistemas/locomocao'
import { ESCADA } from '../src/sistemas/modos/escada'

/**
 * A pista de conferência com as peças REAIS da arte (`jogo2_pista`): uma peça por página
 * (`/pista-da-arte?peca=tora`), na origem, e o avatar posto pelo `pontos_de_jogo` dela, fazendo o
 * que o jogo faz ali (sentar, deitar, subir, pendurar, equilibrar, escorregar, embarcar, passar
 * pelo vão, plantar). Tudo na medida da arte (o avatar no tamanho de verdade, 1,156 m). As peças
 * vêm de `.cache/pista-da-arte/` (`preparar-pista-da-arte.ts`, fora do git). `?quadros=1`: o
 * tempo só anda por `__quadros(n)`, para as fotos (`fotos-da-pista-da-arte.ts`).
 */
const q = new URLSearchParams(location.search)
const QUADRO_A_QUADRO = q.get('quadros') === '1'

type V3 = [number, number, number]
interface PontoDeJogo {
  tipo: string
  ponto?: V3
  posicao?: V3
  direcao?: V3
  de?: V3
  ate?: V3
  fora?: V3
  pe?: V3
  topo?: V3
  pontos?: (V3 | { posicao: V3 })[]
  celulas?: [number, number][]
  tamanho_celula_m?: number
  animacao?: string
}
interface PecaDaPista {
  id: string
  rotulo: string
  glb: string
  pontos: PontoDeJogo[]
}

const lugar = (id: string) =>
  (AVATAR_CATALOG.base.skeleton.game.clips.find((c) => c.id === id)?.place ?? {}) as Record<
    string,
    number
  >
const giroDe = (d: V3 | undefined) => (d ? Math.atan2(d[0], d[2]) : 0)

/** Onde o avatar fica (a origem do clipe), para onde olha e o que faz, pelo ponto de jogo. */
export interface PoseNaPista {
  origem: V3
  giro: number
  movimento: EntradaDaLocomocao
  /** A câmera, no referencial do avatar (x para o lado, z para a frente dele). */
  camera: V3
}
const parado = (extra: Partial<EntradaDaLocomocao>): EntradaDaLocomocao => ({
  velocidade: 0,
  noChao: true,
  velY: 0,
  nadando: false,
  especial: null,
  ...extra,
})

export function poseNaPista(p: PontoDeJogo, caixa: Box3): PoseNaPista | null {
  const frente: V3 = [1.6, 1.0, 2.2]
  const fora: V3 = [1.5, 0.6, -2.4]
  switch (p.tipo) {
    case 'sentar': {
      if (!p.ponto) return null
      if (p.animacao === 'sentado_no_barco')
        return {
          origem: p.ponto,
          giro: giroDe(p.direcao),
          movimento: parado({ especial: 'barco' }),
          camera: frente,
        }
      // O `sentado` tem o assento a `assento_m` acima da origem (a origem fica no chão do clipe).
      const assento = lugar('sentado').assento_m ?? 0.3
      return {
        origem: [p.ponto[0], p.ponto[1] - assento, p.ponto[2]],
        giro: giroDe(p.direcao),
        movimento: parado({ especial: 'sentar' }),
        camera: frente,
      }
    }
    case 'deitar':
      return p.ponto
        ? {
            origem: p.ponto,
            giro: giroDe(p.direcao),
            movimento: parado({ especial: 'deitar' }),
            camera: [2.2, 1.4, 0.6],
          }
        : null
    case 'agarrar': {
      if (!p.de || !p.ate || !p.fora) return null
      // As mãos do `pendurar_borda` ficam `maos_m` acima e `a_frente_m` à frente da origem.
      const l = lugar('pendurar_borda')
      const m: V3 = [(p.de[0] + p.ate[0]) / 2, (p.de[1] + p.ate[1]) / 2, (p.de[2] + p.ate[2]) / 2]
      const af = l.a_frente_m ?? 0.25
      return {
        origem: [m[0] + p.fora[0] * af, m[1] - (l.maos_m ?? 0.6), m[2] + p.fora[2] * af],
        giro: giroDe([-p.fora[0], 0, -p.fora[2]]),
        movimento: parado({ especial: 'borda' }),
        camera: fora,
      }
    }
    case 'subir': {
      if (!p.pe || !p.topo) return null
      // A um terço da subida, de frente para os degraus, afastada deles o que o jogo afasta
      // (`ESCADA.afastamento`, na medida da arte): a escada fica do lado `−Z` (a `parede`).
      const t = 1 / 3
      const afasta = ESCADA.afastamento / CORPO.medidas.scale
      return {
        origem: [
          p.pe[0] + (p.topo[0] - p.pe[0]) * t,
          p.pe[1] + (p.topo[1] - p.pe[1]) * t,
          p.pe[2] + (p.topo[2] - p.pe[2]) * t + afasta,
        ],
        giro: Math.PI,
        movimento: parado({ especial: 'escada', velocidade: 0.3 }),
        camera: fora,
      }
    }
    case 'equilibrar':
      return p.de && p.ate
        ? {
            origem: [(p.de[0] + p.ate[0]) / 2, (p.de[1] + p.ate[1]) / 2, (p.de[2] + p.ate[2]) / 2],
            giro: giroDe([p.ate[0] - p.de[0], 0, p.ate[2] - p.de[2]]),
            movimento: parado({ especial: 'equilibrio', velocidade: 0.8 }),
            camera: frente,
          }
        : null
    case 'escorregar': {
      const pts = (p.pontos ?? []).filter((x): x is V3 => Array.isArray(x))
      const a = pts[2]
      const b = pts[3]
      if (!a || !b) return null
      return {
        origem: a,
        giro: giroDe([b[0] - a[0], 0, b[2] - a[2]]),
        movimento: parado({ especial: 'escorregar' }),
        camera: [2.4, 1.0, 1.6],
      }
    }
    case 'entrar': {
      if (!p.posicao) return null
      const d = p.direcao ?? [0, 0, 1]
      return {
        // Logo antes do vão, andando para ele (de frente para a direção do vão, ao contrário).
        origem: [p.posicao[0] + d[0] * 0.6, 0, p.posicao[2] + d[2] * 0.6],
        giro: giroDe([-d[0], 0, -d[2]]),
        movimento: parado({ velocidade: 1.4 }),
        camera: [0.9, 1.3, -2.6],
      }
    }
    case 'plantar': {
      const c = p.celulas?.reduce((m, x) => (x[1] > m[1] ? x : m), p.celulas[0] ?? [0, 0])
      if (!c) return null
      // Em pé na frente do canteiro, a `beira_a_frente_min_m` da moldura; a mão cai na terra.
      const l = lugar('plantar')
      const z = Math.max(
        caixa.max.z + (l.beira_a_frente_min_m ?? 0.17),
        c[1] + (l.mao_a_frente_m ?? 0.3),
      )
      return {
        origem: [c[0], 0, z],
        giro: Math.PI,
        movimento: parado({ gesto: 'Plantar', gestoVez: 1 }),
        camera: [1.6, 1.0, -2.0],
      }
    }
    default:
      return null
  }
}

function Camera({ pose }: { pose: PoseNaPista }) {
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    const [cx, cy, cz] = pose.camera
    const s = Math.sin(pose.giro)
    const c = Math.cos(pose.giro)
    const [ox, oy, oz] = pose.origem
    camera.position.set(ox + cx * c + cz * s, oy + cy, oz - cx * s + cz * c)
    camera.lookAt(ox, oy + 0.5, oz)
  }, [camera, pose])
  return null
}

function Peca({ peca, indice }: { peca: PecaDaPista; indice: number | null }) {
  const { scene } = useGLTF(`/pista-da-arte/arquivos/${peca.glb}`)
  const caixa = useMemo(() => new Box3().setFromObject(scene), [scene])
  // `?ponto=n` escolhe; sem ele, o primeiro ponto em que o avatar faz alguma coisa (na canoa, o
  // `embarcar` é só por onde se entra: vale o `sentar`).
  const pedido = indice === null ? undefined : peca.pontos[indice]
  const ponto = pedido ?? peca.pontos.find((p) => poseNaPista(p, caixa))
  const pose = ponto ? poseNaPista(ponto, caixa) : null
  const movimento = useRef<EntradaDaLocomocao>(pose?.movimento ?? parado({}))
  useEffect(() => {
    // As fotos recomeçam o gesto (uma vez só, como plantar) no instante em que começam a contar:
    // a página ganha quadros a mais enquanto carrega.
    ;(globalThis as { __recomecar?: () => void }).__recomecar = () => {
      movimento.current = { ...movimento.current, gestoVez: (movimento.current.gestoVez ?? 0) + 1 }
    }
    ;(globalThis as { __pista?: unknown }).__pista = {
      peca: peca.id,
      tipo: ponto?.tipo ?? null,
      origem: pose?.origem ?? null,
    }
  }, [peca.id, ponto, pose])
  return (
    <>
      <primitive object={scene} />
      {pose ? (
        <>
          <Camera pose={pose} />
          <group position={pose.origem} rotation-y={pose.giro} scale={1 / CORPO.medidas.scale}>
            <AvatarDoJogo movimento={movimento} />
          </group>
        </>
      ) : null}
    </>
  )
}

function Pista() {
  const [pecas, setPecas] = useState<PecaDaPista[] | null>(null)
  useEffect(() => {
    void fetch('/pista-da-arte/arquivos/pista.json')
      .then((r) => r.json())
      .then((j: { pecas: PecaDaPista[] }) => setPecas(j.pecas))
  }, [])
  const contexto = useMemo(() => {
    const loja = criarLoja({
      salvamento: criarSalvamentoInicial(new Date()),
      jornada: 2,
      quarto: { theme: 'padrao', placedItems: [] } as never,
      avatar: { slots: {} },
      acesso: { liberado: true } as never,
      aoMudar: () => {},
    })
    return { loja } as unknown as ContextoDoJogo
  }, [])
  const peca = pecas?.find((p) => p.id === q.get('peca')) ?? pecas?.[0]
  return (
    <Contexto.Provider value={contexto}>
      <Canvas
        shadows
        frameloop={QUADRO_A_QUADRO ? 'never' : 'always'}
        camera={{ fov: 45, near: 0.05, far: 200 }}
      >
        <color attach="background" args={['#cfe8f7']} />
        <hemisphereLight args={['#ffffff', '#6a8f55', 1.4]} />
        <directionalLight position={[4, 8, 3]} intensity={1.6} castShadow />
        <mesh rotation-x={-Math.PI / 2} position-y={-0.001} receiveShadow>
          <planeGeometry args={[40, 40]} />
          <meshStandardMaterial color="#a9d48a" />
        </mesh>
        <Suspense fallback={null}>
          {peca ? (
            <Peca peca={peca} indice={q.get('ponto') === null ? null : Number(q.get('ponto'))} />
          ) : null}
        </Suspense>
      </Canvas>
      <p
        style={{
          position: 'fixed',
          top: 8,
          left: 12,
          margin: 0,
          font: '600 16px system-ui',
          color: '#1d2b4f',
        }}
      >
        {peca
          ? `${peca.rotulo} · ${(globalThis as { __pista?: { tipo?: string } }).__pista?.tipo ?? ''}`
          : 'carregando…'}
      </p>
    </Contexto.Provider>
  )
}

if (QUADRO_A_QUADRO) {
  // O `advance` do react-three-fiber conta em SEGUNDOS (o relógio dele começa em 0): 1/30 por
  // quadro. Em milissegundos, cada quadro virava um salto (o jogo corta em 0,1 s).
  let agora = 0
  ;(globalThis as { __quadros?: (n: number) => void }).__quadros = (n) => {
    for (let i = 0; i < n; i++) {
      agora += 1 / 30
      advance(agora)
    }
  }
}

const el = document.getElementById('jogo')
if (el) createRoot(el).render(<Pista />)

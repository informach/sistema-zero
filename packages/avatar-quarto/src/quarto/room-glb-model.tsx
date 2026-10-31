'use client'

import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import {
  Component,
  createContext,
  type ReactNode,
  type RefObject,
  Suspense,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import type { AnimationMixer, Group } from 'three'
import { roomGlbUrl } from './catalog'

/**
 * A cena pode animar? (o quarto liga quando há bichinho ou peça animada e o movimento é
 * permitido; o perfil público e o `prefers-reduced-motion` desligam). Sem animação o GLB fica na
 * pose de repouso.
 */
export const RoomMotionContext = createContext(false)

/** Pausa conserva a pose atual; é independente da preferência por uma cena sem movimento. */
export const RoomPausedContext = createContext(false)

/**
 * Clipes de andar e correr do gato e do cachorro (31/10/2026), para o jogo trocar pela velocidade
 * de quem acompanha a criança. O quarto toca todos os outros juntos (o parado é um clipe por
 * parte); tocar estes junto misturaria as pernas.
 */
export const CLIPES_SO_DO_JOGO: ReadonlySet<string> = new Set(['andar', 'correr'])

/**
 * O passo pedido pelo jogo a cada quadro: um dos `CLIPES_SO_DO_JOGO` (ou `null`, parado) e o ritmo
 * dele (1 = o ritmo do arquivo). Parado, os clipes do quarto tocam se `parado` for verdadeiro.
 */
export interface PassoDoGlb {
  clipe: string | null
  ritmo: number
}

/** Duração da troca entre o parado, o andar e o correr (s). */
const TROCA_DO_PASSO = 0.2

/**
 * Isola UMA peça: se o GLB não baixa, o `useGLTF` lança para fora do `<Suspense>` e derrubaria o
 * quarto inteiro com o que a criança estava montando. Aqui a peça cai no modelo de reserva (as
 * primitivas antigas). `resetKey` (o id) zera o erro ao trocar de peça.
 */
class GlbBoundary extends Component<
  { resetKey: string; fallback: ReactNode; children: ReactNode },
  { failed: boolean; key: string }
> {
  state = { failed: false, key: this.props.resetKey }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  static getDerivedStateFromProps(
    props: { resetKey: string },
    state: { failed: boolean; key: string },
  ) {
    return props.resetKey !== state.key ? { failed: false, key: props.resetKey } : null
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function GlbScene({
  url,
  passo,
  parado,
}: {
  url: string
  passo?: RefObject<PassoDoGlb>
  parado?: boolean
}) {
  const gltf = useGLTF(url, false, false)
  // Uma cópia por peça posicionada (duas camas no quarto não podem dividir o mesmo nó). Malhas e
  // materiais continuam compartilhados com o cache do `useGLTF`.
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene])
  const ref = useRef<Group>(null)
  const { actions, mixer } = useAnimations(gltf.animations, ref)
  const motion = useContext(RoomMotionContext)
  const paused = useContext(RoomPausedContext)
  useEffect(() => {
    mixer.timeScale = paused ? 0 : 1
    return () => {
      mixer.timeScale = 1
    }
  }, [mixer, paused])
  useEffect(() => {
    if (!motion || passo) return
    const playing = Object.entries(actions)
      .filter(([nome]) => !CLIPES_SO_DO_JOGO.has(nome))
      .map(([, a]) => a)
      .filter((a) => a != null)
    for (const action of playing) action.reset().play()
    return () => {
      for (const action of playing) action.stop()
    }
  }, [actions, motion, passo])
  return (
    <group ref={ref}>
      <primitive object={scene} />
      {passo ? (
        <PassoDoJogo
          actions={actions}
          mixer={mixer}
          passo={passo}
          parado={parado}
          paused={paused}
        />
      ) : null}
    </group>
  )
}

/**
 * Com o passo do jogo, o parado (os clipes do quarto) e o andar ou o correr se revezam. Fica num
 * componente só dele: o quarto da plataforma não ganha um laço por quadro a mais.
 */
function PassoDoJogo({
  actions,
  mixer,
  passo,
  parado,
  paused,
}: {
  actions: ReturnType<typeof useAnimations>['actions']
  mixer: AnimationMixer
  passo: RefObject<PassoDoGlb>
  parado?: boolean
  paused: boolean
}) {
  const atual = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    return () => {
      atual.current = undefined
      for (const a of Object.values(actions)) a?.stop()
    }
  }, [actions])
  // Ligar ou desligar o parado (o menos movimento) vale já, mesmo sem trocar de clipe.
  const refazer = useRef(false)
  useEffect(() => {
    refazer.current = parado !== undefined
  }, [parado])
  useFrame(() => {
    const p = passo.current
    if (!p) return
    const nome = p.clipe && CLIPES_SO_DO_JOGO.has(p.clipe) && actions[p.clipe] ? p.clipe : null
    const acao = nome ? actions[nome] : null
    if (nome !== atual.current || refazer.current) {
      refazer.current = false
      const primeira = atual.current === undefined
      const fade = primeira ? 0 : TROCA_DO_PASSO
      for (const [n, a] of Object.entries(actions)) {
        if (!a) continue
        const doJogo = CLIPES_SO_DO_JOGO.has(n)
        const liga = doJogo ? n === nome : nome === null && parado === true
        if (liga && (!a.isRunning() || a.getEffectiveWeight() < 1)) {
          a.reset().setEffectiveWeight(1).fadeIn(fade).play()
        } else if (!liga && a.isRunning()) {
          if (fade > 0) a.fadeOut(fade)
          else a.stop()
        }
      }
      atual.current = nome
    }
    // Ritmo 0 é a pausa do jogo: congela tudo, inclusive o parado.
    mixer.timeScale = p.ritmo === 0 || paused ? 0 : 1
    if (acao && p.ritmo > 0) acao.timeScale = p.ritmo
  })
  return null
}

/**
 * Modelo de uma peça a partir do GLB feito no Blender (`public/room3d/items/<id>.glb`, nas duas
 * comunidades). Enquanto baixa, nada aparece no lugar; se falhar, aparece o `fallback`.
 */
export function RoomGlbModel({
  itemId,
  fallback,
  passo,
  parado,
}: {
  itemId: string
  fallback: ReactNode
  /**
   * O jogo troca o andar e o correr pela velocidade de quem acompanha (o quarto não passa). Ritmo 0
   * congela o modelo inteiro.
   */
  passo?: RefObject<PassoDoGlb>
  /** Com o `passo`: parado, tocar os clipes do quarto (o menos movimento desliga). */
  parado?: boolean
}) {
  return (
    <GlbBoundary resetKey={itemId} fallback={fallback}>
      <Suspense fallback={null}>
        <GlbScene url={roomGlbUrl(itemId)} passo={passo} parado={parado} />
      </Suspense>
    </GlbBoundary>
  )
}

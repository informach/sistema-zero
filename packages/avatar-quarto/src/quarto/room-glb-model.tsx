'use client'

import { useAnimations, useGLTF } from '@react-three/drei'
import {
  Component,
  createContext,
  type ReactNode,
  Suspense,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import type { Group } from 'three'
import { roomGlbUrl } from './catalog'

/**
 * A cena pode animar? (o quarto liga quando há bichinho ou peça animada e o movimento é
 * permitido; o perfil público e o `prefers-reduced-motion` desligam). Sem animação o GLB fica na
 * pose de repouso.
 */
export const RoomMotionContext = createContext(false)

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

function GlbScene({ url }: { url: string }) {
  const gltf = useGLTF(url, false, false)
  // Uma cópia por peça posicionada (duas camas no quarto não podem dividir o mesmo nó). Malhas e
  // materiais continuam compartilhados com o cache do `useGLTF`.
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene])
  const ref = useRef<Group>(null)
  const { actions } = useAnimations(gltf.animations, ref)
  const motion = useContext(RoomMotionContext)
  useEffect(() => {
    if (!motion) return
    const playing = Object.values(actions).filter((a) => a != null)
    for (const action of playing) action.reset().play()
    return () => {
      for (const action of playing) action.stop()
    }
  }, [actions, motion])
  return (
    <group ref={ref}>
      <primitive object={scene} />
    </group>
  )
}

/**
 * Modelo de uma peça a partir do GLB feito no Blender (`public/room3d/items/<id>.glb`, nas duas
 * comunidades). Enquanto baixa, nada aparece no lugar; se falhar, aparece o `fallback`.
 */
export function RoomGlbModel({ itemId, fallback }: { itemId: string; fallback: ReactNode }) {
  return (
    <GlbBoundary resetKey={itemId} fallback={fallback}>
      <Suspense fallback={null}>
        <GlbScene url={roomGlbUrl(itemId)} />
      </Suspense>
    </GlbBoundary>
  )
}

import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { AVATAR_CATALOG, avatarFileUrl } from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import { type RefObject, useMemo, useRef } from 'react'
import { type AnimationClip, type Bone, type Object3D, Quaternion } from 'three'

/**
 * Os objetos de mão do jogo (a lanterna). O objeto é do pack do avatar: uma peça presa ao esqueleto,
 * que o `PackAvatarRig` monta (`equipment`). A arte fez também a pose dos dedos fechados no cabo, um
 * clipe de camada: vale por cima de qualquer animação, só nos ossos dos dedos.
 */
export const LANTERNA_NA_MAO: readonly string[] = ['mao_lanterna']
export const SEM_OBJETO_NA_MAO: readonly string[] = []

/** A camada dos dedos para um objeto: a que não acompanha uma animação (vale sempre). */
export function camadaDosDedos(objeto: string) {
  return AVATAR_CATALOG.base.skeleton.game.layers?.find(
    (c) => c.with === undefined && c.objects.includes(objeto),
  )
}

/** O giro de cada osso da camada, no primeiro quadro do clipe dela (a pose dos dedos é parada). */
export function poseDaCamada(
  clipes: readonly AnimationClip[],
  camada: { id: string; bones: readonly string[] },
): Map<string, Quaternion> {
  const pose = new Map<string, Quaternion>()
  const clipe = clipes.find((c) => c.name === camada.id)
  if (!clipe) return pose
  for (const osso of camada.bones) {
    const trilha = clipe.tracks.find((t) => t.name === `${osso}.quaternion`)
    if (trilha && trilha.values.length >= 4) pose.set(osso, new Quaternion().fromArray(trilha.values))
  }
  return pose
}

/**
 * Fecha os dedos no cabo do objeto, depois da pose de cada quadro. Monta depois do avatar, dentro do
 * mesmo `Suspense`: o `useFrame` dele entra depois do mixer, e a pose dos dedos fica por cima da
 * animação que estiver tocando (também na pausa: o mixer reaplica a pose a cada quadro).
 */
export function DedosNoCabo({
  corpo,
  objeto,
}: {
  corpo: RefObject<Object3D | null>
  objeto: string
}) {
  const { animations } = useGLTF(
    avatarFileUrl(AVATAR_CATALOG.base.skeleton.game.file),
    false,
    false,
  )
  const pose = useMemo(() => {
    const camada = camadaDosDedos(objeto)
    return camada ? poseDaCamada(animations, camada) : new Map<string, Quaternion>()
  }, [animations, objeto])
  const dedos = useRef<[Bone, Quaternion][]>([])
  useFrame(() => {
    const raiz = corpo.current
    if (!raiz || pose.size === 0) return
    // O avatar pode remontar as peças (e o esqueleto): procura de novo se os ossos saíram da cena.
    if (dedos.current.length === 0 || !dedos.current[0]?.[0].parent) {
      dedos.current = []
      raiz.traverse((o) => {
        const giro = (o as Bone).isBone ? pose.get(o.name) : undefined
        if (giro) dedos.current.push([o as Bone, giro])
      })
    }
    for (const [osso, giro] of dedos.current) osso.quaternion.copy(giro)
  })
  return null
}

import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { AVATAR_CATALOG, avatarFileUrl } from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import { type RefObject, useEffect, useMemo, useRef } from 'react'
import { type AnimationClip, type Bone, type Object3D, Quaternion } from 'three'
import { PoseLimpa } from './pose-limpa'

/**
 * Os objetos de mão do jogo (a lanterna, a barra do planador). O objeto é do pack do avatar: uma peça presa ao esqueleto,
 * que o `PackAvatarRig` monta (`equipment`). A arte fez também a pose dos dedos fechados no cabo, um
 * clipe de camada: vale por cima de qualquer animação, só nos ossos dos dedos.
 */
export const LANTERNA_NA_MAO: readonly string[] = ['mao_lanterna']
/** A barra do planador, nas duas mãos (só no modo planar). */
export const BARRA_NAS_MAOS: readonly string[] = ['mao_barra_planador']
export const SEM_OBJETO_NA_MAO: readonly string[] = []

type CamadaDoJogo = NonNullable<typeof AVATAR_CATALOG.base.skeleton.game.layers>[number]

/** As camadas dos dedos (as que não acompanham uma animação: valem sempre). */
const camadasDosDedosDoCatalogo = (): CamadaDoJogo[] =>
  AVATAR_CATALOG.base.skeleton.game.layers?.filter((c) => c.with === undefined) ?? []

/** A camada dos dedos que o catálogo dá a um objeto (a primeira que o cita). */
export function camadaDosDedos(objeto: string) {
  return camadasDosDedosDoCatalogo().find((c) => c.objects.includes(objeto))
}

/**
 * Todas as camadas dos dedos para um objeto: as que o citam e, se nenhuma delas fecha a mão direita,
 * a da mão direita no cilindro fino. O objeto vai no encaixe `mao_direita`, e a arte fez só a
 * pegada esquerda à parte para a barra do planador (o "clipe espelhado"); a direita é a de sempre.
 */
export function camadasDosDedos(objeto: string): CamadaDoJogo[] {
  const todas = camadasDosDedosDoCatalogo()
  const doObjeto = todas.filter((c) => c.objects.includes(objeto))
  if (doObjeto.length === 0) return doObjeto
  const fechaADireita = (c: CamadaDoJogo) => c.bones.some((o) => o.startsWith('RightHand'))
  if (doObjeto.some(fechaADireita)) return doObjeto
  const direita = todas.find(fechaADireita)
  return direita ? [direita, ...doObjeto] : doObjeto
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
    if (trilha && trilha.values.length >= 4)
      pose.set(osso, new Quaternion().fromArray(trilha.values))
  }
  return pose
}

/**
 * Fecha os dedos no cabo do objeto, depois da pose de cada quadro. Monta depois do avatar, dentro do
 * mesmo `Suspense`: o `useFrame` dele entra depois do mixer, e a pose dos dedos fica por cima da
 * animação que estiver tocando. O mixer não reescreve um osso parado: ao sair (a lanterna guardada),
 * a pose dos dedos que o mixer deixou volta (`PoseLimpa`), senão a mão ficava fechada no nada.
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
    const todas = new Map<string, Quaternion>()
    for (const camada of camadasDosDedos(objeto))
      for (const [osso, giro] of poseDaCamada(animations, camada)) todas.set(osso, giro)
    return todas
  }, [animations, objeto])
  const dedos = useRef<[Bone, Quaternion][]>([])
  const limpa = useRef<PoseLimpa | null>(null)
  useEffect(
    () => () => {
      limpa.current?.soltar()
      limpa.current = null
    },
    [],
  )
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
      limpa.current = new PoseLimpa(dedos.current.map(([osso]) => osso))
    }
    limpa.current?.antes()
    for (const [osso, giro] of dedos.current) osso.quaternion.copy(giro)
    limpa.current?.depois()
  })
  return null
}

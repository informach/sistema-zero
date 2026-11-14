'use client'

import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame, useLoader } from '@react-three/fiber'
import {
  AVATAR_CATALOG,
  type AvatarCatalog,
  type AvatarSlots,
  avatarFileUrl,
  withEars,
} from '@sistemazero/core/avatar'
import {
  Component,
  type ReactNode,
  type RefObject,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import * as THREE from 'three'
import { useReducedMotion } from '../use-reduced-motion'
import { measureCharacter } from './measure'
import { instanteDaFoto } from './pack-clips'
import { copiarEsqueletoDoPack, prepararPecaDoPack, type TexturasDoPack } from './pack-instance'

/** A pose de quem está parado no pack. */
export const PACK_IDLE_POSE = 'parado_relaxado'

/**
 * As poses que ficam em laço (quem está parado respira e olha em volta). As outras (soco, chute,
 * defesa) fazem o movimento UMA vez e param no auge dele (`instanteDaFoto`): a pose para a foto,
 * que mostra o golpe, em vez de voltar ao começo e repetir.
 */
export const PACK_LOOP_POSES: ReadonlySet<string> = new Set(['parado_relaxado', 'parado_olhando'])

/**
 * A camada de cada encaixe (`prepararPecaDoPack`): o corpo embaixo, depois o que veste a pele
 * (rosto, cabelo, meias, calça) e por cima o que cobre outras peças (camiseta sobre a calça, tênis
 * sobre a meia, luva, chapéu sobre o cabelo). Encaixe novo sem camada fica no meio.
 */
export const CAMADA_DO_ENCAIXE: Readonly<Record<string, number>> = {
  corpo: 0,
  orelhas: 0,
  rosto: 1,
  cabelo: 1,
  meias: 1,
  calca: 1,
  bermuda: 1,
  roupa_cima: 2,
  roupa_inteira: 2,
  luvas: 2,
  calcado: 2,
  oculos: 2,
  acessorio_rosto: 2,
  chapeu: 2,
  costas: 2,
  fantasia: 2,
}
export const camadaDoEncaixe = (encaixe: string): number => CAMADA_DO_ENCAIXE[encaixe] ?? 1

/**
 * Uma peça que não baixa some sozinha, sem derrubar a tela (o `useGLTF` lança para fora do
 * `<Suspense>`). Conta como resolvida, senão o boneco nunca ficaria em pé. `resetKey` (= a peça)
 * zera o erro ao trocar de peça.
 */
class PieceErrorBoundary extends Component<
  { resetKey: string; onSettled: () => void; children: ReactNode },
  { failed: boolean; key: string }
> {
  state = { failed: false, key: this.props.resetKey }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onSettled()
  }
  static getDerivedStateFromProps(
    props: { resetKey: string },
    state: { failed: boolean; key: string },
  ) {
    return props.resetKey !== state.key ? { failed: false, key: props.resetKey } : null
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/**
 * O boneco inteiro some sem derrubar quem o mostra quando o esqueleto (ou a textura) não baixa: o
 * arquivo vem do bucket privado, e uma falha lá não pode tirar o jogo nem a tela do ar. `resetKey`
 * tenta de novo quando muda (outra montagem do avatar).
 */
export class PackRigBoundary extends Component<
  { resetKey?: string; children: ReactNode },
  { failed: boolean; key: string | undefined }
> {
  state = { failed: false, key: this.props.resetKey }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  static getDerivedStateFromProps(
    props: { resetKey?: string },
    state: { failed: boolean; key: string | undefined },
  ) {
    return props.resetKey !== state.key ? { failed: false, key: props.resetKey } : null
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/** As texturas do catálogo, carregadas uma vez e ajustadas como o glTF pede. */
function useTexturasDoPack(catalog: AvatarCatalog): TexturasDoPack {
  const entradas = useMemo(() => Object.entries(catalog.base.textures), [catalog])
  const carregadas = useLoader(
    THREE.TextureLoader,
    entradas.map(([, file]) => avatarFileUrl(file)),
  )
  return useMemo(() => {
    const mapa = new Map<string, THREE.Texture>()
    entradas.forEach(([digital], i) => {
      const t = carregadas[i]
      if (!t) return
      // Convenção do glTF: sem virar a imagem, cores em sRGB.
      t.flipY = false
      t.colorSpace = THREE.SRGBColorSpace
      t.needsUpdate = true
      mapa.set(digital, t)
    })
    return mapa
  }, [entradas, carregadas])
}

function PackPart({
  file,
  camada,
  ossos,
  texturas,
  onSettled,
  materialOverride,
}: {
  file: string
  camada: number
  ossos: ReadonlyMap<string, THREE.Bone>
  texturas: TexturasDoPack
  onSettled: () => void
  materialOverride?: THREE.Material
}) {
  // `false, false` = sem Draco e sem Meshopt: o decoder é WASM e o Kids não roda WASM.
  const { scene } = useGLTF(avatarFileUrl(file), false, false)
  useEffect(() => {
    onSettled()
  }, [onSettled])
  const montagem = useMemo(
    () => prepararPecaDoPack(scene, ossos, texturas, materialOverride, camada),
    [scene, ossos, texturas, materialOverride, camada],
  )
  useEffect(() => () => montagem.soltar(), [montagem])
  return (
    <>
      {montagem.pecas.map((m, i) => (
        <skinnedMesh
          // biome-ignore lint/suspicious/noArrayIndexKey: ordem estável das malhas do GLB.
          key={i}
          geometry={m.geometry}
          material={m.material}
          skeleton={m.skeleton}
          morphTargetDictionary={m.morphTargetDictionary}
          morphTargetInfluences={m.morphTargetInfluences}
          frustumCulled={false}
          castShadow={!materialOverride}
          receiveShadow={!materialOverride}
        />
      ))}
    </>
  )
}

/**
 * O avatar do pack Cute Characters: o esqueleto do pack (em metros, em pé, frente para +Z) com uma
 * peça por encaixe. Cada peça carrega no seu `<Suspense>` (trocar uma não apaga as outras); enquanto
 * uma carrega, o boneco faz a "cabine" (encolhe, gira e flutua). Fica em pé UMA vez (pés no chão).
 *
 * As regras de combinação já vêm aplicadas no `slots` (`equipPart` do core): aqui só se desenha o
 * que está lá, mais as orelhas da cor do corpo.
 */
export function PackAvatarRig({
  slots,
  pose = PACK_IDLE_POSE,
  poseTake,
  loading = false,
  charRef,
  onStood,
  completeRef,
  extraClips,
  onAnimations,
  materialOverride,
  catalog = AVATAR_CATALOG,
}: {
  slots: AvatarSlots
  /** Um clipe do esqueleto do pack (`catalog.base.skeleton.clips`). */
  pose?: string
  /** Muda a cada escolha de pose: a mesma pose escolhida de novo faz o movimento outra vez. */
  poseTake?: number
  loading?: boolean
  charRef: RefObject<THREE.Group | null>
  onStood?: () => void
  completeRef?: RefObject<boolean>
  extraClips?: THREE.AnimationClip[]
  onAnimations?: (
    actions: Record<string, THREE.AnimationAction | null>,
    mixer: THREE.AnimationMixer,
  ) => void
  materialOverride?: THREE.Material
  catalog?: AvatarCatalog
}) {
  const animRoot = useRef<THREE.Group>(null)
  const springRef = useRef<THREE.Group>(null)
  const rigRef = useRef<THREE.Group>(null)
  const stood = useRef(false)
  const reduced = useReducedMotion()

  const esqueleto = useGLTF(avatarFileUrl(catalog.base.skeleton.file), false, false)
  const texturas = useTexturasDoPack(catalog)
  const clips = useMemo(
    () => (extraClips?.length ? [...esqueleto.animations, ...extraClips] : esqueleto.animations),
    [esqueleto.animations, extraClips],
  )
  const { actions, mixer } = useAnimations(clips, animRoot)
  const montagem = useMemo(() => copiarEsqueletoDoPack(esqueleto.scene), [esqueleto.scene])

  useEffect(() => {
    if (onAnimations && actions) onAnimations(actions, mixer)
  }, [actions, mixer, onAnimations])

  // A pose de agora: em laço ou uma vez, parando no auge (`parada`, lido a cada quadro).
  const parada = useRef<{ action: THREE.AnimationAction; em: number } | null>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: `poseTake` não é lido; ele refaz o movimento quando a mesma pose é escolhida de novo.
  useEffect(() => {
    if (onAnimations) return
    const action = actions?.[pose] ?? actions?.[PACK_IDLE_POSE]
    if (!action) return
    const emLaco = !actions?.[pose] || PACK_LOOP_POSES.has(pose)
    action.reset()
    if (emLaco) {
      action.setLoop(THREE.LoopRepeat, Number.POSITIVE_INFINITY)
      parada.current = null
    } else {
      action.setLoop(THREE.LoopOnce, 1)
      action.clampWhenFinished = true
      const em = instanteDaFoto(action.getClip())
      parada.current = { action, em }
      // Com menos movimento pedido no aparelho, vai direto para a pose final, sem animar.
      if (reduced) {
        action.time = em
        action.paused = true
      }
    }
    action.fadeIn(reduced ? 0 : 0.3).play()
    return () => {
      if (parada.current?.action === action) parada.current = null
      action.fadeOut(reduced ? 0 : 0.3)
    }
  }, [actions, pose, poseTake, onAnimations, reduced])

  // Encaixe → arquivo da peça, com as orelhas da cor do corpo.
  const parts = useMemo(() => {
    const lista: [string, string, string][] = []
    for (const [slot, id] of Object.entries(withEars(catalog, slots))) {
      const file = catalog.parts[id]?.file
      if (file) lista.push([slot, id, file])
    }
    return lista
  }, [catalog, slots])
  const partsRef = useRef(parts)
  partsRef.current = parts
  const settled = useRef(new Map<string, string>())
  const markSettled = useCallback((slot: string, id: string) => {
    settled.current.set(slot, id)
  }, [])

  const tmpBox = useMemo(() => new THREE.Box3(), [])
  const tmpVec = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, dt) => {
    // A pose que para no auge: chegou lá, congela (o mixer segue aplicando o quadro parado).
    const p = parada.current
    if (p && !p.action.paused && p.action.time >= p.em) {
      p.action.time = p.em
      p.action.paused = true
    }
    const complete = partsRef.current.every(([slot, id]) => settled.current.get(slot) === id)
    if (completeRef) completeRef.current = complete
    const k = Math.min(1, dt * 6)
    const spring = springRef.current
    if (spring) {
      if (reduced) {
        spring.scale.setScalar(1)
        spring.position.y = 0
        spring.rotation.y = 0
      } else {
        spring.scale.setScalar(THREE.MathUtils.lerp(spring.scale.x, loading ? 0.62 : 1, k))
        spring.position.y = THREE.MathUtils.lerp(spring.position.y, loading ? 0.2 : 0, k)
        if (loading) spring.rotation.y += dt * 4
        else {
          const twoPi = Math.PI * 2
          const alvo = Math.round(spring.rotation.y / twoPi) * twoPi
          spring.rotation.y = THREE.MathUtils.lerp(spring.rotation.y, alvo, k * 0.5)
        }
      }
    }
    if (
      complete &&
      !loading &&
      !stood.current &&
      charRef.current &&
      rigRef.current &&
      (spring?.scale.x ?? 1) > 0.98
    ) {
      charRef.current.position.set(0, 0, 0)
      measureCharacter(rigRef.current, tmpBox)
      if (!tmpBox.isEmpty()) {
        const center = tmpBox.getCenter(tmpVec)
        charRef.current.position.x -= center.x
        charRef.current.position.z -= center.z
        charRef.current.position.y -= tmpBox.min.y
        stood.current = true
        onStood?.()
      }
    }
  })

  return (
    <group ref={charRef} dispose={null}>
      <group ref={springRef}>
        <group ref={animRoot}>
          <group ref={rigRef}>
            <primitive object={montagem.cena} />
            {parts.map(([slot, id, file]) => (
              <PieceErrorBoundary key={slot} resetKey={id} onSettled={() => markSettled(slot, id)}>
                <Suspense fallback={null}>
                  <PackPart
                    file={file}
                    camada={camadaDoEncaixe(slot)}
                    ossos={montagem.ossos}
                    texturas={texturas}
                    materialOverride={materialOverride}
                    onSettled={() => markSettled(slot, id)}
                  />
                </Suspense>
              </PieceErrorBoundary>
            ))}
          </group>
        </group>
      </group>
    </group>
  )
}

/** Pré-carrega o esqueleto do pack (as peças carregam sob demanda). */
export function preloadPackSkeleton(catalog: AvatarCatalog = AVATAR_CATALOG): void {
  useGLTF.preload(avatarFileUrl(catalog.base.skeleton.file), false, false)
}

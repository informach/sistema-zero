'use client'

import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import {
  Component,
  type ReactNode,
  type RefObject,
  Suspense,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import * as THREE from 'three'
import {
  AVATAR_CATEGORIES,
  AVATAR_HIDE_GROUPS,
  AVATAR_REMOVABLE_NONE,
  type AvatarCategory,
  type AvatarSlot,
  baseGlbUrl,
} from '@/lib/avatar3d-catalog'
import { useReducedMotion } from '../room/use-reduced-motion'
import { AssetPart } from './asset-part'

type Slots = Partial<Record<string, AvatarSlot>>

/**
 * Isola UMA peça: se o GLB dela falhar ao carregar, o `useGLTF` lança o erro PRA FORA do
 * `<Suspense>` (que só captura o carregamento). Sem isto, uma peça com falha derrubaria o
 * configurador inteiro pro `global-error` — a rota `/meu-avatar` fica fora do grupo `(app)`,
 * sem `error.tsx` próprio. Aqui a peça com falha simplesmente some. `resetKey` (= asset id)
 * zera o erro ao trocar de peça (uma nova tentativa pode dar certo).
 */
class PieceErrorBoundary extends Component<
  { resetKey: string; children: ReactNode },
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
    return this.state.failed ? null : this.props.children
  }
}

/** Acha o esqueleto compartilhado a partir do 1º skinned mesh do Armature (robusto a nomes). */
function findSkeleton(scene: THREE.Object3D): THREE.Skeleton | null {
  let found: THREE.Skeleton | null = null
  scene.traverse((o) => {
    const sm = o as THREE.SkinnedMesh
    if (sm.isSkinnedMesh && !found) found = sm.skeleton
  })
  return found
}
/** Osso raiz da hierarquia (cujo pai não é osso) — pra colocar a árvore de ossos na cena. */
function rootBoneOf(skeleton: THREE.Skeleton): THREE.Bone | null {
  const set = new Set<THREE.Object3D>(skeleton.bones)
  return skeleton.bones.find((b) => !b.parent || !set.has(b.parent)) ?? skeleton.bones[0] ?? null
}

/**
 * Monta o personagem: 1 esqueleto compartilhado (`Armature.glb`) + 1 `<AssetPart>` por
 * categoria equipada, CADA UM no seu `<Suspense>` (trocar 1 peça NÃO apaga o resto — fim do
 * flicker). Enquanto uma peça carrega (`loading`, vindo do scene), o personagem faz a "cabine"
 * (encolhe + gira + flutua) — espelha o `Experience.jsx` do WawaSensei. Fica em pé UMA vez (pés
 * no pódio) medindo o bounding box; NÃO re-fica-em-pé ao trocar peça/cor (fim do "recarrega").
 * `charRef` é exposto p/ a câmera enquadrar.
 */
export function AvatarRig({
  slots,
  pose = 'Idle',
  loading = false,
  charRef,
  onStood,
}: {
  slots: Slots
  pose?: string
  /** Estado de carregando (do scene, com duração mínima) — dirige a animação de cabine. */
  loading?: boolean
  /** Grupo externo do personagem — a câmera usa pra enquadrar. */
  charRef: RefObject<THREE.Group | null>
  /** Disparado UMA vez quando o personagem fica em pé (pés no pódio) — a câmera enquadra então. */
  onStood?: () => void
}) {
  const animRoot = useRef<THREE.Group>(null)
  const springRef = useRef<THREE.Group>(null)
  const rigRef = useRef<THREE.Group>(null)
  const stood = useRef(false)
  const reduced = useReducedMotion()

  const armature = useGLTF(baseGlbUrl('Armature'))
  const poses = useGLTF(baseGlbUrl('Poses'))
  const { actions } = useAnimations(poses.animations, animRoot)

  const skeleton = useMemo(() => findSkeleton(armature.scene), [armature.scene])
  const rootBone = useMemo(() => (skeleton ? rootBoneOf(skeleton) : null), [skeleton])

  // Material de pele COMPARTILHADO — a cor vem do slot `head`.
  const skin = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ecad80', roughness: 1 }), [])
  const headColor = slots.head?.color
  useEffect(() => {
    if (headColor) skin.color.set(headColor)
  }, [skin, headColor])

  // Pose (animação) — best-effort: action inexistente → fica na pose de bind.
  useEffect(() => {
    const action = actions?.[pose] ?? actions?.Idle
    action?.reset().fadeIn(0.3).play()
    return () => {
      action?.fadeOut(0.3)
    }
  }, [actions, pose])

  // Oclusão: categoria escondida por outra equipada com peça REAL (≠ nenhum) — ex.: chapéu→cabelo.
  const hidden = useMemo(() => {
    const set = new Set<string>()
    for (const cat of Object.keys(AVATAR_HIDE_GROUPS) as AvatarCategory[]) {
      const noneId = AVATAR_REMOVABLE_NONE[cat]
      const asset = slots[cat]?.asset
      if (asset && asset !== noneId) for (const h of AVATAR_HIDE_GROUPS[cat] ?? []) set.add(h)
    }
    return set
  }, [slots])

  // Animação de "cabine" (encolhe/gira/flutua ao carregar) + auto-stand (pés no pódio).
  const tmpBox = useMemo(() => new THREE.Box3(), [])
  const tmpVec = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, dt) => {
    const k = Math.min(1, dt * 6)
    const spring = springRef.current
    if (spring) {
      if (reduced) {
        // Movimento reduzido (fotossensibilidade): nada de encolher/girar/flutuar — assenta
        // direto em escala cheia, voltado pra frente. O auto-stand abaixo segue funcionando.
        spring.scale.setScalar(1)
        spring.position.y = 0
        spring.rotation.y = 0
      } else {
        const targetScale = loading ? 0.62 : 1
        const s = THREE.MathUtils.lerp(spring.scale.x, targetScale, k)
        spring.scale.setScalar(s)
        spring.position.y = THREE.MathUtils.lerp(spring.position.y, loading ? 0.35 : 0, k)
        if (loading) {
          spring.rotation.y += dt * 11 // gira rápido enquanto troca de peça (cabine)
        } else {
          // ao terminar, assenta voltado pra frente (múltiplo de 2π mais próximo).
          const twoPi = Math.PI * 2
          const target = Math.round(spring.rotation.y / twoPi) * twoPi
          spring.rotation.y = THREE.MathUtils.lerp(spring.rotation.y, target, k * 0.5)
        }
      }
    }
    // Auto-stand UMA só vez (e nunca mais — pés não se movem ao trocar peça/cor): exige a cena
    // assentada (não `loading`) e a spring em escala cheia, pra medir o corpo INTEIRO.
    if (
      !loading &&
      !stood.current &&
      charRef.current &&
      rigRef.current &&
      (spring?.scale.x ?? 1) > 0.98
    ) {
      charRef.current.position.set(0, 0, 0)
      charRef.current.updateWorldMatrix(true, true)
      tmpBox.setFromObject(rigRef.current)
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
        {/* Mixamo: cm + Y-up rotacionado (mesmos valores do Avatar.jsx do WawaSensei). */}
        <group ref={animRoot} rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
          <group ref={rigRef}>
            {rootBone ? <primitive object={rootBone} /> : null}
            {skeleton
              ? AVATAR_CATEGORIES.map((cat) => {
                  const slot = slots[cat]
                  const noneId = AVATAR_REMOVABLE_NONE[cat]
                  if (!slot?.asset || slot.asset === noneId || hidden.has(cat)) return null
                  // 1 Suspense POR peça (não apaga as outras = fim do flicker) + 1 error boundary
                  // POR peça (um GLB com falha some sozinho, não derruba o configurador).
                  return (
                    <PieceErrorBoundary key={cat} resetKey={slot.asset}>
                      <Suspense fallback={null}>
                        <AssetPart
                          asset={slot.asset}
                          color={slot.color}
                          skin={skin}
                          skeleton={skeleton}
                        />
                      </Suspense>
                    </PieceErrorBoundary>
                  )
                })
              : null}
          </group>
        </group>
      </group>
    </group>
  )
}

// Pré-carrega o esqueleto base + poses (as peças carregam sob demanda por categoria equipada).
useGLTF.preload(baseGlbUrl('Armature'))
useGLTF.preload(baseGlbUrl('Poses'))

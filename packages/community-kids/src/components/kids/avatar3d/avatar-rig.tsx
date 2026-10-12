'use client'

import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
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
import { type AvatarSlot, baseGlbUrl } from '@/lib/avatar3d-catalog'
import { useReducedMotion } from '../room/use-reduced-motion'
import { AssetPart } from './asset-part'
import { measureCharacter } from './measure'
import { allPartsSettled, visibleParts } from './visible-parts'

type Slots = Partial<Record<string, AvatarSlot>>

/**
 * Isola UMA peça: se o GLB dela falhar ao carregar, o `useGLTF` lança o erro PRA FORA do
 * `<Suspense>` (que só captura o carregamento). Sem isto, um chapéu que não baixa derruba a
 * tela inteira e leva junto o que a criança estava montando — desde 19/09/2026 a queda é no
 * recado do `(app)/error.tsx` (a rota entrou no grupo), e não mais no `global-error`, mas
 * perder a edição por causa de uma peça continua sendo o que esta rede evita. Aqui a peça com
 * falha simplesmente some. `resetKey` (= asset id) zera o erro ao trocar de peça (uma nova
 * tentativa pode dar certo).
 */
class PieceErrorBoundary extends Component<
  { resetKey: string; onSettled: () => void; children: ReactNode },
  { failed: boolean; key: string }
> {
  state = { failed: false, key: this.props.resetKey }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  // A peça que falhou não vai aparecer: conta como resolvida, senão o personagem nunca ficaria
  // em pé nem tiraria a foto esperando por ela.
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
  completeRef,
}: {
  slots: Slots
  pose?: string
  /** Estado de carregando (do scene, com duração mínima) — dirige a animação de cabine. */
  loading?: boolean
  /** Grupo externo do personagem — a câmera usa pra enquadrar. */
  charRef: RefObject<THREE.Group | null>
  /** Disparado UMA vez quando o personagem fica em pé (pés no pódio) — a câmera enquadra então. */
  onStood?: () => void
  /** `true` enquanto todas as peças mostradas estão na cena (a foto só mede o corpo inteiro). */
  completeRef?: RefObject<boolean>
}) {
  const animRoot = useRef<THREE.Group>(null)
  const springRef = useRef<THREE.Group>(null)
  const rigRef = useRef<THREE.Group>(null)
  const stood = useRef(false)
  const reduced = useReducedMotion()

  // `false, false` = SEM Draco/Meshopt (GLBs simples). O decoder Meshopt instancia WASM
  // ao ser configurado → a CSP do kids (sem `wasm-unsafe-eval`) bloqueia e gera um
  // `CompileError` no console. Desligar mantém a CSP estrita e zera o erro (ver asset-part).
  const armature = useGLTF(baseGlbUrl('Armature'), false, false)
  const poses = useGLTF(baseGlbUrl('Poses'), false, false)
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

  // As peças mostradas (sem as "nenhum" e sem as escondidas por outra, ex.: chapéu→cabelo).
  const parts = useMemo(() => visibleParts(slots), [slots])
  const partsRef = useRef(parts)
  partsRef.current = parts
  // Categoria → peça que JÁ está na cena (ou que falhou e some). ⚠️ Medir o corpo antes de todas
  // chegarem media só um pedaço: com só a cabeça carregada, o "ficar em pé" afundava o corpo no
  // pódio (medido no ensaio de 12/10/2026). Cada peça carrega no seu tempo.
  const settled = useRef(new Map<string, string>())
  const markSettled = useCallback((cat: string, asset: string) => {
    settled.current.set(cat, asset)
  }, [])

  // Animação de "cabine" (encolhe/gira/flutua ao carregar) + auto-stand (pés no pódio).
  const tmpBox = useMemo(() => new THREE.Box3(), [])
  const tmpVec = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, dt) => {
    const complete = allPartsSettled(partsRef.current, settled.current)
    if (completeRef) completeRef.current = complete
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
          // Giro SUAVE da cabine (~230°/s). Era dt*11 (~630°/s) — rápido demais p/ o padrão
          // (quase nenhuma criança tem prefers-reduced-motion no SO), gatilho vestibular a cada
          // troca de peça. O caminho `reduced` acima assenta sem girar.
          spring.rotation.y += dt * 4
        } else {
          // ao terminar, assenta voltado pra frente (múltiplo de 2π mais próximo).
          const twoPi = Math.PI * 2
          const target = Math.round(spring.rotation.y / twoPi) * twoPi
          spring.rotation.y = THREE.MathUtils.lerp(spring.rotation.y, target, k * 0.5)
        }
      }
    }
    // Auto-stand UMA só vez (e nunca mais — pés não se movem ao trocar peça/cor): exige a cena
    // assentada (não `loading`), todas as peças na cena e a spring em escala cheia, pra medir o
    // corpo INTEIRO.
    if (
      complete &&
      !loading &&
      !stood.current &&
      charRef.current &&
      rigRef.current &&
      (spring?.scale.x ?? 1) > 0.98
    ) {
      charRef.current.position.set(0, 0, 0)
      // Pela pose de agora, vértice a vértice (ver `measureCharacter`): a caixa guardada pelo
      // three para as malhas com esqueleto não é confiável.
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
        {/* Mixamo: cm + Y-up rotacionado (mesmos valores do Avatar.jsx do WawaSensei). */}
        <group ref={animRoot} rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
          <group ref={rigRef}>
            {rootBone ? <primitive object={rootBone} /> : null}
            {skeleton
              ? parts.map(([cat, asset]) => (
                  // 1 Suspense POR peça (não apaga as outras = fim do flicker) + 1 error boundary
                  // POR peça (um GLB com falha some sozinho, não derruba o configurador).
                  <PieceErrorBoundary
                    key={cat}
                    resetKey={asset}
                    onSettled={() => markSettled(cat, asset)}
                  >
                    <Suspense fallback={null}>
                      <AssetPart
                        asset={asset}
                        color={slots[cat]?.color}
                        skin={skin}
                        skeleton={skeleton}
                        onSettled={() => markSettled(cat, asset)}
                      />
                    </Suspense>
                  </PieceErrorBoundary>
                ))
              : null}
          </group>
        </group>
      </group>
    </group>
  )
}

// Pré-carrega o esqueleto base + poses (as peças carregam sob demanda por categoria equipada).
// `false, false` = SEM Draco/Meshopt (mesmos args do load — o cache do drei é por URL, então
// preload e load PRECISAM concordar, senão o 1º a rodar fixa o decoder Meshopt e o WASM volta).
useGLTF.preload(baseGlbUrl('Armature'), false, false)
useGLTF.preload(baseGlbUrl('Poses'), false, false)

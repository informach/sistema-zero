'use client'

import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { type GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { AVATAR_PART_INFO, DEFAULT_AVATAR_SLOTS, partGlbUrl } from '@/lib/avatar3d-catalog'

/**
 * MINIATURAS dos itens (como no WawaSensei). Renderiza cada peça como MESH COMUM na pose de bind
 * (sem esqueleto — peça solta é SkinnedMesh e colapsaria EM BRANCO) num ÚNICO renderer offscreen
 * reutilizado (não N `<Canvas>` — respeita o limite de contextos WebGL); traços de rosto vão sobre
 * uma cabeça base (em contexto). Captura `toDataURL` 1× e CACHEIA por id. Geração serializada (1 por
 * vez) e LAZY (só quando a aba pede). Cor representativa da categoria. Falha → `null` (cai no rótulo).
 */

const SIZE = 128
const SKIN = '#ecad80'

const cache = new Map<string, string>()
const pending = new Map<string, Promise<string | null>>()
let queue: Promise<unknown> = Promise.resolve()

type Ctx = {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
}
let ctx: Ctx | null = null
let ctxFailed = false

function getCtx(): Ctx | null {
  if (ctx) return ctx
  if (ctxFailed) return null
  try {
    const canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    })
    renderer.setSize(SIZE, SIZE, false)
    renderer.setClearColor(0x000000, 0)
    // Se o navegador descartar o contexto (memória/segundo plano), zera o singleton: a próxima
    // thumbnail recria um renderer novo (as já geradas seguem servidas do `cache`).
    canvas.addEventListener(
      'webglcontextlost',
      (e) => {
        e.preventDefault()
        ctx = null
      },
      false,
    )
    const scene = new THREE.Scene()
    scene.add(new THREE.AmbientLight(0xffffff, 1.1))
    const key = new THREE.DirectionalLight(0xffffff, 1.8)
    key.position.set(1.5, 2.5, 3)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xffffff, 0.4)
    fill.position.set(-2, 1, -1)
    scene.add(fill)
    const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 100)
    ctx = { renderer, scene, camera }
    return ctx
  } catch {
    ctxFailed = true
    return null
  }
}

// Manager DEDICADO (não o `DefaultLoadingManager`): senão o `useProgress` do rig acharia que o
// personagem está carregando toda vez que uma thumbnail baixa → faria a "cabine" girar à toa.
const loader = new GLTFLoader(new THREE.LoadingManager())

/** Cor representativa da peça pra thumbnail (default da categoria, senão deixa a do material). */
function representativeColor(partId: string): string | undefined {
  const cat = AVATAR_PART_INFO[partId]?.category
  return cat ? DEFAULT_AVATAR_SLOTS[cat]?.color : undefined
}

/** Categorias que ficam NA CABEÇA → a thumbnail mostra a peça sobre uma cabeça base (em contexto). */
const HEAD_SITTING = new Set<string>([
  'hair',
  'eyes',
  'eyebrows',
  'nose',
  'facialHair',
  'glasses',
  'hat',
  'accessory',
])

// Cabeça base (head-01) reusada como CONTEXTO dos traços de rosto — carregada 1× e cacheada.
let baseHead: GLTF | null = null
let baseHeadPromise: Promise<GLTF | null> | null = null
function loadBaseHead(): Promise<GLTF | null> {
  if (baseHead) return Promise.resolve(baseHead)
  if (!baseHeadPromise) {
    baseHeadPromise = loader
      .loadAsync(partGlbUrl(DEFAULT_AVATAR_SLOTS.head.asset))
      .then((g) => {
        baseHead = g
        return g
      })
      .catch(() => null)
  }
  return baseHeadPromise
}

/**
 * Converte os (skinned)meshes de um GLB em MESHES COMUNS na pose de REST (bind), assando a matriz
 * de mundo. A `geometry.attributes.position` JÁ é a pose de bind → renderiza a forma certa SEM o
 * esqueleto compartilhado (que a peça sozinha não tem → senão o SkinnedMesh colapsa na origem e a
 * thumbnail sai EM BRANCO). Clona o material (recolore sem sujar o GLB cacheado da cabeça).
 */
function buildPlainMeshes(
  srcScene: THREE.Object3D,
  color: string | undefined,
  clonedMats: THREE.Material[],
): THREE.Mesh[] {
  const out: THREE.Mesh[] = []
  srcScene.updateWorldMatrix(true, true)
  srcScene.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh) return
    const src = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as
      | THREE.MeshStandardMaterial
      | undefined
    const mat =
      (src?.clone() as THREE.MeshStandardMaterial | undefined) ?? new THREE.MeshStandardMaterial()
    clonedMats.push(mat)
    if (mat.name?.includes('Skin_')) mat.color.set(SKIN)
    else if (color && mat.name?.includes('Color_')) mat.color.set(color)
    const plain = new THREE.Mesh(mesh.geometry, mat)
    plain.applyMatrix4(mesh.matrixWorld) // assa a posição de mundo (a peça no lugar dela)
    out.push(plain)
  })
  return out
}

/** Descarta geometria+material de um GLB carregado FRESCO (NÃO usar na cabeça base cacheada). */
function disposeGltf(scene: THREE.Object3D) {
  scene.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    m.geometry?.dispose()
    const mat = m.material
    if (Array.isArray(mat)) for (const x of mat) x.dispose()
    else mat?.dispose()
  })
}

async function renderThumbnail(partId: string): Promise<string | null> {
  const c = getCtx()
  if (!c) return null
  let view: THREE.Group | null = null
  let partGltf: GLTF | null = null
  const clonedMats: THREE.Material[] = []
  try {
    partGltf = await loader.loadAsync(partGlbUrl(partId))
    const cat = AVATAR_PART_INFO[partId]?.category
    const color = representativeColor(partId)

    const parts = new THREE.Group()
    // Traços de rosto → sobre uma cabeça base (contexto), pra não flutuarem soltos.
    if (cat && HEAD_SITTING.has(cat)) {
      const head = await loadBaseHead()
      if (head) for (const m of buildPlainMeshes(head.scene, undefined, clonedMats)) parts.add(m)
    }
    for (const m of buildPlainMeshes(partGltf.scene, color, clonedMats)) parts.add(m)

    // Em pé (igual o rig: Z-up → Y-up + ESCALA 0.01) + leve 3/4 pra dar volume. SEM o 0.01 a
    // peça fica em cm (~120u) e o sphere-fit joga a câmera a ~300u → além do far → EM BRANCO.
    const stand = new THREE.Group()
    stand.rotation.x = Math.PI / 2
    stand.scale.setScalar(0.01)
    stand.add(parts)
    view = new THREE.Group()
    view.rotation.y = -0.35
    view.add(stand)
    c.scene.add(view)
    view.updateWorldMatrix(true, true)

    const box = new THREE.Box3().setFromObject(view)
    if (box.isEmpty()) return null
    const sphere = box.getBoundingSphere(new THREE.Sphere())
    if (sphere.radius < 1e-6) return null // box degenerado → não renderiza em branco
    const fov = (c.camera.fov * Math.PI) / 180
    const dist = (sphere.radius / Math.sin(fov / 2)) * 1.08
    c.camera.position.set(sphere.center.x, sphere.center.y, sphere.center.z + dist)
    c.camera.lookAt(sphere.center)
    // near/far DINÂMICOS do sphere → nunca recorta, seja qual for o tamanho da peça.
    c.camera.near = Math.max(0.01, dist - sphere.radius * 2)
    c.camera.far = dist + sphere.radius * 2 + 1
    c.camera.updateProjectionMatrix()

    c.renderer.render(c.scene, c.camera)
    const url = c.renderer.domElement.toDataURL('image/png')
    cache.set(partId, url)
    return url
  } catch {
    return null
  } finally {
    if (view) c.scene.remove(view)
    for (const m of clonedMats) m.dispose()
    // descarta SÓ a peça (carregada fresca); a cabeça base fica cacheada p/ reuso.
    if (partGltf) disposeGltf(partGltf.scene)
  }
}

/** Gera (ou devolve do cache) a thumbnail de uma peça. Serializa os renders (1 por vez). */
function generateThumbnail(partId: string): Promise<string | null> {
  const cached = cache.get(partId)
  if (cached) return Promise.resolve(cached)
  const inflight = pending.get(partId)
  if (inflight) return inflight
  const p = queue.then(() => renderThumbnail(partId))
  // a fila segue mesmo se um item falhar (não trava os próximos).
  queue = p.catch(() => null)
  pending.set(
    partId,
    p.finally(() => pending.delete(partId)),
  )
  return p
}

/**
 * Hook de apresentação: devolve `{ url, loading }`. `url` é a dataURL da thumbnail (ou `null`
 * enquanto gera, em peça sem GLB tipo "nenhum", ou quando a geração FALHA); `loading` distingue
 * "ainda gerando" de "falhou" — assim a grade mostra o spinner só durante a geração e cai no
 * rótulo de texto na falha. Dispara a geração sob demanda. `partId` null → não gera.
 */
export function useAvatarThumbnail(partId: string | null): {
  url: string | null
  loading: boolean
} {
  const [url, setUrl] = useState<string | null>(() => (partId ? (cache.get(partId) ?? null) : null))
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!partId) {
      setUrl(null)
      setLoading(false)
      return
    }
    const cached = cache.get(partId)
    if (cached) {
      setUrl(cached)
      setLoading(false)
      return
    }
    let alive = true
    setUrl(null)
    setLoading(true)
    generateThumbnail(partId)
      .then((u) => {
        if (alive) {
          setUrl(u)
          setLoading(false)
        }
      })
      .catch(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [partId])
  return { url, loading }
}

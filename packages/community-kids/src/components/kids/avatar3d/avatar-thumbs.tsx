'use client'

import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { AVATAR_PART_INFO, DEFAULT_AVATAR_SLOTS, partGlbUrl } from '@/lib/avatar3d-catalog'

/**
 * MINIATURAS dos itens (como no WawaSensei). Renderiza cada peça (o GLB SOZINHO, em bind pose)
 * num ÚNICO renderer offscreen reutilizado (não N `<Canvas>` — respeita o limite de contextos
 * WebGL), captura `toDataURL` 1×, e CACHEIA por id. Geração serializada (1 por vez) e LAZY (só
 * quando a aba/categoria pede). Aplica uma cor representativa da categoria pra a peça não sair
 * cinza. Robusto: qualquer falha → `null` (a grade cai no rótulo de texto).
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

function disposeObject(root: THREE.Object3D) {
  root.traverse((o) => {
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
  try {
    const gltf = await loader.loadAsync(partGlbUrl(partId))
    const obj = gltf.scene
    const color = representativeColor(partId)
    obj.traverse((child) => {
      const mesh = child as THREE.Mesh
      if (!mesh.isMesh) return
      const mat = mesh.material as THREE.MeshStandardMaterial
      if (!mat?.name) return
      if (mat.name.includes('Skin_')) mat.color?.set(SKIN)
      else if (color && mat.name.includes('Color_')) mat.color?.set(color)
    })

    // Em pé (igual o rig: Z-up → Y-up) + leve 3/4 pra dar volume.
    const stand = new THREE.Group()
    stand.rotation.x = Math.PI / 2
    stand.add(obj)
    view = new THREE.Group()
    view.rotation.y = -0.35
    view.add(stand)
    c.scene.add(view)
    view.updateWorldMatrix(true, true)

    const box = new THREE.Box3().setFromObject(view)
    if (box.isEmpty()) return null
    const sphere = box.getBoundingSphere(new THREE.Sphere())
    const fov = (c.camera.fov * Math.PI) / 180
    const dist = (sphere.radius / Math.sin(fov / 2)) * 1.08
    c.camera.position.set(sphere.center.x, sphere.center.y, sphere.center.z + dist)
    c.camera.lookAt(sphere.center)
    c.camera.updateProjectionMatrix()

    c.renderer.render(c.scene, c.camera)
    const url = c.renderer.domElement.toDataURL('image/png')
    cache.set(partId, url)
    return url
  } catch {
    return null
  } finally {
    if (view) {
      c.scene.remove(view)
      disposeObject(view)
    }
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

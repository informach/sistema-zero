/**
 * Playground de DEV do Molda (QA em browser real sem subir o kids inteiro):
 * monta o <MoldaApp> com um adapter de demonstração. `window.__molda` expõe a
 * persistência, um contador de gravações, o palco e as prévias 3D abertas,
 * para o QA (Playwright, console).
 */

import {
  getDefaultMoldaPersistence,
  MoldaApp,
  type MoldaPersistence,
  setMoldaStorageNamespace,
} from '@sistemazero/molda'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { defaultViewportFactory, setMoldaViewportFactory } from '../src/viewport/factory'
import type { SkyPreviewLike } from '../src/viewport/SkyPreview'
import {
  defaultSkyPreviewFactory,
  setMoldaSkyPreviewFactory,
} from '../src/viewport/skyPreviewFactory'
import type { TexturePreviewLike } from '../src/viewport/TexturePreview'
import {
  defaultTexturePreviewFactory,
  setMoldaTexturePreviewFactory,
} from '../src/viewport/texturePreviewFactory'
import type { MoldaViewportLike } from '../src/viewport/types'
import './styles.css'

setMoldaStorageNamespace('playground')

const root = document.getElementById('root')
if (!root) throw new Error('#root não encontrado')

const params = new URLSearchParams(window.location.search)
const initialAssetId = params.get('criacao')

const persistence = getDefaultMoldaPersistence()
const debug = { saves: 0, lastSaved: null as string | null, errors: [] as string[] }
let skyPreview: SkyPreviewLike | null = null
let texturePreview: TexturePreviewLike | null = null

function property(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined
}
const tracked: MoldaPersistence = {
  ...persistence,
  async save(asset) {
    debug.saves += 1
    try {
      await persistence.save(asset)
      debug.lastSaved = asset.name
    } catch (error) {
      debug.errors.push(String(error))
      throw error
    }
  },
}

declare global {
  interface Window {
    __molda?: {
      persistence: MoldaPersistence
      debug: typeof debug
      viewport: MoldaViewportLike | null
      skyEnvironmentId(): string | null
      textureWrapping(): { wrapS: number; wrapT: number; repeatX: number; repeatY: number } | null
      inspectGlb(bytes: number[]): Promise<{ meshes: number; materials: number; mapped: number }>
    }
  }
}
window.__molda = {
  persistence: tracked,
  debug,
  viewport: null,
  skyEnvironmentId() {
    const environment = property(skyPreview, 'environment')
    const uuid = property(property(environment, 'texture'), 'uuid')
    return typeof uuid === 'string' ? uuid : null
  },
  textureWrapping() {
    const texture = property(texturePreview, 'texture')
    const wrapS = property(texture, 'wrapS')
    const wrapT = property(texture, 'wrapT')
    const repeatX = property(property(texture, 'repeat'), 'x')
    const repeatY = property(property(texture, 'repeat'), 'y')
    if (
      typeof wrapS !== 'number' ||
      typeof wrapT !== 'number' ||
      typeof repeatX !== 'number' ||
      typeof repeatY !== 'number'
    ) {
      return null
    }
    return { wrapS, wrapT, repeatX, repeatY }
  },
  inspectGlb(bytes) {
    return new Promise((resolve, reject) => {
      new GLTFLoader().parse(
        Uint8Array.from(bytes).buffer,
        '',
        (gltf) => {
          let meshes = 0
          let materials = 0
          let mapped = 0
          gltf.scene.traverse((object) => {
            if (!('isMesh' in object) || object.isMesh !== true || !('material' in object)) return
            meshes += 1
            const list = Array.isArray(object.material) ? object.material : [object.material]
            materials += list.length
            mapped += list.filter(
              (material) => material && 'map' in material && material.map,
            ).length
          })
          resolve({ meshes, materials, mapped })
        },
        reject,
      )
    })
  },
}

setMoldaViewportFactory((canvas, callbacks, options) => {
  const viewport = defaultViewportFactory(canvas, callbacks, options)
  if (window.__molda) window.__molda.viewport = viewport
  return viewport
})

setMoldaSkyPreviewFactory((canvas, options) => {
  skyPreview = defaultSkyPreviewFactory(canvas, options)
  return skyPreview
})

setMoldaTexturePreviewFactory((canvas, options) => {
  texturePreview = defaultTexturePreviewFactory(canvas, options)
  return texturePreview
})

createRoot(root).render(
  <StrictMode>
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <MoldaApp
        persistence={tracked}
        adapter={{
          studioOwned: true,
          onOpenStudio: () => console.log('[playground] onOpenStudio'),
          // Deep link de teste: `?criacao=<id>` abre direto uma criação.
          ...(initialAssetId ? { initialAssetId } : {}),
        }}
      />
    </div>
  </StrictMode>,
)

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
import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { COPY } from '../src/core/copy'
import type { SkyPreviewLike } from '../src/viewport/SkyPreview'
import type { TexturePreviewLike } from '../src/viewport/TexturePreview'
import type { MoldaViewportLike } from '../src/viewport/types'
import './styles.css'
import { playgroundToolAccess } from './toolAccess'

setMoldaStorageNamespace('playground')

const root = document.getElementById('root')
if (!root) throw new Error('#root não encontrado')

const params = new URLSearchParams(window.location.search)
const initialAssetId = params.get('criacao')
// `?nivel=explorer|architect|god`: o portão por nível de carreira, como o kids calcula.
const toolAccess = playgroundToolAccess(params.get('nivel'))
const ScenePlayground = lazy(() => import('./ScenePlayground'))

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
  async inspectGlb(bytes) {
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js')
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

async function installPreviewTracking(): Promise<void> {
  // QA instrumentation must not pull every 3D workshop into the production entry chunk.
  if (!import.meta.env.DEV && import.meta.env.MODE !== 'e2e') return
  const [viewportModule, skyModule, textureModule] = await Promise.all([
    import('../src/viewport/factory'),
    import('../src/viewport/skyPreviewFactory'),
    import('../src/viewport/texturePreviewFactory'),
  ])
  viewportModule.setMoldaViewportFactory((canvas, callbacks, options) => {
    const viewport = viewportModule.defaultViewportFactory(canvas, callbacks, options)
    if (window.__molda) window.__molda.viewport = viewport
    return viewport
  })

  skyModule.setMoldaSkyPreviewFactory((canvas, options) => {
    skyPreview = skyModule.defaultSkyPreviewFactory(canvas, options)
    return skyPreview
  })

  textureModule.setMoldaTexturePreviewFactory((canvas, options) => {
    texturePreview = textureModule.defaultTexturePreviewFactory(canvas, options)
    return texturePreview
  })
}

void installPreviewTracking().then(() =>
  createRoot(root).render(
    <StrictMode>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {params.get('oficina') === 'nova' ? (
          <Suspense fallback={<p role="status">{COPY.scene.starting}</p>}>
            <ScenePlayground id={initialAssetId} toolAccess={toolAccess} />
          </Suspense>
        ) : (
          <MoldaApp
            persistence={tracked}
            adapter={{
              studioOwned: true,
              onOpenStudio: () => console.log('[playground] onOpenStudio'),
              // Deep link de teste: `?criacao=<id>` abre direto uma criação.
              ...(initialAssetId ? { initialAssetId } : {}),
              // QA da integração pública: `?oficina=app` liga a geração seguinte DENTRO
              // do app, com a galeria enxergando as duas. Não é ativação de produto.
              ...(params.get('oficina') === 'app' ? { sceneWorkshop: true } : {}),
              ...(toolAccess ? { toolAccess } : {}),
            }}
          />
        )}
      </div>
    </StrictMode>,
  ),
)

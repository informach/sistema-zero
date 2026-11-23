import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import 'fake-indexeddb/auto'
import { createRequire } from 'node:module'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createEmptyProject, type Project, type ProjectAsset } from '#core'
import { scene4Fixture } from '../../../../core/tests/fixtures/pinta-region-scene'
import { embedPintaRegionImage } from '../../../../pinta/src/export/regionImage'
import { encodeAssetBase64 } from '../../core/assetBinary'
import {
  admitPintaRegionalMaterial,
  type PintaRegionalMarker,
} from '../../core/pintaRegionalMaterial'
import {
  PRIVATE_REGIONAL_PROJECT,
  UNSUPPORTED_PINTA_REGION,
} from '../../core/pintaRegionalReference'
import { gameTwoDManifest } from '../../official-extensions/game-2d/manifest'
import { gameKitManifest } from '../../official-extensions/game-2d-advanced/manifest'
import { privateRegionalProjectScope } from '../../state/pintaRegionalProjectRefresh'
import { useProjectStore } from '../../state/projectStore'
import { useUIStore } from '../../state/uiStore'
import { StudioExecutionProvider } from '../../studio/observation'
import { PreviewIframe } from './PreviewIframe'

// A prévia do editor Clássico é o jogador que a criança vê enquanto programa. Os ensaios do material
// regional passavam pela receita pública (`renderProjectToPreviewDocAsync`) e pelo Pro; este arquivo
// cobre o caminho do próprio editor: com o perfil privado o motor regional entra no documento, sem
// ele nada roda, e uma captura que não confere deixa na tela o jogo que já estava.
const { createCanvas, loadImage } = createRequire(
  new URL('../../../../pinta/package.json', import.meta.url),
)('@napi-rs/canvas') as typeof import('../../../../pinta/node_modules/@napi-rs/canvas')
const png = (width: number, height: number, color = '#3355dd') => {
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)
  return new Uint8Array(canvas.toBuffer('image/png'))
}
const url = (bytes: Uint8Array) => `data:image/png;base64,${encodeAssetBase64(bytes)}`
const bitmapDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'createImageBitmap')
let material: ProjectAsset & { regional: PintaRegionalMarker }

beforeAll(async () => {
  Object.defineProperty(globalThis, 'createImageBitmap', {
    configurable: true,
    value: async (bytes: Blob) => {
      const { width, height } = await loadImage(Buffer.from(await bytes.arrayBuffer()))
      return { width, height, close: () => {} }
    },
  })
  const fixture = scene4Fixture()
  const scene = JSON.stringify({
    ...fixture,
    physics: 'precise',
    tilesets: fixture.tilesets.map((sheet) => ({ ...sheet, image: url(png(64, 16)) })),
    art: fixture.art.map((art) => ({ ...art, image: url(png(art.width, art.height)) })),
  })
  const { png: bytes } = await embedPintaRegionImage(png(64, 32, '#002244'), scene)
  const dataUrl = url(bytes)
  const { regional } = await admitPintaRegionalMaterial({
    dataUrl,
    sourceId: 'world',
    width: 64,
    height: 32,
  })
  material = {
    id: 'vila',
    name: 'vila',
    kind: 'image',
    source: 'library',
    libOrigin: 'pinta',
    libId: 'personal:world',
    proPath: 'public/assets/vila.png',
    width: 64,
    height: 32,
    dataUrl,
    regional,
  }
})

afterAll(() => {
  if (bitmapDescriptor) Object.defineProperty(globalThis, 'createImageBitmap', bitmapDescriptor)
  else Reflect.deleteProperty(globalThis, 'createImageBitmap')
})

afterEach(() => {
  cleanup()
  useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  useUIStore.setState({ previewRunning: true })
})

function regionalProject(manifest: typeof gameTwoDManifest, assets: ProjectAsset[]): Project {
  return {
    ...createEmptyProject(`regional-preview-${manifest.id}`, 'Vila'),
    assets,
    installedExtensions: [{ id: manifest.id, version: '2.0.0', installedAt: 1 }],
    files: {
      'index.html': '<canvas id="jogo"></canvas>',
      'style.css': 'body{margin:0}',
      'script.js': 'window.PROGRAMA_DA_CRIANCA = "continua";',
    },
  }
}

function showPreview(scope?: ReturnType<typeof privateRegionalProjectScope>) {
  render(
    <StudioExecutionProvider
      value={{
        editingAccess: 'author',
        autoRun: true,
        requireIsolatedPreview: false,
        muted: false,
        ...(scope ? { [PRIVATE_REGIONAL_PROJECT]: scope } : {}),
      }}
    >
      <PreviewIframe />
    </StudioExecutionProvider>,
  )
  fireEvent.load(screen.getByTitle('Pré-visualização'))
}

const srcDoc = () => screen.getByTitle('Pré-visualização').getAttribute('srcdoc') ?? ''

describe('PreviewIframe com cenário regional do Pinta', () => {
  for (const manifest of [gameTwoDManifest, gameKitManifest])
    it(`${manifest.id}: o perfil privado põe o motor regional e o PNG no documento do editor`, async () => {
      useUIStore.setState({ previewRunning: true })
      useProjectStore.setState({
        project: regionalProject(manifest, [material]),
        isDirty: false,
        saveError: null,
      })
      showPreview(privateRegionalProjectScope(`preview-${manifest.id}`))
      await waitFor(
        () => {
          const doc = srcDoc()
          expect(doc).toContain('_pintaRegionFactory')
          expect(doc).toContain(material.dataUrl)
        },
        { timeout: 8000 },
      )
      expect(screen.queryByRole('alert')).toBeNull()
    })

  it('sem o perfil privado o cenário regional não roda e a criança vê o motivo', async () => {
    useUIStore.setState({ previewRunning: true })
    useProjectStore.setState({
      project: regionalProject(gameTwoDManifest, [material]),
      isDirty: false,
      saveError: null,
    })
    showPreview()
    expect(
      await screen.findByText(UNSUPPORTED_PINTA_REGION, undefined, { timeout: 8000 }),
    ).toBeTruthy()
    expect(srcDoc()).not.toContain('_pintaRegionFactory')
    expect(srcDoc()).not.toContain(material.dataUrl)
  })

  it('uma captura que não confere deixa na tela o jogo que já estava', async () => {
    useUIStore.setState({ previewRunning: true })
    const project = regionalProject(gameTwoDManifest, [material])
    useProjectStore.setState({ project, isDirty: false, saveError: null })
    showPreview(privateRegionalProjectScope('preview-corrupt'))
    await waitFor(() => expect(srcDoc()).toContain('_pintaRegionFactory'), { timeout: 8000 })
    const running = srcDoc()
    const corrupt: typeof material = {
      ...material,
      regional: { ...material.regional, sha256: '0'.repeat(64) },
    }
    act(() => {
      useProjectStore.setState({
        project: { ...project, assets: [corrupt] },
        isDirty: true,
        saveError: null,
      })
    })
    expect(await screen.findByRole('alert', undefined, { timeout: 8000 })).toBeTruthy()
    expect(srcDoc()).toBe(running)
  })
})

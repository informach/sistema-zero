import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import 'fake-indexeddb/auto'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createEmptyProject, type Project, type ProjectAsset } from '#core'
import type { PintaRegionalMarker } from '../../core/pintaRegionalMaterial'
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
import {
  installPngImageBitmap,
  regionalSceneMaterial,
} from '../../testing/pintaRegionalMaterialFixture'
import { PreviewIframe } from './PreviewIframe'

// A prévia do editor Clássico é o jogador que a criança vê enquanto programa. Os ensaios do material
// regional passavam pela receita pública (`renderProjectToPreviewDocAsync`) e pelo Pro; este arquivo
// cobre o caminho do próprio editor: com o perfil privado o motor regional entra no documento, sem
// ele nada roda, e uma captura que não confere deixa na tela o jogo que já estava.
let material: ProjectAsset & { regional: PintaRegionalMarker }
let uninstallImageBitmap = () => {}

beforeAll(async () => {
  uninstallImageBitmap = installPngImageBitmap()
  material = await regionalSceneMaterial()
})

afterAll(() => uninstallImageBitmap())

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

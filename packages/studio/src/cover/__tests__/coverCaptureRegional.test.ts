import { afterAll, afterEach, beforeAll, describe, expect, spyOn, test } from 'bun:test'
import 'fake-indexeddb/auto'
import { createEmptyProject, type Project, type ProjectAsset } from '#core'
import type { PintaRegionalMarker } from '../../core/pintaRegionalMaterial'
import { PRIVATE_REGIONAL_PROJECT } from '../../core/pintaRegionalReference'
import { gameTwoDManifest } from '../../official-extensions/game-2d/manifest'
import { gameKitManifest } from '../../official-extensions/game-2d-advanced/manifest'
import {
  privateRegionalProjectScope,
  setProjectStorageNamespace,
} from '../../state/projectStorageRuntime'
import {
  installPngImageBitmap,
  regionalSceneMaterial,
} from '../../testing/pintaRegionalMaterialFixture'
import { captureCoverFromProject } from '../coverCapture'
import { captureAndStoreProjectThumb } from '../thumbCapture'

/**
 * A capa de reserva (`captureCoverFromProject`) roda o jogo num iframe próprio quando a prévia não
 * deixou foto. Com um cenário regional do Pinta ela monta o documento com a mesma prova regional da
 * prévia e do jogador público, admitindo o PNG completo antes da execução.
 */
let material: ProjectAsset & { regional: PintaRegionalMarker }
let uninstallImageBitmap = () => {}

beforeAll(async () => {
  uninstallImageBitmap = installPngImageBitmap()
  material = await regionalSceneMaterial()
})

afterAll(() => uninstallImageBitmap())

afterEach(() => {
  setProjectStorageNamespace('')
  for (const frame of document.querySelectorAll('iframe')) frame.remove()
})

const PHOTO = 'data:image/png;base64,capa-do-jogo'

function regionalProject(manifest: typeof gameTwoDManifest): Project {
  return {
    ...createEmptyProject(`capa-regional-${manifest.id}`, 'Vila'),
    assets: [material],
    installedExtensions: [{ id: manifest.id, version: '2.0.0', installedAt: 1 }],
    files: {
      'index.html': '<canvas id="jogo"></canvas>',
      'style.css': 'body{margin:0}',
      'script.js': 'window.PROGRAMA_DA_CRIANCA = "continua";',
    },
  }
}

/**
 * Sem navegador: o iframe da captura guarda o documento que recebeu e responde como o harness,
 * com uma foto (o mesmo recorte do teste de isolamento da capa).
 */
async function photographed<T>(run: () => Promise<T>) {
  const documents: string[] = []
  const append = spyOn(document.body, 'appendChild').mockImplementation((node) => {
    if (!(node instanceof HTMLIFrameElement)) throw new Error('Esperava o iframe da captura.')
    documents.push(node.srcdoc)
    const source = {} as Window
    Object.defineProperty(node, 'contentWindow', { value: source })
    window.dispatchEvent(
      new MessageEvent('message', {
        source,
        origin: 'null',
        data: { __szCover: true, dataUrl: PHOTO },
      }),
    )
    return node
  })
  try {
    return { result: await run(), documents }
  } finally {
    append.mockRestore()
  }
}

describe('capa de reserva de um jogo com cenário regional do Pinta', () => {
  for (const manifest of [gameTwoDManifest, gameKitManifest])
    test(`${manifest.id}: no perfil privado a capa sai do jogo rodando com o motor regional e o PNG`, async () => {
      const scope = privateRegionalProjectScope(`capa-${manifest.id}`)
      const { result, documents } = await photographed(() =>
        captureCoverFromProject(regionalProject(manifest), {
          [PRIVATE_REGIONAL_PROJECT]: scope,
          timeoutMs: 8000,
        }),
      )
      expect(result).toBe(PHOTO)
      expect(documents).toHaveLength(1)
      expect(documents[0]).toContain('_pintaRegionFactory')
      expect(documents[0]).toContain(material.dataUrl)
    })

  test('a captura pública admite o mesmo cenário regional completo', async () => {
    const { result, documents } = await photographed(() =>
      captureCoverFromProject(regionalProject(gameTwoDManifest)),
    )
    expect(result).toBe(PHOTO)
    expect(documents).toHaveLength(1)
    expect(documents[0]).toContain('_pintaRegionFactory')
    expect(documents[0]).toContain(material.dataUrl)
  })

  test('a miniatura admite o cenário nos leitores público e privado', async () => {
    const project = regionalProject(gameKitManifest)
    const scope = privateRegionalProjectScope('capa-miniatura')
    setProjectStorageNamespace(scope.namespace)
    const privateRun = await photographed(() => captureAndStoreProjectThumb(project))
    // O happy-dom não reduz imagens: a miniatura não é gravada, mas a captura rodou o cenário.
    expect(privateRun.documents).toHaveLength(1)
    expect(privateRun.documents[0]).toContain('_pintaRegionFactory')

    setProjectStorageNamespace('')
    const commonRun = await photographed(() => captureAndStoreProjectThumb(project))
    expect(commonRun.result).toBe(false)
    expect(commonRun.documents).toHaveLength(1)
    expect(commonRun.documents[0]).toContain('_pintaRegionFactory')
  })
})

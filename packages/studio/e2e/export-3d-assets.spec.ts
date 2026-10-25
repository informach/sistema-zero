import { expect, type Page, test } from '@playwright/test'
import type { Project } from '../src/core/project'
import type { ProjectAsset } from '../src/core/projectAssets'
import { buildClassicFileMap, type ExportFileMap } from '../src/export/fileMap'
import { defaultMinifiers } from '../src/export/minify'
import {
  makeAnimatedGlb,
  makeHdrDataUrl,
} from '../src/official-extensions/__tests__/three3d/assetFixtures'
import { MEU_HEROI_MOLDA_SOURCE } from '../src/official-extensions/game-3d/__gen_primeirosJogos'
import { HEROI_DO_MOLDA_GLB } from '../src/official-extensions/game-3d/exampleAssets'

/**
 * O site que "Baixar para publicar" gera, aberto FORA do Estúdio: sem srcdoc, sem CSP de
 * preview, sem permissionGuard, com os minificadores reais (terser/csso) do ZIP. Os
 * arquivos `public/*` do `buildClassicFileMap` são servidos por uma origem própria, e o
 * jogo tem de achar o modelo do Molda e o céu HDR pelo `sz-assets.js` do pacote.
 */
const ORIGIN = 'https://jogo-exportado.test'

// O PWA do export registra um service worker; aqui ele não tem servidor de verdade, e o
// `page.route` não alcança pedidos feitos por um service worker.
test.use({ serviceWorkers: 'block' })

const HEROI: ProjectAsset = {
  id: 'asset-heroi',
  name: 'heroi-do-molda',
  kind: 'model3d',
  dataUrl: HEROI_DO_MOLDA_GLB,
  originalFileName: 'heroi-do-molda.glb',
  source: 'upload',
}
const CEU: ProjectAsset = {
  id: 'asset-ceu',
  name: 'ceu-hdr',
  kind: 'environment3d',
  dataUrl: makeHdrDataUrl(255, 8, 8),
  originalFileName: 'ceu.hdr',
  source: 'upload',
}

function exportedProject(
  extensionId: 'game-3d' | 'world-3d' | 'game-3d-advanced',
  script: string,
  assets: ProjectAsset[],
): Project {
  const now = Date.now()
  return {
    id: `e2e-export-${extensionId}`,
    name: `Exportado ${extensionId}`,
    createdAt: now,
    updatedAt: now,
    mode: 'bridge',
    files: {
      'index.html':
        '<!doctype html><html lang="pt-BR"><head><link rel="stylesheet" href="style.css"></head><body><main></main><script src="script.js"></script></body></html>',
      'style.css': 'html, body { margin: 0; overflow: hidden; }',
      'script.js': script.trim(),
    },
    assets,
    ir: null,
    blocksState: null,
    installedExtensions: [{ id: extensionId, version: '0.1.0', installedAt: now }],
  }
}

const CONTENT_TYPES: Record<string, string> = {
  html: 'text/html',
  js: 'text/javascript',
  css: 'text/css',
  json: 'application/json',
  webmanifest: 'application/manifest+json',
  svg: 'image/svg+xml',
}

/** Serve o `public/` do ZIP numa origem própria, como um host estático faria. */
async function openExported(page: Page, project: Project) {
  const { files } = await buildClassicFileMap(project, await defaultMinifiers())
  await serve(page, files)
  await page.setViewportSize({ width: 800, height: 500 })
  await page.goto(`${ORIGIN}/index.html`)
}

async function serve(page: Page, files: ExportFileMap) {
  await page.route(`${ORIGIN}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\//, '') || 'index.html'
    const body = files[`public/${path}`]
    if (body === undefined) return route.fulfill({ status: 404, body: 'não existe' })
    const ext = path.slice(path.lastIndexOf('.') + 1)
    return route.fulfill({
      status: 200,
      contentType: CONTENT_TYPES[ext] ?? 'application/octet-stream',
      body: typeof body === 'string' ? body : Buffer.from(body),
    })
  })
}

function collectDiagnostics(page: Page): string[] {
  const diagnostics: string[] = []
  page.on('pageerror', (error) => diagnostics.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() !== 'warning' && message.type() !== 'error') return
    const text = message.text()
    if (text.includes('GL Driver Message') && text.includes('ReadPixels')) return
    // Efeito do `serviceWorkers: 'block'` acima, não do jogo.
    if (text.includes('Service Worker registration blocked by Playwright')) return
    diagnostics.push(`${message.type()}: ${text}`)
  })
  return diagnostics
}

/** Linha de cima do desenho: quantas de três amostras saem com o vermelho do céu HDR. */
async function redSkySamples(page: Page): Promise<number> {
  return page
    .locator('canvas')
    .first()
    .evaluate(async (element) => {
      const target = element as HTMLCanvasElement
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      const gl = target.getContext('webgl2') ?? target.getContext('webgl')
      if (!gl || gl.drawingBufferWidth < 8 || gl.drawingBufferHeight < 8) return 0
      const y = gl.drawingBufferHeight - Math.max(2, Math.round(gl.drawingBufferHeight * 0.04))
      let red = 0
      for (const share of [0.25, 0.5, 0.75]) {
        const pixel = new Uint8Array(4)
        const x = Math.round(gl.drawingBufferWidth * share)
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
        if (pixel[0]! > pixel[2]! + 20 && pixel[0]! > pixel[1]! + 20 && pixel[3]! > 0) red++
      }
      return red
    })
}

test('game-3d exportado: o herói do Molda (GLB com ossos) anima e o céu HDR aparece fora do Estúdio', async ({
  page,
}) => {
  test.setTimeout(90_000)
  const diagnostics = collectDiagnostics(page)
  await openExported(
    page,
    exportedProject(
      'game-3d',
      `${MEU_HEROI_MOLDA_SOURCE}
SZGame3D.skyPhoto(cena, "ceu-hdr");
window.__heroi = heroi;`,
      [HEROI, CEU],
    ),
  )
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20_000 })

  await expect
    .poll(
      () =>
        page.evaluate(() => {
          type Node3D = { isSkinnedMesh?: boolean; traverse(fn: (node: Node3D) => void): void }
          const host = window as unknown as {
            __heroi?: {
              userData?: {
                sz?: {
                  modelLoaded?: boolean
                  modelRoot?: Node3D
                  anim?: { current(): string } | null
                }
              }
            }
          }
          const state = host.__heroi?.userData?.sz
          let skinned = 0
          state?.modelRoot?.traverse((node) => {
            if (node.isSkinnedMesh) skinned++
          })
          return {
            loaded: state?.modelLoaded === true,
            skinned: skinned > 0,
            clip: state?.anim?.current() ?? '',
          }
        }),
      { timeout: 30_000 },
    )
    .toEqual({ loaded: true, skinned: true, clip: 'Acenar' })
  await expect.poll(() => redSkySamples(page), { timeout: 30_000 }).toBeGreaterThanOrEqual(2)
  expect(diagnostics, diagnostics.join('\n')).toEqual([])
})

test('world-3d exportado: personagem e "Pôr o modelo" do Molda com o céu HDR fora do Estúdio', async ({
  page,
}) => {
  test.setTimeout(90_000)
  const diagnostics = collectDiagnostics(page)
  await openExported(
    page,
    exportedProject(
      'world-3d',
      `
SZWorld3D.setup({ style: 'floresta', world: 120 });
SZWorld3D.person('#3b82f6', 'nenhum');
SZWorld3D.personModel('heroi-do-molda', 1.7);
SZWorld3D.modelAnim('personagem', '', 'parado', 'Acenar');
SZWorld3D.placeModel('heroi-do-molda', 4, 6, 2, 0, 'Esticar');
SZWorld3D.skyPhoto('ceu-hdr');
SZWorld3D.start();
`,
      [HEROI, CEU],
    ),
  )
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20_000 })
  const startButton = page.locator('button:visible').first()
  if ((await startButton.count()) > 0) await startButton.click({ force: true })

  await expect.poll(() => redSkySamples(page), { timeout: 30_000 }).toBeGreaterThanOrEqual(2)
  // Um modelo que não abrisse (ou um clipe que não existisse) vira aviso no console.
  await page.waitForTimeout(500)
  expect(diagnostics, diagnostics.join('\n')).toEqual([])
})

test('game-3d-advanced exportado: GLB animado e céu HDR fora do Estúdio', async ({ page }) => {
  test.setTimeout(90_000)
  const diagnostics = collectDiagnostics(page)
  await openExported(
    page,
    exportedProject(
      'game-3d-advanced',
      `
SZGameKit3D.setup({ width: 640, height: 360, world: 30, sky: '#000044', ground: '#101010' });
SZGameKit3D.defineMold('heroi', { health: 10, speed: 0 }, function () {
  SZGameKit3D.part({ shape: 'modelo', model: 'heroi-glb', w: 2, h: 2, d: 2, x: 0, y: 0, z: 0 });
});
SZGameKit3D.setStateAnim('heroi', 'parado', 'andar');
SZGameKit3D.onEnterState('jogando', function () {
  window.__assetEntity = SZGameKit3D.spawn('heroi', 0, 0, 0);
  SZGameKit3D.setSkyPhoto('ceu-hdr');
  SZGameKit3D.cameraOrbit(8);
});
SZGameKit3D.start();
`,
      [
        {
          id: 'asset-glb',
          name: 'heroi-glb',
          kind: 'model3d',
          dataUrl: makeAnimatedGlb('ModeloExportado', ['andar']),
          originalFileName: 'heroi.glb',
          source: 'upload',
        },
        CEU,
      ],
    ),
  )
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20_000 })
  await page.locator('button:visible').first().click({ force: true })

  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const host = window as unknown as {
            __assetEntity?: {
              _action?: { getClip(): { name: string } }
              mesh?: { traverse(fn: (node: { name?: string }) => void): void }
            }
          }
          let hasModelNode = false
          host.__assetEntity?.mesh?.traverse((node) => {
            if (node.name === 'ModeloExportado') hasModelNode = true
          })
          return { hasModelNode, action: host.__assetEntity?._action?.getClip().name ?? '' }
        }),
      { timeout: 30_000 },
    )
    .toEqual({ hasModelNode: true, action: 'andar' })
  await expect.poll(() => redSkySamples(page), { timeout: 30_000 }).toBeGreaterThanOrEqual(2)
  expect(diagnostics, diagnostics.join('\n')).toEqual([])
})

test('game-3d exportado sem o arquivo do modelo: aviso gentil e o jogo segue com a forma de reserva', async ({
  page,
}) => {
  test.setTimeout(90_000)
  const diagnostics = collectDiagnostics(page)
  // O código pede o herói, mas o projeto foi exportado sem ele (o arquivo saiu do projeto).
  await openExported(
    page,
    exportedProject(
      'game-3d',
      `${MEU_HEROI_MOLDA_SOURCE}
window.__heroi = heroi;`,
      [CEU],
    ),
  )
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20_000 })
  await expect
    .poll(() => diagnostics.some((line) => line.includes('"heroi-do-molda" não está no projeto')), {
      timeout: 20_000,
    })
    .toBe(true)
  const fallback = await page.evaluate(() => {
    const host = window as unknown as {
      __heroi?: { visible?: boolean; userData?: { sz?: { modelLoaded?: boolean } } }
    }
    return {
      exists: Boolean(host.__heroi),
      loaded: host.__heroi?.userData?.sz?.modelLoaded === true,
    }
  })
  expect(fallback).toEqual({ exists: true, loaded: false })
  // Só o aviso do modelo: nenhum erro de página, nenhum outro tropeço.
  expect(
    diagnostics.filter((line) => !line.includes('"heroi-do-molda" não está no projeto')),
  ).toEqual([])
  expect(diagnostics.every((line) => line.startsWith('warning:'))).toBe(true)
})

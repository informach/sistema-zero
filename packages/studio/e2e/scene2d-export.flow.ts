import { writeFile } from 'node:fs/promises'
import { expect, type Frame, type Page, test } from '@playwright/test'

/**
 * Prova da exportação de um cenário 2D real (etapa 8 da régua, 21/11/2026). O exemplo "A Vila e a
 * Floresta" (cena do Pinta), montado pelo caminho da galeria, roda na prévia (quadro isolado,
 * política `strict`) e no site exportado. Nos dois, o próprio runtime responde pela cena: tamanho,
 * objetos com nome (dados estruturados, não uma imagem achatada) e um quadro desenhado, sem
 * nenhuma requisição de rede. Servidor: `scripts/serve-scene2d-export-proof.ts`.
 */

interface Expected {
  example: string
  width: number
  height: number
  objects: string[]
  layers: number
}

interface Receipt {
  width: number
  height: number
  objects: string[]
  door: string | null
  painted: number
}

async function readReceipt(frame: Frame): Promise<Receipt | null> {
  return frame.evaluate(() => {
    // Tipo local: outras specs já declaram `window.SZGame2D` com o pedaço da API que usam.
    const api = (
      window as unknown as {
        SZGame2D?: {
          mapSize(name: string, axis: 'width' | 'height'): number
          mapObjects(name: string, type: string): Array<{ name?: string }>
          mapObjectNamed(name: string, objectName: string): { name?: string } | null
        }
      }
    ).SZGame2D
    if (!api) return null
    let width = 0
    try {
      width = api.mapSize('mapa', 'width')
    } catch {
      return null
    }
    if (!(width > 0)) return null
    const canvases = [...document.querySelectorAll('canvas')]
    const canvas = canvases.sort((a, b) => b.width * b.height - a.width * a.height)[0]
    let painted = 0
    const context = canvas?.getContext('2d')
    if (canvas && context) {
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
      for (let index = 3; index < pixels.length; index += 4) if ((pixels[index] ?? 0) > 0) painted++
    }
    return {
      width,
      height: api.mapSize('mapa', 'height'),
      objects: api
        .mapObjects('mapa', '')
        .map((object) => object.name ?? '')
        .sort(),
      door: api.mapObjectNamed('mapa', 'Porta da cabana')?.name ?? null,
      painted,
    }
  })
}

async function gameFrame(page: Page, mode: 'preview' | 'export'): Promise<Frame> {
  if (mode === 'export') return page.mainFrame()
  await expect
    .poll(() => page.frames().some((frame) => frame.url().endsWith('/preview.html')))
    .toBe(true)
  return page.frames().find((frame) => frame.url().endsWith('/preview.html')) as Frame
}

for (const mode of ['preview', 'export'] as const) {
  test.describe(mode, () => {
    // O site exportado é uma PWA: o service worker dela é outra política de teste.
    test.use({ serviceWorkers: mode === 'export' ? 'block' : 'allow' })
    test(`${mode}: a Vila roda com a cena do Pinta como dados, sem rede`, async ({
      page,
    }, info) => {
      const errors: string[] = []
      const network: string[] = []
      const expected = (await (await page.request.get('/expected.json')).json()) as Expected
      expect(expected.example).toBe('A Vila e a Floresta')
      page.on('pageerror', (error) => errors.push(error.message))
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text())
      })
      page.on('request', (request) => {
        if (['fetch', 'xhr'].includes(request.resourceType())) network.push(request.url())
      })
      if (mode === 'preview') {
        await page.goto('/')
        await page.evaluate(() => {
          const frame = document.createElement('iframe')
          frame.title = 'Vila no quadro isolado'
          frame.setAttribute('sandbox', 'allow-scripts')
          frame.src = '/preview.html'
          frame.width = '800'
          frame.height = '600'
          document.body.append(frame)
        })
      } else await page.goto('/export/public/index.html')
      const frame = await gameFrame(page, mode)
      await expect.poll(async () => (await readReceipt(frame))?.painted ?? 0).toBeGreaterThan(1000)
      const receipt = (await readReceipt(frame)) as Receipt
      const receiptPath = info.outputPath('scene2d-receipt.json')
      await writeFile(receiptPath, JSON.stringify({ mode, expected, receipt }, null, 2))
      await info.attach('scene2d-receipt.json', {
        path: receiptPath,
        contentType: 'application/json',
      })
      expect(receipt.width).toBe(expected.width)
      expect(receipt.height).toBe(expected.height)
      expect(receipt.objects).toEqual(expected.objects)
      expect(receipt.door).toBe('Porta da cabana')
      expect(errors).toEqual([])
      expect(network).toEqual([])
    })
  })
}

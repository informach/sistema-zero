/** QA da importação no playground real. Inicie `bun run --filter @sistemazero/studio dev` antes. */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const { chromium } = createRequire(resolve(root, 'packages/studio/package.json'))(
  '@playwright/test',
)
process.chdir(root)
const studioURL = process.env.SZ_STUDIO_URL ?? 'http://127.0.0.1:5173/'

import { readFileSync } from 'node:fs'

const source = JSON.parse(
  readFileSync(
    'docs/aulas-interativas/faisca/a-ilha-do-farol/ilha-do-farol.szproject.json',
    'utf8',
  ),
)
const browser = await chromium.launch({
  executablePath:
    process.env.SZ_CHECK_CHROMIUM ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const errors = []
try {
  for (const [name, project] of [
    ['portatil', source],
    [
      'biblioteca-antiga',
      {
        ...source,
        assets: source.assets.map((a) => ({ ...a, libId: 'modelo-curso:' + 'c'.repeat(64) })),
      },
    ],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(studioURL)
    await page.locator('input[type=file]').setInputFiles({
      name: 'ilha.szproject.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(project)),
    })
    await page.waitForURL('**/editor/**')
    const element = page.locator('iframe[title="Pré-visualização"]')
    await element.waitFor()
    const frame = await element.contentFrame()
    await frame.locator('canvas').waitFor({ timeout: 45000 })
    await page.waitForTimeout(3000)
    const hasModels = await page
      .frames()
      .find((f) => f !== page.mainFrame() && f.url() === 'about:srcdoc')
      .evaluate(
        () =>
          Object.values(window.__SZGAME_ASSETS_3D || {}).filter((a) => a.dataUrl.length > 1000)
            .length,
      )
    if (hasModels !== 24) throw Error(name + ': modelos incompletos ' + hasModels)
    if (await page.getByRole('alert').count()) throw Error('Erro visível na importação')
    await page.screenshot({ path: '.cache/ilha-import-' + name + '.png' })
    console.log(name + ': importou 24 malhas reais, inclusive sem biblioteca compatível')
    await page.close()
  }
  // A referência desconhecida é um erro de preparação, não uma partida azul.
  const json = JSON.stringify({
    asset: { version: '2.0', extras: { szModeloCurso: 'c'.repeat(64) } },
    scene: 0,
    scenes: [{ nodes: [] }],
  })
  const padded = json + ' '.repeat((4 - (json.length % 4)) % 4),
    body = Buffer.from(padded),
    glb = Buffer.alloc(body.length + 20)
  glb.writeUInt32LE(0x46546c67, 0)
  glb.writeUInt32LE(2, 4)
  glb.writeUInt32LE(glb.length, 8)
  glb.writeUInt32LE(body.length, 12)
  glb.writeUInt32LE(0x4e4f534a, 16)
  body.copy(glb, 20)
  const invalid = {
    ...source,
    assets: source.assets.map((a, i) =>
      i === 0
        ? {
            ...a,
            libId: 'modelo-curso:' + 'c'.repeat(64),
            dataUrl: 'data:model/gltf-binary;base64,' + glb.toString('base64'),
          }
        : a,
    ),
  }
  const page = await browser.newPage()
  await page.goto(studioURL)
  await page.locator('input[type=file]').setInputFiles({
    name: 'ilha-incompativel.szproject.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(invalid)),
  })
  await page
    .getByText('Os modelos do jogo não carregaram', { exact: true })
    .waitFor({ timeout: 45000 })
  await page.getByRole('button', { name: 'Tentar de novo', exact: true }).click()
  await page.getByText('Os modelos do jogo não carregaram', { exact: true }).waitFor()
  console.log('referência indisponível: erro legível e nova tentativa, sem jogo incompleto')
  if (errors.length) throw Error(errors.join('\n'))
} finally {
  await browser.close()
}

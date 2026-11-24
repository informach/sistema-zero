import assert from 'node:assert/strict'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  fonte = resolve(raiz, 'output/morada-avatar-qa'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote3-testar-avatar')
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const p = await navegador.newPage()
  await p.route('**/qa-cute/**', async (route) => {
    const arquivo = decodeURIComponent(
      new URL(route.request().url()).pathname.slice('/qa-cute/'.length),
    )
    if (!/^(base|pecas)\/[\w.-]+\.(glb|webp)$/.test(arquivo)) return route.abort()
    const caminho = resolve(fonte, arquivo)
    if (!existsSync(caminho)) throw Error(`Arquivo de QA ausente: ${arquivo}`)
    await route.fulfill({
      path: caminho,
      contentType: arquivo.endsWith('.glb') ? 'model/gltf-binary' : 'image/webp',
    })
  })
  await p.goto('http://127.0.0.1:4541/?vazio=1')
  await p.waitForLoadState('networkidle')
  const modulo = `/@fs/${resolve(raiz, 'packages/molda-cenarios-motor/tests/browser/avatar-cute.ts').replaceAll('\\', '/')}`
  const [download, metadados] = await Promise.all([
    p.waitForEvent('download'),
    p.evaluate(async (modulo) => {
      const { avatarCuteParaEnsaio } = await import(modulo)
      const { bytes, ...metadados } = await avatarCuteParaEnsaio()
      const endereco = URL.createObjectURL(new Blob([bytes], { type: 'model/gltf-binary' })),
        link = document.createElement('a')
      link.href = endereco
      link.download = 'avatar-cute-ensaio.glb'
      link.click()
      return { ...metadados, bytes: bytes.byteLength }
    }, modulo),
  ])
  assert.ok(
    metadados.altura > 1.1 && metadados.altura < 1.25,
    `Altura inesperada: ${metadados.altura}`,
  )
  await download.saveAs(resolve(saida, 'avatar-cute-ensaio.glb'))
  writeFileSync(resolve(saida, 'metadados.json'), JSON.stringify(metadados, null, 2))
  console.log(
    JSON.stringify({
      altura: metadados.altura,
      clipes: metadados.clipes.length,
      bytes: metadados.bytes,
    }),
  )
} finally {
  await navegador.close()
}

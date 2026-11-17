import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..')
const modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`
const saida = resolve(process.argv[2] ?? resolve(raiz, 'output/cenarios-reforma/texturas'))
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
const resultados = []
try {
  for (const tema of ['light', 'dark']) {
    const p = await navegador.newPage({ viewport: { width: 1440, height: 900 } })
    const erros = []
    p.on('pageerror', (e) => erros.push(e.message))
    await p.goto(`http://127.0.0.1:4541/?vazio=1&tema=${tema}`)
    await p.waitForFunction(() => window.__cenarios)
    const arquivos = await p.evaluate(
      async (paths) => {
        const [{ criarFonteDeTexturas }, assets] = await Promise.all(paths.map((p) => import(p)))
        const textura = assets.createTextureAsset({
          name: 'Jardim do Molda',
          size: 16,
          now: Date.now(),
        })
        textura.bitmap.data.fill(6)
        const resumo = {
          itemId: textura.id,
          name: textura.name,
          kind: 'texture',
          revision: 1,
          bytes: 100,
          itemUpdatedAt: textura.updatedAt,
          syncedAt: Date.now(),
          thumb: null,
        }
        const dado = { json: JSON.stringify(assets.assetToJson(textura)), summary: resumo }
        const cloud = {
          list: async () => [dado.summary],
          download: async (id) => (id === textura.id ? dado : null),
        }
        const host = window.__cenarios.host
        host.texturasMolda = criarFonteDeTexturas({ perfilId: 'qa-texturas', cloud, host })
        window.__texturasQA = { dado, textura, assets }
        const arquivos = []
        for (const [nome, mime] of [
          ['Grama.png', 'image/png'],
          ['Areia.jpg', 'image/jpeg'],
          ['Pedra.webp', 'image/webp'],
        ]) {
          const c = document.createElement('canvas')
          c.width = 32
          c.height = 16
          const ctx = c.getContext('2d')
          ctx.fillStyle = '#a0be49'
          ctx.fillRect(0, 0, 32, 16)
          ctx.fillStyle = '#346e45'
          ctx.fillRect(0, 0, 16, 8)
          const b = await new Promise((r) => c.toBlob(r, mime))
          arquivos.push({ nome, mime, bytes: [...new Uint8Array(await b.arrayBuffer())] })
        }
        return arquivos
      },
      [
        modulo('packages/member-shell/src/lib/cenarios-moldes.ts'),
        modulo('packages/molda/src/assets/index.ts'),
      ],
    )
    await p.getByRole('button', { name: 'Bibliotecas', exact: true }).click()
    await p.getByRole('button', { name: 'Criar biblioteca', exact: true }).first().click()
    await p.getByRole('dialog').getByLabel('Nome', { exact: true }).fill('Jardins e caminhos')
    await p.getByRole('dialog').getByRole('button', { name: 'Criar', exact: true }).click()
    await p.getByRole('heading', { name: 'Jardins e caminhos', exact: true }).waitFor()
    await p.getByRole('button', { name: 'Chãos', exact: true }).click()
    const entradas = arquivos.map((a) => ({
      name: a.nome,
      mimeType: a.mime,
      buffer: Buffer.from(a.bytes),
    }))
    await p.getByLabel('Imagens de chão', { exact: true }).setInputFiles(entradas)
    await p.getByRole('button', { name: 'Editar Pedra', exact: true }).waitFor()
    const estado = () =>
      p.evaluate(async () => {
        const h = window.__cenarios.host,
          [b] = await h.listarBibliotecas('conta')
        return {
          biblioteca: b,
          pagina: await h.listarTexturas(b.id),
          usado: (await h.espacos())[0].usadoBytes,
        }
      })
    const inicial = await estado()
    assert.equal(inicial.pagina.total, 3)
    await p.getByLabel('Imagens de chão', { exact: true }).setInputFiles(entradas)
    await p.waitForTimeout(700)
    const repetido = await estado()
    assert.equal(repetido.pagina.total, 3)
    assert.equal(repetido.usado, inicial.usado)
    await p.getByRole('button', { name: 'Editar Grama', exact: true }).click()
    const dialogo = p.getByRole('dialog')
    await dialogo.getByLabel('Nome', { exact: true }).fill('Grama da Íris')
    await dialogo.getByLabel('Pasta', { exact: true }).fill('solo/verde')
    await dialogo.getByLabel('Etiquetas, separadas por vírgula').fill('verde, macia')
    await dialogo.getByLabel('Repetição em metros').fill('3.5')
    await dialogo.getByRole('button', { name: 'Guardar', exact: true }).click()
    await p.getByRole('button', { name: 'Editar Grama da Íris', exact: true }).waitFor()
    await p.getByRole('searchbox', { name: 'Buscar chão', exact: true }).fill('MACIA')
    await p.waitForFunction(
      () =>
        document.querySelectorAll('[aria-label="Chãos da biblioteca"] .mcn-modelo').length === 1,
    )
    await p.getByRole('searchbox', { name: 'Buscar chão', exact: true }).fill('')
    await p.getByRole('button', { name: 'Trazer do Molda', exact: true }).click()
    await p
      .getByRole('dialog')
      .getByRole('button', { name: 'Trazer Jardim do Molda', exact: true })
      .click()
    await p.getByRole('button', { name: 'Editar Jardim do Molda', exact: true }).waitFor()
    const primeira = await estado()
    await p.getByRole('button', { name: 'Trazer do Molda', exact: true }).click()
    await p
      .getByRole('dialog')
      .getByRole('button', { name: 'Trazer Jardim do Molda', exact: true })
      .click()
    await p.getByRole('dialog').waitFor({ state: 'hidden' })
    assert.equal((await estado()).pagina.total, 4)
    await p.evaluate(() => {
      const { dado, textura, assets } = window.__texturasQA
      textura.bitmap.data[0] = 2
      textura.updatedAt += 1000
      textura.name = 'Jardim do Molda novo'
      dado.json = JSON.stringify(assets.assetToJson(textura))
      dado.summary = {
        ...dado.summary,
        revision: 2,
        name: textura.name,
        itemUpdatedAt: textura.updatedAt,
      }
    })
    await p.getByRole('button', { name: 'Trazer do Molda', exact: true }).click()
    await p
      .getByRole('dialog')
      .getByRole('button', { name: 'Trazer Jardim do Molda novo', exact: true })
      .click()
    await p.getByRole('button', { name: 'Editar Jardim do Molda novo', exact: true }).waitFor()
    const final = await estado()
    assert.equal(final.pagina.total, 5)
    assert.equal(final.pagina.itens.find((t) => t.nome === 'Grama da Íris').repeticaoMetros, 3.5)
    const antiga = primeira.pagina.itens.find((t) => t.nome === 'Jardim do Molda')
    assert.ok(final.pagina.itens.some((t) => t.id === antiga.id && t.digest === antiga.digest))
    await p.waitForFunction(() =>
      [...document.querySelectorAll('[aria-label="Chãos da biblioteca"] img')].every(
        (i) => i.complete && i.naturalWidth > 0,
      ),
    )
    await p.screenshot({ path: resolve(saida, `biblioteca-${tema}.png`), fullPage: true })
    await p.setViewportSize({ width: 390, height: 844 })
    await p.waitForTimeout(300)
    assert.ok(
      await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      'Sem rolagem horizontal no celular',
    )
    await p.screenshot({ path: resolve(saida, `celular-${tema}.png`), fullPage: true })
    assert.deepEqual(erros, [])
    resultados.push({
      tema,
      formatos: ['PNG', 'JPEG convertido para PNG', 'WebP'],
      duplicacaoEvitada: true,
      buscaPorEtiqueta: true,
      escalaFisica: 3.5,
      texturas: final.pagina.total,
      revisaoAnteriorPreservada: true,
      erros,
    })
    await p.close()
  }
  writeFileSync(resolve(saida, 'resultado.json'), `${JSON.stringify({ resultados }, null, 2)}\n`)
  console.log(
    'Chãos: PNG/JPEG/WebP, edição, busca, cópia do Molda e versões preservadas nos dois temas',
  )
} finally {
  await navegador.close()
}

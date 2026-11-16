import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..')
const modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/').replace(/^\//, '')}`
const saida = resolve(raiz, 'output/cenarios-reforma/moldes')
mkdirSync(saida, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const p = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const erros = []
p.on('pageerror', (e) => erros.push(e.message))
try {
  await p.goto('http://127.0.0.1:4541/?vazio=1')
  await p.getByRole('heading', { name: 'Cenários', exact: true }).waitFor()
  await p.evaluate(
    async (paths) => {
      const [{ criarFonteDeMoldes }, assets, { migrateLegacyModel }, { sceneToJson }] =
        await Promise.all(paths.map((p) => import(p)))
      const casa = assets.createModelAsset({
        name: 'Casa do Molda',
        starter: false,
        now: Date.now(),
      })
      casa.parts = [assets.createPart({ name: 'Casa', from: [0, 0, 0], to: [1, 1, 1], color: 8 })]
      const arvore = assets.createModelAsset({
        name: 'Árvore do Molda',
        starter: false,
        now: Date.now(),
      })
      arvore.parts = [
        assets.createPart({ name: 'Árvore', from: [-0.5, 0, -0.5], to: [0.5, 2, 0.5], color: 6 }),
      ]
      const nativa = migrateLegacyModel(arvore).document
      const resumo = (a) => ({
        itemId: a.id,
        name: a.name,
        kind: 'model',
        revision: 1,
        bytes: 100,
        itemUpdatedAt: a.updatedAt,
        syncedAt: Date.now(),
        thumb: null,
      })
      const dados = [
        { json: JSON.stringify(assets.assetToJson(casa)), summary: resumo(casa) },
        {
          json: JSON.stringify(sceneToJson(nativa)),
          summary: { ...resumo(arvore), formatVersion: 2 },
        },
      ]
      const cloud = {
        list: async () => dados.map((d) => d.summary),
        download: async (id) => dados.find((d) => d.summary.itemId === id) ?? null,
      }
      const host = window.__cenarios.host
      host.molda = criarFonteDeMoldes({ perfilId: 'perfil-qa', cloud, host })
      window.__moldesQA = { dados, casa, assets }
    },
    [
      modulo('packages/member-shell/src/lib/cenarios-moldes.ts'),
      modulo('packages/molda/src/assets/index.ts'),
      modulo('packages/molda/src/scene/migrateLegacy.ts'),
      modulo('packages/molda/src/scene/documentJson.ts'),
    ],
  )
  await p.getByRole('button', { name: 'Criar mundo', exact: true }).first().click()
  await p.getByRole('dialog').getByLabel('Nome', { exact: true }).fill('Mundo dos moldes')
  await p.getByRole('dialog').getByRole('button', { name: 'Criar', exact: true }).click()
  await p.getByRole('heading', { name: 'Mundo dos moldes', exact: true }).waitFor()
  await p.getByRole('button', { name: 'Voltar aos mundos', exact: true }).click()
  await p.getByRole('button', { name: 'Bibliotecas', exact: true }).click()
  await p.getByRole('button', { name: 'Abrir Meus moldes', exact: true }).click()
  await p.getByText('Casa do Molda', { exact: true }).waitFor()
  await p.getByText('Árvore do Molda', { exact: true }).waitFor()
  await p.screenshot({ path: resolve(saida, 'biblioteca-viva.png') })
  await p.getByRole('button', { name: 'Voltar às bibliotecas', exact: true }).click()
  await p.getByRole('button', { name: 'Meus mundos', exact: true }).click()
  await p.getByRole('button', { name: 'Abrir Mundo dos moldes', exact: true }).click()
  await p.getByRole('button', { name: 'Criar cenário', exact: true }).first().click()
  await p.getByRole('dialog').getByLabel('Nome', { exact: true }).fill('Cópias dos moldes')
  await p.getByRole('dialog').getByRole('button', { name: 'Criar', exact: true }).click()
  await p.getByRole('heading', { name: 'Cópias dos moldes', exact: true }).waitFor()
  await p.getByRole('button', { name: 'Pôr Casa do Molda no cenário', exact: true }).click()
  async function esperarObjetos(n) {
    await p.waitForFunction(
      async (n) => {
        const h = window.__cenarios.host
        const [m] = await h.listarMundos('conta')
        const [c] = await h.listarCenarios(m.id)
        return (await h.abrirCenario(c.id)).documento.instancias.length === n
      },
      n,
      { timeout: 30_000 },
    )
  }
  await esperarObjetos(1)
  await p.getByRole('button', { name: 'Pôr Árvore do Molda no cenário', exact: true }).click()
  await esperarObjetos(2)
  await p.evaluate(() => {
    const { dados, casa, assets } = window.__moldesQA
    casa.parts[0].to = [2, 1, 1]
    casa.updatedAt += 1000
    casa.name = 'Casa do Molda nova'
    dados[0] = {
      json: JSON.stringify(assets.assetToJson(casa)),
      summary: { ...dados[0].summary, name: casa.name, itemUpdatedAt: casa.updatedAt, revision: 2 },
    }
    window.dispatchEvent(new Event('focus'))
  })
  await p.getByRole('button', { name: 'Pôr Casa do Molda nova no cenário', exact: true }).waitFor()
  await p.getByRole('button', { name: 'Pôr Casa do Molda nova no cenário', exact: true }).click()
  await esperarObjetos(3)
  await p.getByRole('button', { name: 'Pôr Casa do Molda nova no cenário', exact: true }).click()
  await esperarObjetos(4)
  const resultado = await p.evaluate(async () => {
    const h = window.__cenarios.host
    const [m] = await h.listarMundos('conta')
    const [c] = await h.listarCenarios(m.id)
    const d = (await h.abrirCenario(c.id)).documento
    const biblioteca = await h.obterBibliotecaDoMolda('conta')
    return {
      objetos: d.instancias.map((i) => ({ nome: i.nome, modelo: i.modelo })),
      modelos: d.modelos,
      copiasGuardadas: (await h.listarModelos(biblioteca.id)).total,
    }
  })
  assert.equal(resultado.copiasGuardadas, 3)
  assert.equal(resultado.modelos.length, 3)
  assert.notEqual(resultado.objetos[0].modelo, resultado.objetos[2].modelo)
  assert.equal(resultado.objetos[2].modelo, resultado.objetos[3].modelo)
  await p.screenshot({ path: resolve(saida, 'gaveta-e-copias.png') })
  assert.deepEqual(erros, [])
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify({ ...resultado, erros }, null, 2))
  console.log(
    'Molda v1/v2 na biblioteca e na gaveta; atualização preserva cópias, sem duplicar o mesmo GLB',
    JSON.stringify(resultado),
  )
} finally {
  await browser.close()
}

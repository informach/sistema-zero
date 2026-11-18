import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote3-testar-avatar')
const meta = JSON.parse(readFileSync(resolve(saida, 'metadados.json'), 'utf8'))
assert.ok(meta.triangulos > 0, 'Prepare a fixture do avatar antes do ensaio')
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
let p
try {
  const contexto = await navegador.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: resolve(saida, 'movimento'), size: { width: 1440, height: 900 } },
  })
  p = await contexto.newPage()
  const erros = []
  p.on('pageerror', (e) => erros.push(e.message))
  p.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text())
  })
  await p.route('**/qa-avatar.glb', (route) =>
    route.fulfill({
      path: resolve(saida, 'avatar-cute-ensaio.glb'),
      contentType: 'model/gltf-binary',
    }),
  )
  await p.goto('http://127.0.0.1:4541/?vazio=1&tema=light')
  await p.waitForLoadState('networkidle')
  await p.waitForFunction(() => window.__cenarios)
  const modulo = `/@fs/${resolve(raiz, 'packages/molda-cenarios-core/src/v2/index.ts').replaceAll('\\', '/')}`
  const ids = await p.evaluate(
    async ({ meta, modulo }) => {
      const h = window.__cenarios.host,
        core = await import(modulo)
      const b = await h.criarBiblioteca('conta', {
          nome: 'Personagem de ensaio',
          licenca: 'restrita',
        }),
        mundo = await h.criarMundo('conta', 'Escala do avatar')
      const conteudo = new Uint8Array(await (await fetch('/qa-avatar.glb')).arrayBuffer())
      const tela = document.createElement('canvas')
      tela.width = tela.height = 32
      tela.getContext('2d').fillStyle = '#3878bc'
      tela.getContext('2d').fillRect(0, 0, 32, 32)
      const miniatura = await new Promise((r) => tela.toBlob(r, 'image/png'))
      const [modelo] = await h.importarModelos(b.id, [
        {
          nome: 'Cute Characters — Ensaio',
          pasta: '',
          etiquetas: ['personagem'],
          digest: await core.digestDosBytes(conteudo),
          conteudo,
          miniatura,
          min: meta.min,
          max: meta.max,
          triangulos: meta.triangulos,
        },
      ])
      await h.editarMundo(mundo.id, { bibliotecas: [b.id] })
      const c = await h.criarCenario(mundo.id, 'Escala nativa'),
        d = core.criarDocumentoVazio(c.id, 'Escala nativa')
      const referencia = [
        {
          id: 'avatar',
          biblioteca: b.id,
          modelo: modelo.id,
          digest: modelo.digest,
          nome: modelo.nome,
          volume: {
            min: { x: meta.min[0], y: meta.min[1], z: meta.min[2] },
            max: { x: meta.max[0], y: meta.max[1], z: meta.max[2] },
          },
        },
      ]
      await h.editarCenario(
        c.id,
        0,
        [{ tipo: 'cenario.restaurar', documento: d }],
        crypto.randomUUID(),
      )
      return { cenario: c.id, modelo: modelo.id, referencia: referencia[0] }
    },
    { meta, modulo },
  )
  await p.getByRole('combobox', { name: 'De quem são', exact: true }).selectOption('equipe')
  await p.getByRole('combobox', { name: 'De quem são', exact: true }).selectOption('conta')
  await p.getByRole('button', { name: 'Abrir Escala do avatar', exact: true }).click()
  await p.getByRole('button', { name: 'Abrir Escala nativa', exact: true }).click()
  await p.getByText('Guardado', { exact: true }).waitFor()
  const original = await p.evaluate((id) => window.__cenarios.host.abrirCenario(id), ids.cenario)
  await p.getByRole('button', { name: 'Testar', exact: true }).click()
  const janela = p.getByRole('dialog')
  await janela
    .getByRole('button', { name: 'Escolher personagem da biblioteca', exact: true })
    .click()
  await p
    .getByRole('button', { name: 'Usar Cute Characters — Ensaio como personagem', exact: true })
    .click()
  assert.equal(
    await janela.getByLabel('Personagem', { exact: true }).inputValue(),
    `ensaio/${ids.modelo}`,
  )
  await janela.getByRole('button', { name: 'Entrar no cenário', exact: true }).click()
  const hud = p.getByRole('region', { name: 'Exploração do cenário', exact: true })
  await hud.waitFor()
  await hud.getByText('Altura: 1,17 m', { exact: true }).waitFor()
  await hud.getByText('Como explorar', { exact: true }).click()
  await hud.getByRole('button', { name: 'Animações do personagem', exact: true }).click()
  for (const [nome, clipe] of [
    ['Parado', 'parado_relaxado'],
    ['Andando', 'andar_frente'],
    ['Correndo', 'correr_frente'],
    ['No ar', 'pulo_no_ar'],
  ])
    await hud.getByLabel(nome, { exact: true }).selectOption(clipe)
  await hud.getByText('Como explorar', { exact: true }).click()
  await p.waitForTimeout(500)
  await p.screenshot({ path: resolve(saida, 'avatar-parado.png') })
  await hud.getByRole('button', { name: 'Medir caminhada', exact: true }).click()
  const canvas = p.locator('canvas.mcn-palco-tela')
  await canvas.focus()
  await p.keyboard.down('KeyW')
  await p.waitForTimeout(1400)
  await p.screenshot({ path: resolve(saida, 'avatar-andando.png') })
  await p.keyboard.up('KeyW')
  await p.keyboard.down('KeyD')
  await p.waitForTimeout(500)
  await p.keyboard.up('KeyD')
  await p.keyboard.down('ShiftLeft')
  await p.keyboard.down('KeyW')
  await p.waitForTimeout(1000)
  await p.screenshot({ path: resolve(saida, 'avatar-correndo.png') })
  await p.keyboard.press('Space')
  await p.waitForTimeout(250)
  await p.screenshot({ path: resolve(saida, 'avatar-pulando.png') })
  await p.keyboard.up('KeyW')
  await p.keyboard.up('ShiftLeft')
  await p.waitForTimeout(600)
  await hud.getByRole('combobox', { name: 'Modo de exploração' }).selectOption('primeira')
  await canvas.focus()
  await p.keyboard.down('KeyW')
  await p.waitForTimeout(1200)
  await p.keyboard.up('KeyW')
  await p.screenshot({ path: resolve(saida, 'avatar-primeira-pessoa.png') })
  await hud.getByRole('button', { name: 'Finalizar', exact: true }).click()
  const medida = await hud.locator('.mcn-teste-medida').innerText()
  await hud.getByRole('button', { name: 'Editar', exact: true }).click()
  const depois = await p.evaluate((id) => window.__cenarios.host.abrirCenario(id), ids.cenario)
  assert.deepEqual(depois.documento, original.documento)
  assert.equal(depois.revisao, original.revisao)
  assert.deepEqual(erros, [])
  writeFileSync(
    resolve(saida, 'ensaio.json'),
    JSON.stringify(
      {
        alturaNativa: meta.altura,
        clipes: meta.clipes,
        primeiraPessoa: true,
        terceiraPessoa: true,
        caminharCorrerCurvarPular: true,
        autoriaPreservada: true,
        personagemDaBibliotecaSemObjetoAutoral: true,
        medida,
        erros,
      },
      null,
      2,
    ),
  )
  console.log(
    JSON.stringify({
      altura: meta.altura,
      clipes: meta.clipes.length,
      autoriaPreservada: true,
      erros,
    }),
  )
  await contexto.close()
} catch (e) {
  if (p) await p.screenshot({ path: resolve(saida, 'falha.png') }).catch(() => {})
  throw e
} finally {
  await navegador.close()
}

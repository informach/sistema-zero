import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const saida = resolve(process.argv[2] ?? 'output/cenarios-reforma/lote3-testar')
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
const resultados = []
let pagina
try {
  for (const [tema, largura, altura] of [
    ['light', 1440, 900],
    ['dark', 1440, 900],
    ['light', 1366, 768],
    ['light', 1024, 900],
    ['dark', 390, 900],
  ]) {
    const contexto = await navegador.newContext({
      viewport: { width: largura, height: altura },
      hasTouch: largura === 390,
      recordVideo:
        largura === 1440 && tema === 'light'
          ? { dir: resolve(saida, 'movimento'), size: { width: 1440, height: 900 } }
          : undefined,
    })
    const p = await contexto.newPage()
    pagina = p
    const erros = []
    p.on('pageerror', (e) => erros.push(e.message))
    p.on('console', (m) => {
      if (m.type() === 'error') erros.push(m.text())
    })
    await p.goto(`http://127.0.0.1:4541/?vazio=1&tema=${tema}`)
    await p.waitForLoadState('networkidle')
    await p.waitForFunction(() => window.__cenarios)
    const ids = await p.evaluate(async () => {
      const h = window.__cenarios.host,
        m = await h.criarMundo('conta', 'Ensaio'),
        c = await h.criarCenario(m.id, 'Teste de caminhada')
      return { mundo: m.id, cenario: c.id }
    })
    await p.getByRole('combobox', { name: 'De quem são', exact: true }).selectOption('equipe')
    await p.getByRole('combobox', { name: 'De quem são', exact: true }).selectOption('conta')
    await p.getByRole('button', { name: 'Abrir Ensaio', exact: true }).click()
    await p.getByRole('button', { name: 'Abrir Teste de caminhada', exact: true }).click()
    await p.getByText('Guardado', { exact: true }).waitFor()
    const original = await p.evaluate((id) => window.__cenarios.host.abrirCenario(id), ids.cenario)
    await p.getByRole('button', { name: 'Testar', exact: true }).click()
    await p
      .getByRole('dialog')
      .getByRole('button', { name: 'Entrar no cenário', exact: true })
      .click()
    const hud = p.getByRole('region', { name: 'Exploração do cenário', exact: true })
    await hud.waitFor()
    await hud.getByRole('button', { name: 'Medir caminhada', exact: true }).click()
    const canvas = p.locator('canvas.mcn-palco-tela')
    await canvas.focus()
    await p.keyboard.down('KeyW')
    await p.waitForTimeout(1400)
    await p.keyboard.up('KeyW')
    await p.waitForTimeout(200)
    const caminhada = async () =>
      Number(
        (
          await hud
            .locator('dl>div')
            .filter({ has: p.getByText('Caminhada', { exact: true }) })
            .locator('dd')
            .innerText()
        )
          .replace(' m', '')
          .replace(',', '.'),
      )
    const distancia = await caminhada()
    assert.ok(distancia > 0.5, `A caminhada não avançou: ${distancia}`)
    if (largura === 390) {
      const seta = await hud
        .getByRole('button', { name: 'Andar para frente', exact: true })
        .boundingBox()
      assert.ok(seta)
      const cdp = await contexto.newCDPSession(p)
      const dedo = { id: 1, x: seta.x + seta.width / 2, y: seta.y + seta.height / 2 }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [dedo] })
      await p.waitForTimeout(700)
      const olhar = { id: 2, x: 290, y: 500 }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [dedo, olhar] })
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [dedo, { ...olhar, x: 240, y: 480 }],
      })
      await p.waitForTimeout(300)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await p.waitForTimeout(200)
      assert.ok((await caminhada()) > distancia + 0.5, 'O controle de toque não caminhou')
      await cdp.detach()
    }
    await p.screenshot({ path: resolve(saida, `terceira-${tema}-${largura}.png`) })
    await hud.getByRole('combobox', { name: 'Modo de exploração' }).selectOption('primeira')
    await canvas.focus()
    await p.keyboard.down('KeyD')
    await p.waitForTimeout(600)
    await p.keyboard.up('KeyD')
    await p.screenshot({ path: resolve(saida, `primeira-${tema}-${largura}.png`) })
    await hud.getByRole('button', { name: 'Pausar', exact: true }).focus()
    await p.keyboard.press('Space')
    await hud.getByRole('button', { name: 'Continuar', exact: true }).waitFor()
    const pausada = await caminhada()
    await p.waitForTimeout(400)
    assert.equal(await caminhada(), pausada)
    await hud.getByRole('button', { name: 'Continuar', exact: true }).click()
    await hud.getByRole('combobox', { name: 'Modo de exploração' }).selectOption('voo')
    await canvas.focus()
    await p.keyboard.down('KeyW')
    await p.keyboard.down('KeyE')
    await p.waitForTimeout(700)
    await p.keyboard.up('KeyW')
    await p.keyboard.up('KeyE')
    assert.equal(await caminhada(), pausada, 'O voo entrou na distância de caminhada')
    await p.keyboard.press('Control+z')
    await hud.getByRole('button', { name: 'Retornar ao início do teste', exact: true }).click()
    assert.equal(await caminhada(), pausada, 'Retornar ao início entrou na caminhada')
    await hud.getByRole('button', { name: 'Editar', exact: true }).click()
    await hud.waitFor({ state: 'detached' })
    const depois = await p.evaluate((id) => window.__cenarios.host.abrirCenario(id), ids.cenario)
    assert.deepEqual(depois.documento, original.documento)
    assert.equal(depois.revisao, original.revisao)
    assert.deepEqual(erros, [])
    resultados.push({
      tema,
      largura,
      altura,
      primeira: true,
      terceira: true,
      voo: true,
      caminhada: distancia,
      pausaNaoConta: true,
      vooNaoConta: true,
      retomadaNaoConta: true,
      autoriaPreservada: true,
      toqueComDuasMaos: largura === 390,
      erros,
    })
    console.log(`Teste jogável conferido: ${tema} ${largura}px`)
    await contexto.close()
  }
  writeFileSync(resolve(saida, 'resultados.json'), JSON.stringify(resultados, null, 2))
} catch (e) {
  if (pagina) await pagina.screenshot({ path: resolve(saida, 'falha.png') }).catch(() => {})
  throw e
} finally {
  await navegador.close()
}

#!/usr/bin/env node
/**
 * Ponta a ponta do Estúdio livre no navegador (Chromium headless do Playwright, via Node: o pipe
 * do Playwright não sobe sob o Bun no Windows). Para uma conta, um produto, uma linguagem e um
 * tipo de projeto:
 *
 *  1. entra (Kids: o adulto entra e abre o perfil Kids da conta pelo acesso "este aparelho");
 *  2. /estudio → "+ Novo projeto": registra se a opção Python aparece;
 *  3. cria o projeto, troca a fonte (Ponte nos clássicos, código no Pro) por uma com MARCA;
 *  4. executa a prévia e procura a MARCA na saída (página, console do Estúdio e frames);
 *  5. espera "Guardado na sua conta" (R2 local), recarrega e reabre pela lista: fonte preservada;
 *  6. abre de novo num navegador LIMPO (sem IndexedDB): o projeto vem da conta;
 *  7. com --publish: "Compartilhar" → Publicar → /jogar/<id> anônimo mostra a MARCA.
 *
 *   node scripts/local-studio-stack/studio-e2e.mjs <adulto|kids> <conta> <js|python> <classic|pro> [--publish]
 *
 * Saída: uma linha JSON com cada etapa; capturas em .cache/local-stack/browser/e2e/.
 */
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const STACK_DIR = join(ROOT, '.cache', 'local-stack')
const [app = 'adulto', key = 'admin', lang = 'js', kind = 'classic'] = process.argv.slice(2)
const publish = process.argv.includes('--publish')
const origin = app === 'kids' ? 'http://localhost:3008' : 'http://localhost:3007'
const creds = JSON.parse(fs.readFileSync(join(STACK_DIR, 'credentials.json'), 'utf8'))
const account = creds.accounts[key]
const outDir = join(STACK_DIR, 'browser', 'e2e')
fs.mkdirSync(outDir, { recursive: true })
const tag = `${app}-${key}-${lang}-${kind}`
const mark = `QA${Date.now().toString(36).toUpperCase()}`
const projectName = `QA ${lang} ${kind} ${mark}`
const source =
  lang === 'python'
    ? `print("${mark}")\n`
    : kind === 'pro'
      ? `const app = document.getElementById('app')\nif (app) app.textContent = '${mark}'\nconsole.log('${mark}')\n`
      : `document.body.insertAdjacentHTML('beforeend', '<p id="qa">${mark}</p>')\nconsole.log('${mark}')\n`

const require = createRequire(join(ROOT, 'packages', 'studio', 'package.json'))
const { chromium } = require('@playwright/test')
const browser = await chromium.launch()
const result = { tag, mark, steps: {} }
const step = (name, value) => {
  result.steps[name] = value
}

async function session() {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'pt-BR',
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)))
  const post = (path, data, headers = {}) =>
    page.request.post(origin + path, { data, headers: { origin, ...headers } })
  await page.goto(`${origin}/login`, { timeout: 300_000 })
  if (app === 'kids') await post('/api/study/prepare', {})
  const login = await post('/api/auth/login', { email: account.email, password: account.password })
  if (!login.ok()) throw new Error(`login ${login.status()}`)
  if (app === 'kids') {
    const profile = creds.profiles[key]
    const { sessionId } = await (await page.request.get(`${origin}/api/study/session`)).json()
    await post(
      '/api/study/grants',
      {
        profileId: profile.profileId,
        label: 'Navegador QA local',
        durationDays: 30,
        mode: 'current',
      },
      { 'x-sz-session': sessionId },
    )
    const enter = await post('/api/study/enter', { profileId: profile.profileId })
    if (!enter.ok()) throw new Error(`entrar no perfil ${enter.status()}`)
  }
  return { context, page, errors }
}

const shot = (page, name) => page.screenshot({ path: join(outDir, `${tag}-${name}.png`) })

async function allText(page) {
  const parts = [
    await page
      .locator('body')
      .innerText()
      .catch(() => ''),
  ]
  for (const frame of page.frames()) {
    parts.push(await frame.evaluate(() => document.body?.innerText ?? '').catch(() => ''))
  }
  return parts.join('\n')
}

async function editorText(page) {
  const views = page.locator('.monaco-editor .view-lines')
  const texts = await views.allInnerTexts().catch(() => [])
  return texts.join('\n').replace(/ /g, ' ')
}

/** Coloca o código: Ponte nos clássicos (aba do script), o editor do arquivo principal no Pro. */
async function writeSource(page) {
  if (kind === 'classic') {
    await page.getByRole('button', { name: 'Ponte', exact: true }).first().click()
    await page.waitForTimeout(2000)
    if (lang === 'js')
      await page.getByRole('button', { name: 'script.js', exact: true }).first().click()
  }
  // O textarea do Monaco fica escondido: o clique vai nas linhas visíveis do editor.
  await page.locator('.monaco-editor .view-lines').first().click()
  await page.keyboard.press('Control+A')
  await page.keyboard.press('Delete')
  await page.keyboard.insertText(source)
  await page.waitForTimeout(1500)
}

async function run(page) {
  for (const name of ['Reiniciar', 'Atualizar o preview', 'Executar']) {
    const button = page.getByRole('button', { name, exact: true }).first()
    if (await button.isVisible().catch(() => false)) {
      await button.click()
      break
    }
  }
  const console = page.getByRole('button', { name: 'Console', exact: true }).first()
  const deadline = Date.now() + (kind === 'pro' && lang === 'js' ? 180_000 : 60_000)
  while (Date.now() < deadline) {
    if (await console.isVisible().catch(() => false)) await console.click().catch(() => {})
    if ((await allText(page)).includes(mark)) return true
    await page.waitForTimeout(2000)
  }
  return false
}

async function cloudSaved(page) {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    if (
      await page
        .getByText('Não consegui guardar')
        .first()
        .isVisible()
        .catch(() => false)
    )
      return 'falhou'
    const saved = page.locator(
      '[aria-label="Guardado na sua conta"], [title="Guardado na sua conta"]',
    )
    if ((await saved.count()) > 0) return 'guardado'
    await page.waitForTimeout(1500)
  }
  return 'sem confirmação'
}

/** Reabre pela lista do /estudio e devolve a fonte que o editor mostra. */
async function reopen(page) {
  await page.goto(`${origin}/estudio`, { timeout: 300_000 })
  const card = page.getByText(projectName, { exact: false }).first()
  await card.waitFor({ timeout: 120_000 })
  await card.click()
  await page.waitForTimeout(6000)
  const open = page.getByRole('button', { name: /Abrir|Continuar/ }).first()
  if (await open.isVisible().catch(() => false)) await open.click()
  await page.waitForTimeout(6000)
  if (kind === 'classic') {
    await page
      .getByRole('button', { name: 'Ponte', exact: true })
      .first()
      .click()
      .catch(() => {})
    await page.waitForTimeout(2000)
    if (lang === 'js')
      await page
        .getByRole('button', { name: 'script.js', exact: true })
        .first()
        .click()
        .catch(() => {})
    await page.waitForTimeout(1500)
  }
  return editorText(page)
}

try {
  const first = await session()
  const { page } = first
  await page.goto(`${origin}/estudio`, { timeout: 300_000 })
  const newProject = page.getByRole('button', { name: '+ Novo projeto' }).first()
  await newProject.waitFor({ timeout: 300_000 })
  await newProject.click()
  await page.waitForTimeout(1500)
  const python = page.getByRole('radio', { name: 'Python' })
  step('opcaoPython', (await python.count()) > 0)
  await shot(page, '1-novo')
  if (lang === 'python') {
    if (!(await python.count())) throw new Error('opção Python ausente para esta conta')
    await python.check()
  }
  await page.getByRole('radio', { name: kind === 'pro' ? /^Pro/ : /^Clássico/ }).check()
  const name = page.getByRole('textbox', { name: 'Nome do projeto' })
  await name.fill(projectName)
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await page.waitForTimeout(8000)
  await writeSource(page)
  step('fonteEscrita', (await editorText(page)).includes(mark))
  step('execucao', await run(page))
  await shot(page, '2-execucao')
  step('nuvem', await cloudSaved(page))

  await page.reload({ timeout: 300_000 })
  await page.waitForTimeout(5000)
  step('reabrirAposRecarregar', (await reopen(page)).includes(mark))
  await shot(page, '3-reaberto')

  if (publish) {
    await page.getByRole('button', { name: 'Compartilhar', exact: true }).first().click()
    await page.waitForTimeout(3000)
    const describe = page.getByRole('textbox', { name: /Resumo|Descrição/ }).first()
    if (await describe.isVisible().catch(() => false)) await describe.fill(`Projeto ${mark}`)
    const cover = page.getByRole('button', { name: 'Gerar capa' }).first()
    if (await cover.isVisible().catch(() => false)) await cover.click()
    await page.waitForTimeout(4000)
    await page.getByRole('button', { name: 'Publicar', exact: true }).first().click()
    const play = page.locator('a[href^="/jogar/"]').first()
    const published = await play.waitFor({ timeout: 90_000 }).then(
      () => true,
      () => false,
    )
    await shot(page, '4-publicado')
    if (!published) {
      step(
        'publicar',
        (await allText(page)).match(/Não foi possível publicar[^\n]{0,300}/)?.[0] ?? 'sem link',
      )
    } else {
      const href = await play.getAttribute('href')
      step('publicar', href)
      const anonymous = await browser.newContext({ viewport: { width: 1280, height: 800 } })
      const visitor = await anonymous.newPage()
      await visitor.goto(origin + href, { timeout: 300_000 })
      const deadline = Date.now() + 90_000
      let seen = false
      while (!seen && Date.now() < deadline) {
        const start = visitor.getByRole('button', { name: /Jogar|Começar|Iniciar/ }).first()
        if (await start.isVisible().catch(() => false)) await start.click().catch(() => {})
        seen = (await allText(visitor)).includes(mark)
        if (!seen) await visitor.waitForTimeout(2000)
      }
      await visitor.screenshot({ path: join(outDir, `${tag}-5-jogar.png`) })
      step('jogarAnonimo', seen)
      await anonymous.close()
    }
  }
  await first.context.close()

  // Navegador limpo (sem IndexedDB): o projeto precisa vir da conta.
  const fresh = await session()
  step('reabrirNavegadorLimpo', (await reopen(fresh.page)).includes(mark))
  await shot(fresh.page, '6-limpo')
  step('errosDePagina', [...first.errors, ...fresh.errors].slice(0, 5))
  await fresh.context.close()
} catch (error) {
  step('erro', String(error?.message ?? error).slice(0, 400))
} finally {
  await browser.close()
}
console.log(JSON.stringify(result))

#!/usr/bin/env node
/**
 * Checagem única no navegador (Chromium headless do Playwright, via Node: o pipe do
 * Playwright não sobe sob o Bun no Windows): entra com uma conta, abre /estudio, abre
 * "+ Novo projeto", registra se a opção Python aparece e cria um projeto JavaScript.
 * Capturas em .cache/local-stack/browser/.
 *
 *   node scripts/local-studio-stack/browser-check.mjs [adulto|kids] [conta] [python]
 *   (`python` escolhe Python no diálogo e espera o runtime local carregar o frame)
 *   (kids entra no perfil Kids da conta pelo acesso de estudo "este aparelho")
 */
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const STACK_DIR = join(ROOT, '.cache', 'local-stack')
const app = process.argv[2] ?? 'adulto'
const key = process.argv[3] ?? 'admin'
const language = process.argv[4] === 'python' ? 'python' : 'javascript'
const origin = app === 'kids' ? 'http://localhost:3008' : 'http://localhost:3007'
const creds = JSON.parse(fs.readFileSync(join(STACK_DIR, 'credentials.json'), 'utf8'))
const account = creds.accounts[key]
const outDir = join(STACK_DIR, 'browser')
fs.mkdirSync(outDir, { recursive: true })

const require = createRequire(join(ROOT, 'packages', 'studio', 'package.json'))
const { chromium } = require('@playwright/test')
const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: 'pt-BR',
})
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
const shot = (name) =>
  page.screenshot({ path: join(outDir, `${app}-${key}-${language}-${name}.png`) })
const runtimeRequests = []
page.on('response', (r) => {
  if (r.url().startsWith('http://127.0.0.1:8791/'))
    runtimeRequests.push(`${r.status()} ${r.url().slice(22, 140)}`)
})
const post = (path, data, headers = {}) =>
  page.request.post(origin + path, { data, headers: { origin, ...headers } })

try {
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
  await page.goto(`${origin}/estudio`, { timeout: 300_000 })
  const newProject = page.getByRole('button', { name: '+ Novo projeto' }).first()
  await newProject.waitFor({ timeout: 300_000 })
  await shot('1-lista')
  await newProject.click()
  await page.waitForTimeout(1500)
  const dialogText =
    (await page
      .getByRole('dialog')
      .first()
      .innerText()
      .catch(() => '')) || ''
  if (language === 'python') await page.getByRole('radio', { name: 'Python' }).check()
  await shot('2-novo-projeto')
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await page.waitForTimeout(language === 'python' ? 30000 : 8000)
  await shot('3-editor')
  const workspace = await page.locator('.blocklyMainBackground, .monaco-editor').count()
  console.log(
    JSON.stringify({
      app,
      key,
      url: page.url(),
      pythonOptionInDialog: /python/i.test(dialogText),
      dialogText: dialogText.replace(/\s+/g, ' ').slice(0, 400),
      language,
      editorOpened: workspace > 0,
      runtimeRequests: runtimeRequests.slice(0, 12),
      pageErrors: errors.slice(0, 5),
    }),
  )
} finally {
  await browser.close()
}

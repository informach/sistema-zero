#!/usr/bin/env node
/**
 * A criança "Crianca QA" faz o curso do slot 1 de primeiros passos como no produto, no
 * navegador: abre a aula, envia o projeto do bloco Estúdio, publica no Mural ("Compartilhar" →
 * Gerar capa → Publicar) e conclui a aula. Pela política Kids v1 isso dá o nível coder
 * (`studio` + `pinta`) e libera a paleta do curso no Estúdio livre.
 *
 *   node scripts/local-studio-stack/kids-first-course.mjs [--new-child]
 *
 * Pré-requisito: `bun scripts/local-studio-stack/curriculum.ts author`. Se o Estúdio livre já
 * abre para a criança, não faz nada. `--new-child` cria antes um perfil novo na conta do
 * responsável (`POST /auth/profiles` pelo gateway, como no setup) e faz o curso com ele, para
 * repetir o fluxo inteiro depois que "Crianca QA" já concluiu.
 */
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const STACK_DIR = join(ROOT, '.cache', 'local-stack')
const origin = 'http://localhost:3008'
const COURSE = 'qa-local-primeiros-passos-kids'
const creds = JSON.parse(fs.readFileSync(join(STACK_DIR, 'credentials.json'), 'utf8'))
const outDir = join(STACK_DIR, 'browser', 'kids-first-course')
fs.mkdirSync(outDir, { recursive: true })

const require = createRequire(join(ROOT, 'packages', 'studio', 'package.json'))
const { chromium } = require('@playwright/test')
const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
const post = (path, data, headers = {}) =>
  page.request.post(origin + path, { data, headers: { origin, ...headers } })
const shot = (name) => page.screenshot({ path: join(outDir, `${name}.png`) })
const click = async (name, wait = 8000) => {
  await page.getByRole('button', { name, exact: true }).first().click({ timeout: 120_000 })
  await page.waitForTimeout(wait)
  await shot(name.replace(/[^a-z0-9]/gi, '_'))
}

/** Um perfil novo na conta do responsável, já admitido no Members. */
async function newChild(parent) {
  const gateway = 'http://localhost:3000'
  const api = async (method, path, body, token) => {
    const res = await fetch(gateway + path, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return { status: res.status, data: await res.json().catch(() => ({})) }
  }
  const login = await api('POST', '/auth/login', { ...parent, platform: 'kids' })
  const token = login.data.tokens?.accessToken
  if (!token) throw new Error(`login do responsável: ${login.status}`)
  const name = `Crianca QA ${Date.now().toString(36)}`
  const created = await api(
    'POST',
    '/auth/profiles',
    { requestId: randomUUID(), name, birthDate: '2015-05-10' },
    token,
  )
  if (created.status !== 201 || !created.data.profile)
    throw new Error(`perfil novo: ${created.status} ${JSON.stringify(created.data)}`)
  const profileId = created.data.profile.id
  for (let attempt = 1; attempt <= 40; attempt++) {
    const list = await api('GET', '/auth/profiles', undefined, token)
    if (list.data.profiles?.find((p) => p.id === profileId)?.admissionState === 'ready') {
      console.log(`✓ perfil novo "${name}" (${profileId}) admitido`)
      return profileId
    }
    await new Promise((resolve) => setTimeout(resolve, 3000))
  }
  throw new Error(`perfil novo ${profileId} não ficou ready`)
}

try {
  const parent = creds.accounts.kidsParent
  const childId = process.argv.includes('--new-child')
    ? await newChild({ email: parent.email, password: parent.password })
    : creds.child.profileId
  await page.goto(`${origin}/login`, { timeout: 300_000 })
  await post('/api/study/prepare', {})
  await post('/api/auth/login', { email: parent.email, password: parent.password })
  const { sessionId } = await (await page.request.get(`${origin}/api/study/session`)).json()
  await post(
    '/api/study/grants',
    {
      profileId: childId,
      label: 'Navegador QA local',
      durationDays: 30,
      mode: 'current',
    },
    { 'x-sz-session': sessionId },
  )
  if (!(await post('/api/study/enter', { profileId: childId })).ok())
    throw new Error('não entrou no perfil da criança')

  await page.goto(`${origin}/estudio`, { timeout: 300_000 })
  const visible = (locator, timeout) =>
    locator.waitFor({ timeout }).then(
      () => true,
      () => false,
    )
  if (await visible(page.getByRole('button', { name: '+ Novo projeto' }).first(), 60_000)) {
    console.log('• a criança já abre o Estúdio livre; nada a fazer')
  } else {
    await page.goto(`${origin}/cursos/${COURSE}`, { timeout: 300_000 })
    await page
      .getByRole('link', { name: /Aula 1/ })
      .first()
      .click()
    await page
      .getByRole('button', { name: /Enviar meu projeto|Enviar de novo/ })
      .first()
      .waitFor({ timeout: 300_000 })
    if (await page.getByRole('button', { name: 'Enviar meu projeto', exact: true }).isVisible()) {
      await click('Enviar meu projeto', 2000)
      await click('Enviar')
    }
    await click('Compartilhar', 3000)
    await click('Gerar capa', 4000)
    await click('Publicar', 10_000)
    const play = await page
      .locator('a[href^="/jogar/"]')
      .first()
      .getAttribute('href')
      .catch(() => null)
    console.log(
      play ? `✓ publicado no Mural: ${origin}${play}` : '⚠ sem link de jogar após publicar',
    )
    await page
      .getByRole('button', { name: 'Fechar', exact: true })
      .first()
      .click()
      .catch(() => {})
    await click('Concluir aula')
    await page.goto(`${origin}/estudio`, { timeout: 300_000 })
    const open = await visible(
      page.getByRole('button', { name: '+ Novo projeto' }).first(),
      120_000,
    )
    console.log(open ? '✓ a criança abre o Estúdio livre' : '✗ Estúdio livre ainda bloqueado')
  }
} finally {
  await browser.close()
}

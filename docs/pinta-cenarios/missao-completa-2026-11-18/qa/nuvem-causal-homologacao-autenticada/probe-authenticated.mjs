// From the repository root, point PINTA_QA_CREDENTIAL_FILE at the private login file.
// node docs/pinta-cenarios/missao-completa-2026-11-18/qa/nuvem-causal-homologacao-autenticada/probe-authenticated.mjs [adult|parent]
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

delete process.env.DEBUG
delete process.env.PWDEBUG

const origins = {
  adult: 'https://community-staging-66f2.up.railway.app',
  parent: 'https://community-kids-staging.up.railway.app',
}
const mode = process.argv[2] ?? 'adult'
const loginEndpoint = '/api/auth/login'
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function readCredential() {
  const raw = readFileSync(process.env.PINTA_QA_CREDENTIAL_FILE, 'utf8').replace(/^\uFEFF/, '')
  const tidy = (value) => value.trim().replace(/^\x60([^\x60]*)\x60$/, '$1')
  const lines = raw.split(/\r?\n/).map(tidy).filter(Boolean)
  const emailField =
    /^\s*(?:[-*]\s*)?(?:\*\*)?(?:e[- ]?mail|login|usu[aá]rio|user|username)(?:\*\*)?\s*[:=]\s*(?:\*\*\s*)?(.+?)\s*$/iu
  const passwordField =
    /^\s*(?:[-*]\s*)?(?:\*\*)?(?:senha|password)(?:\*\*)?\s*[:=]\s*(?:\*\*\s*)?(.+?)\s*$/iu
  const emails = lines
    .map((line) => tidy(emailField.exec(line)?.[1] ?? line))
    .filter((line) => emailPattern.test(line))
  const passwords = lines.map((line) => tidy(passwordField.exec(line)?.[1] ?? '')).filter(Boolean)
  if (new Set(emails).size === 1 && new Set(passwords).size === 1) {
    return { email: emails[0], password: passwords[0] }
  }
  if (lines.length === 2 && emailPattern.test(lines[0])) {
    return { email: lines[0], password: lines[1] }
  }
  throw new Error('Unsupported credential format')
}

async function observeAdult(page) {
  const observation = await page.evaluate(async () => {
    const get = async (path) => {
      const response = await fetch(path, { cache: 'no-store', credentials: 'same-origin' })
      return { status: response.status, payload: await response.json().catch(() => null) }
    }
    const [pinta, profile, avatar] = await Promise.all([
      get('/api/arquipelago/ferramentas/pinta'),
      get('/api/members/adult/profile'),
      get('/api/arquipelago/ferramentas/avatar'),
    ])
    return {
      pintaAccessStatus: pinta.status,
      pintaToolAvailable: pinta.payload?.situacao === 'disponivel',
      viewerId: pinta.payload?.viewerId ?? null,
      authenticatedProfileStatus: profile.status,
      avatarViewer: avatar.payload?.viewerId ?? null,
    }
  })
  const { viewerId, avatarViewer, ...evidence } = observation
  if (
    typeof viewerId !== 'string' ||
    !uuid.test(viewerId) ||
    viewerId !== avatarViewer ||
    evidence.authenticatedProfileStatus !== 200 ||
    evidence.pintaAccessStatus !== 200 ||
    !evidence.pintaToolAvailable
  ) {
    throw new Error('Verified adult actor or Pinta access unavailable')
  }
  const actor = { audience: 'adult', accountId: viewerId, userId: viewerId }
  const causalDiscoveryStatus = await page.evaluate(async (id) => {
    const response = await fetch('/api/pinta/causal/graph?reader=6', {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { 'x-sz-viewer': id, 'x-sz-viewer-audience': 'adult' },
    })
    await response.body?.cancel()
    return response.status
  }, viewerId)
  return {
    audience: actor.audience,
    ...evidence,
    causalDiscoveryStatus,
    verifiedActorSha256: createHash('sha256').update(JSON.stringify(actor)).digest('hex'),
  }
}

async function observeParent(page, origin) {
  const inventory = await page.evaluate(async () => {
    const response = await fetch('/api/profiles', { cache: 'no-store', credentials: 'same-origin' })
    const body = await response.json().catch(() => null)
    return {
      profilesStatus: response.status,
      ownedProfiles: Array.isArray(body?.profiles) ? body.profiles.length : null,
    }
  })
  if (inventory.profilesStatus !== 200 || inventory.ownedProfiles === null) {
    throw new Error('Owned profile inventory unavailable')
  }
  const editorPath = '/pais/nova-crianca'
  const editor = await page.goto(origin + editorPath, {
    waitUntil: 'domcontentloaded',
    timeout: 25000,
  })
  const creationFormVisible =
    new URL(page.url()).pathname === editorPath &&
    (await page.getByRole('button', { name: 'Salvar', exact: true }).isVisible())
  return {
    actorRole: 'parent',
    ...inventory,
    creationPageStatus: editor?.status() ?? null,
    creationFormVisible,
  }
}

let phase = 'credential format'
let loginStatus = null
let browser
let context
try {
  const origin = origins[mode]
  if (mode !== 'adult' && mode !== 'parent') throw new Error('Use adult or parent')
  let credential = readCredential()
  phase = 'isolated browser'
  const require = createRequire(join(process.cwd(), 'packages/molda-cenarios/package.json'))
  const { chromium } = require('playwright-core')
  browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--disable-extensions', '--disable-background-networking'],
  })
  context = await browser.newContext({ serviceWorkers: 'block', ignoreHTTPSErrors: false })
  let loginPending = true
  await context.route('**/*', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    if (url.origin !== origin) return route.abort()
    if (method === 'GET' || method === 'HEAD') return route.continue()
    if (loginPending && method === 'POST' && url.pathname === loginEndpoint) {
      loginPending = false
      return route.continue()
    }
    return route.abort()
  })

  phase = 'password login'
  const page = await context.newPage()
  const loginPage = await page.goto(origin + (mode === 'adult' ? '/login' : '/login/responsavel'), {
    waitUntil: 'domcontentloaded',
    timeout: 25000,
  })
  if (!loginPage?.ok() || new URL(page.url()).origin !== origin) {
    throw new Error('Staging login unavailable')
  }
  if (mode === 'parent')
    await page.getByRole('button', { name: 'Entrar com senha', exact: true }).click()
  const form = page.locator('form').filter({ has: page.locator('input[type="password"]') })
  await form.locator('input[type="email"]').fill(credential.email)
  await form.locator('input[type="password"]').fill(credential.password)
  credential = null
  const [response] = await Promise.all([
    page.waitForResponse(
      (candidate) => {
        const url = new URL(candidate.url())
        return (
          url.origin === origin &&
          url.pathname === loginEndpoint &&
          candidate.request().method() === 'POST'
        )
      },
      { timeout: 30000 },
    ),
    form.locator('button[type="submit"]').click(),
  ])
  loginStatus = response.status()
  if (loginStatus !== 200) throw new Error('Login refused')
  await page.waitForURL((url) => url.origin === origin && !url.pathname.startsWith('/login'), {
    waitUntil: 'domcontentloaded',
    timeout: 25000,
  })

  phase = mode === 'adult' ? 'adult Pinta access' : 'parent profile inventory'
  const observation =
    mode === 'adult' ? await observeAdult(page) : await observeParent(page, origin)
  phase = 'close isolated browser'
  await context.close()
  await browser.close()
  context = undefined
  browser = undefined
  console.log(
    JSON.stringify({
      environment: 'staging',
      origin,
      loginStatus,
      ...observation,
      sessionHandling: 'memory-only',
      browserContextClosed: true,
    }),
  )
} catch {
  console.error(JSON.stringify({ environment: 'staging', phase, loginStatus }))
  process.exitCode = 1
} finally {
  await context?.close().catch(() => {})
  await browser?.close().catch(() => {})
}

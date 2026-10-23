/**
 * Run after `bun run build`: node --import tsx tests/browser/presente.ts
 *
 * O presente Kids e adulto (20/10/2026): sobe o build com um referrals falso (via o gateway falso,
 * que não confere o HMAC) e confere, a 390 e a 1440 px: `/bolsa/<codigo>` Kids e adulto (o corpo
 * escolhido pelo público do código, um h1, âncoras, imagens, sem rolagem lateral), os estados
 * (encerrada, agendada, preparando, link inválido), a prévia do Admin com `?audience`, o resgate
 * nos dois públicos (concluído Kids, "já resgatado" adulto) e o painel do embaixador (o seletor
 * troca o link e o convite por e-mail leva o público escolhido). As capturas ficam em `QA_OUTPUT`
 * (padrão `tmp/presente-review` na raiz). `QA_CHROME_CHANNEL=chrome` usa o Chrome instalado e
 * `QA_CHROMIUM_PATH` um Chromium já baixado; sem os dois, o Chromium do Playwright.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type Browser, chromium, type Page } from 'playwright'

const cwd = fileURLToPath(new URL('../../', import.meta.url))
const output = process.env.QA_OUTPUT ?? resolve(cwd, '../../tmp/presente-review')
const TOKEN = 'qa-token-0123456789abcdef'
let origin = ''

const pessoal = (
  code: string,
  audience: 'kids' | 'adult',
  extra: Record<string, unknown> = {},
) => ({
  code,
  ownerKind: 'ambassador',
  displayName: 'Marta Lima',
  giftAvailable: true,
  source: { kind: 'ambassador', name: 'Marta Lima' },
  state: 'active',
  startsAt: null,
  endsAt: null,
  audience,
  ...extra,
})
const campanha = (code: string, audience: 'kids' | 'adult', state: string, extra = {}) => ({
  code,
  ownerKind: 'campaign',
  displayName: 'Feira de Ciências',
  giftAvailable: true,
  source: { kind: 'campaign', name: 'Feira de Ciências', context: 'event', description: '' },
  state,
  startsAt: '2026-11-01T13:00:00Z',
  endsAt: '2026-11-30T23:00:00Z',
  audience,
  ...extra,
})
const CODES: Record<string, unknown> = {
  'marta-k7q2': pessoal('marta-k7q2', 'kids'),
  'marta-a9x4': pessoal('marta-a9x4', 'adult'),
  'marta-prep': pessoal('marta-prep', 'adult', { giftAvailable: false }),
  'feira-fim': campanha('feira-fim', 'adult', 'ended'),
  'feira-breve': campanha('feira-breve', 'kids', 'scheduled'),
  // Resposta do referrals anterior a 20/10/2026: sem `audience`, vale Kids.
  'antigo-01': { ...pessoal('antigo-01', 'kids'), audience: undefined },
}
const invites: unknown[] = []

const gateway = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://gateway')
  const send = (status: number, body: unknown) => {
    res.writeHead(status, { 'content-type': 'application/json' })
    res.end(JSON.stringify(body))
  }
  let raw = ''
  req.on('data', (chunk) => {
    raw += chunk
  })
  req.on('end', () => {
    const code = url.pathname.match(/^\/referrals\/internal\/codes\/([^/]+)$/)?.[1]
    if (req.method === 'GET' && code) return CODES[code] ? send(200, CODES[code]) : send(404, {})
    if (url.pathname === `/referrals/internal/ambassadors/by-token/${TOKEN}`)
      return send(200, {
        name: 'Marta Lima',
        code: 'marta-k7q2',
        shareUrl: `${origin}/bolsa/marta-k7q2`,
        shareUrls: { kids: `${origin}/bolsa/marta-k7q2`, adult: `${origin}/bolsa/marta-a9x4` },
        stats: { redemptionsCompleted: 4, invitesSent: 2 },
        bonus: {
          pixKey: null,
          amountCents: 3000,
          items: [
            {
              id: 'b1',
              status: 'pending',
              bonusCents: 3000,
              subscribedAt: '2026-10-14T12:00:00Z',
              paidMarkedAt: null,
            },
            {
              id: 'b2',
              status: 'paid',
              bonusCents: 3000,
              subscribedAt: '2026-10-02T12:00:00Z',
              paidMarkedAt: '2026-10-12T12:00:00Z',
            },
          ],
        },
      })
    if (
      req.method === 'POST' &&
      url.pathname === `/referrals/internal/ambassadors/by-token/${TOKEN}/invites`
    ) {
      invites.push(JSON.parse(raw))
      return send(202, { ok: true })
    }
    if (req.method === 'POST' && url.pathname === '/referrals/internal/redemptions') {
      const body = JSON.parse(raw) as { email: string }
      if (body.email.startsWith('ja@'))
        return send(409, {
          error: { code: 'SCHOLARSHIP_ALREADY_REDEEMED', message: 'Já resgatado' },
        })
      return send(201, {
        status: 'completed',
        expiresAt: '2026-10-27T17:00:00Z',
        emailStatus: 'accepted',
        muralAccess: 'trial',
      })
    }
    send(503, {})
  })
})
await new Promise<void>((done) => gateway.listen(0, '127.0.0.1', done))
const address = gateway.address()
assert.ok(address && typeof address !== 'string')
const app = spawn('node', ['dist/server/entry.mjs'], {
  cwd,
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    NODE_ENV: 'development',
    HOST: '127.0.0.1',
    PORT: '0',
    DATABASE_URL: 'postgres://qa:qa@127.0.0.1:1/qa',
    GATEWAY_URL: `http://127.0.0.1:${address.port}`,
    FUNNEL_HMAC_SECRET: 'qa-isolated-local',
    FUNNEL_INTERNAL_TOKEN: 'qa-isolated-local',
    SENTRY_DSN: '',
    TRUST_PROXY: 'false',
    COMMUNITY_URL: 'https://comunidade.qa.local',
    KIDS_COMMUNITY_URL: 'https://kids.qa.local',
    FUNNEL_OFFER_KIDS_COMUNIDADE_DOS_CRIADORES: 'comunidade-dos-criadores-mensal',
    FUNNEL_OFFER_PRO_COMUNIDADE_DOS_CRIADORES: 'comunidade-dos-criadores-adulto-mensal',
    FUNNEL_OFFER_PRO_DESAFIO_PRIMEIRO_JOGO: 'desafio-primeiro-jogo-adulto-30-dias',
    FUNNEL_OFFER_KIDS_DESAFIO_PRIMEIRO_JOGO: 'desafio-primeiro-jogo-30-dias',
  },
})

/** Rola a página inteira para as imagens `loading="lazy"` carregarem antes da captura. */
async function carregarTudo(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
      window.scrollTo(0, y)
      await new Promise((done) => setTimeout(done, 40))
    }
    window.scrollTo(0, 0)
  })
  await page
    .waitForFunction(
      () =>
        Array.from(document.images).every(
          (img) => img.complete || img.getClientRects().length === 0,
        ),
      undefined,
      { timeout: 8000 },
    )
    .catch(() => {})
}

interface Caso {
  nome: string
  path: string
  status: number
  /** Um trecho que só o corpo certo tem (prova do despacho pelo público). */
  marca: RegExp
  tema: 'theme-kids' | 'theme-arcade'
  formulario: boolean
}
const CASOS: Caso[] = [
  {
    nome: 'kids',
    path: '/bolsa/marta-k7q2',
    status: 200,
    marca: /seu filho faz um jogo/,
    tema: 'theme-kids',
    formulario: true,
  },
  {
    nome: 'kids-legado',
    path: '/bolsa/antigo-01',
    status: 200,
    marca: /seu filho faz um jogo/,
    tema: 'theme-kids',
    formulario: true,
  },
  {
    nome: 'adulto',
    path: '/bolsa/marta-a9x4',
    status: 200,
    marca: /o seu primeiro jogo/,
    tema: 'theme-arcade',
    formulario: true,
  },
  {
    nome: 'adulto-preparando',
    path: '/bolsa/marta-prep',
    status: 200,
    marca: /ainda não abriu/,
    tema: 'theme-arcade',
    formulario: false,
  },
  {
    nome: 'adulto-encerrada',
    path: '/bolsa/feira-fim',
    status: 200,
    marca: /terminaram em 30\/11\/2026/,
    tema: 'theme-arcade',
    formulario: false,
  },
  {
    nome: 'kids-agendada',
    path: '/bolsa/feira-breve',
    status: 200,
    marca: /abre em 01\/11\/2026/,
    tema: 'theme-kids',
    formulario: false,
  },
  {
    nome: 'link-invalido',
    path: '/bolsa/nao-existe',
    status: 404,
    marca: /Este convite não está disponível/,
    tema: 'theme-kids',
    formulario: false,
  },
  {
    nome: 'previa-kids',
    path: '/bolsa/previa?audience=kids&title=Feira%20de%20Ci%C3%AAncias',
    status: 200,
    marca: /Prévia da campanha/,
    tema: 'theme-kids',
    formulario: false,
  },
  {
    nome: 'previa-adulto',
    path: '/bolsa/previa?audience=adult&title=Feira%20de%20Ci%C3%AAncias',
    status: 200,
    marca: /Prévia da campanha[\s\S]*primeiro jogo/,
    tema: 'theme-arcade',
    formulario: false,
  },
  {
    nome: 'embaixador',
    path: `/embaixador/${TOKEN}`,
    status: 200,
    marca: /Escolha para quem é o presente/,
    tema: 'theme-kids',
    formulario: false,
  },
]

let browser: Browser | undefined
try {
  origin = await new Promise<string>((done, fail) => {
    let log = ''
    const timer = setTimeout(() => fail(new Error(`Server did not start: ${log}`)), 30000)
    const started = (chunk: Buffer) => {
      log = (log + chunk.toString()).slice(-4000)
      const url = log.match(/Server listening on (http:\/\/127\.0\.0\.1:\d+)/)?.[1]
      if (url) {
        clearTimeout(timer)
        done(url)
      }
    }
    app.stdout.on('data', started)
    app.stderr.on('data', started)
    app.once('exit', (code) => {
      clearTimeout(timer)
      fail(new Error(`Server exited ${code}: ${log}`))
    })
  })
  console.log(`QA server: ${origin}`)
  browser = await chromium.launch(
    process.env.QA_CHROME_CHANNEL
      ? { channel: process.env.QA_CHROME_CHANNEL }
      : process.env.QA_CHROMIUM_PATH
        ? { executablePath: process.env.QA_CHROMIUM_PATH }
        : {},
  )
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  })
  await context.addCookies([{ name: 'sz_metrics', value: 'rejected', url: origin }])
  // As métricas não fazem parte do presente: respondem vazio para não depender do banco.
  await context.route(`${origin}/api/{events,analytics/**}`, (route) => route.fulfill({ json: {} }))
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await mkdir(output, { recursive: true })

  for (const caso of CASOS) {
    for (const largura of [390, 1440]) {
      await page.setViewportSize({ width: largura, height: largura === 390 ? 844 : 1000 })
      const response = await page.goto(`${origin}${caso.path}`)
      assert.equal(response?.status(), caso.status, `${caso.nome}: status`)
      await page.evaluate(() => document.fonts.ready)
      assert.equal(await page.locator('h1').count(), 1, `${caso.nome}: one h1`)
      assert.match(
        await page.locator('body').innerText(),
        caso.marca,
        `${caso.nome}: corpo do público`,
      )
      assert.ok(
        await page.evaluate((tema) => document.documentElement.classList.contains(tema), caso.tema),
        `${caso.nome}: ${caso.tema}`,
      )
      // As páginas do presente e o painel são privadas: nunca entram no índice.
      assert.equal(
        await page.locator('meta[name="robots"]').getAttribute('content'),
        'noindex, nofollow',
        `${caso.nome}: noindex`,
      )
      assert.equal(
        await page.locator('form .bz-input[name="nome"]').filter({ visible: true }).count(),
        caso.formulario ? 1 : 0,
        `${caso.nome}: formulário`,
      )
      const integrity = await page.evaluate(() => {
        const ids = Array.from(document.querySelectorAll('[id]')).map((el) => el.id)
        return {
          duplicates: ids.filter((id, i) => ids.indexOf(id) !== i),
          brokenAnchors: Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'))
            .filter((a) => a.hash && !document.getElementById(a.hash.slice(1)))
            .map((a) => a.hash),
          overflow: document.documentElement.scrollWidth - window.innerWidth,
        }
      })
      assert.deepEqual(
        integrity,
        { duplicates: [], brokenAnchors: [], overflow: 0 },
        `${caso.nome} @${largura}`,
      )
      if (largura === 1440) {
        const srcs = await page
          .locator('img[src]')
          .evaluateAll((els) => [...new Set(els.map((el) => (el as HTMLImageElement).src))])
        for (const src of srcs) assert.equal((await page.request.get(src)).status(), 200, src)
      }
      await carregarTudo(page)
      await page.screenshot({
        path: resolve(output, `${caso.nome}-${largura}.png`),
        fullPage: true,
      })
    }
  }

  // Resgate Kids até o concluído; adulto com e-mail que já resgatou aquele público.
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(`${origin}/bolsa/marta-k7q2`)
  await page.locator('#resgatar input[name="nome"]').fill('Paula Prado')
  await page.locator('#resgatar input[name="email"]').fill('paula@example.com')
  await page.locator('#resgatar button[type="submit"]').click()
  await page.getByText('O presente está liberado para a sua família').waitFor()
  assert.match(await page.locator('#resgatar').innerText(), /27\/10\/2026, às 14h[\s\S]*Mural Kids/)
  assert.equal(
    await page.getByRole('link', { name: 'Entrar na plataforma' }).getAttribute('href'),
    'https://kids.qa.local/login',
  )
  await page.locator('#resgatar').screenshot({ path: resolve(output, 'kids-concluido.png') })

  await page.goto(`${origin}/bolsa/marta-a9x4`)
  await page.locator('#resgatar input[name="nome"]').fill('Ana Souza')
  await page.locator('#resgatar input[name="email"]').fill('ja@example.com')
  await page.locator('#resgatar button[type="submit"]').click()
  await page.getByText('Este e-mail já recebeu um presente adulto').waitFor()
  assert.equal(
    await page.getByRole('link', { name: 'Ver como continuar' }).getAttribute('href'),
    '/pro/comunidade-dos-criadores/oferta/continuar',
  )
  await page.locator('#resgatar').screenshot({ path: resolve(output, 'adulto-ja-resgatado.png') })
  await page.locator('#resgatar input[name="email"]').fill('nova@example.com')
  await page.locator('#resgatar button[type="submit"]').click()
  await page.getByText('Está tudo pronto para o seu primeiro jogo').waitFor()
  assert.equal(
    await page.getByRole('link', { name: 'Entrar na Comunidade' }).getAttribute('href'),
    'https://comunidade.qa.local/login',
  )
  await page.locator('#resgatar').screenshot({ path: resolve(output, 'adulto-concluido.png') })

  // Painel: o seletor troca o link e o convite leva o público escolhido.
  await page.goto(`${origin}/embaixador/${TOKEN}`)
  const link = page.getByRole('textbox', { name: 'Seu link público do presente' })
  assert.equal(await link.inputValue(), `${origin}/bolsa/marta-k7q2`)
  await page.getByRole('radio', { name: /Alguém de 18 anos ou mais/ }).check()
  assert.equal(await link.inputValue(), `${origin}/bolsa/marta-a9x4`)
  assert.match(await page.locator('#painel').innerText(), /Link do presente para um adulto/)
  await page.getByRole('textbox', { name: 'Nome de quem vai receber' }).fill('Ana')
  await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('ana@example.com')
  await page.getByRole('button', { name: 'Enviar convite' }).click()
  await page.getByText('Convite enviado para ana@example.com.').waitFor()
  assert.deepEqual(invites, [{ name: 'Ana', email: 'ana@example.com', audience: 'adult' }])
  await page.getByRole('radio', { name: /Uma criança de 9 a 14 anos/ }).check()
  await page.getByRole('textbox', { name: 'Nome de quem vai receber' }).fill('Bia')
  await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('bia@example.com')
  await page.getByRole('button', { name: 'Enviar convite' }).click()
  await page.getByText('Convite enviado para bia@example.com.').waitFor()
  assert.deepEqual(invites[1], { name: 'Bia', email: 'bia@example.com' })
  assert.match(await page.locator('#bonus').innerText(), /R\$\s?30,00/)
  await page.getByRole('radio', { name: /Alguém de 18 anos ou mais/ }).check()
  await page.locator('#painel').screenshot({ path: resolve(output, 'embaixador-adulto-1440.png') })

  // A página pública do programa é indexada e leva o adulto à seção Embaixador de Meu perfil.
  const programa = await page.goto(`${origin}/kids/embaixadores`)
  assert.equal(programa?.status(), 200, 'programa: status')
  assert.equal(await page.locator('meta[name="robots"]').count(), 0, 'programa: indexada')
  assert.equal(
    await page.getByRole('link', { name: 'Entrar no app adulto' }).getAttribute('href'),
    'https://comunidade.qa.local/perfil#embaixador',
  )
  assert.equal(
    await page.getByRole('link', { name: 'Entrar na Área dos pais' }).getAttribute('href'),
    'https://kids.qa.local/pais/conta#embaixador',
  )

  assert.deepEqual(errors, [], 'page errors')
  console.log(`OK: ${CASOS.length} casos x 2 larguras, resgates e painel. Capturas em ${output}`)
} finally {
  await browser?.close()
  app.kill()
  gateway.close()
}

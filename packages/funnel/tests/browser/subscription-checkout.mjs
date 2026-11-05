import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const cwd = fileURLToPath(new URL('../../', import.meta.url))
const require = createRequire(new URL('../../package.json', import.meta.url))
const admin = createRequire(new URL('../../../admin/package.json', import.meta.url))
const { chromium } = require('playwright')
const postcss = createRequire(admin.resolve('@tailwindcss/postcss'))('postcss')
const from = resolve(cwd, 'src/styles/global.css')
const css = (
  await postcss([admin('@tailwindcss/postcss')({ base: cwd })]).process(
    readFileSync(from, 'utf8'),
    { from },
  )
).css
const temp = mkdtempSync(join(tmpdir(), 'sz-checkout-coupon-'))
assert.equal(dirname(temp), tmpdir())
const output = resolve(cwd, '../../.cache/commissions-970/checkout-browser')
mkdirSync(output, { recursive: true })
let server, browser
const attempts = [],
  quotes = []
let lostResponse = true,
  paymentStatus = 'PENDING'
try {
  execFileSync(
    'bun',
    [
      'build',
      'tests/browser/fixtures/subscription-checkout.tsx',
      '--target',
      'browser',
      '--external',
      'payment-token-efi',
      '--define',
      'process.env={"NODE_ENV":"production"}',
      '--define',
      'import.meta.env={"PUBLIC_EFI_ACCOUNT_IDENTIFIER":"isolated-qa"}',
      '--outfile',
      join(temp, 'fixture.js'),
    ],
    { cwd, stdio: 'pipe' },
  )
  const js = readFileSync(join(temp, 'fixture.js'))
  server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://local').pathname
    const send = (data, status = 200) => {
      res.writeHead(status, { 'content-type': 'application/json' })
      res.end(JSON.stringify(data))
    }
    if (path.startsWith('/api/')) {
      let raw = ''
      for await (const chunk of req) raw += chunk
      const body = raw ? JSON.parse(raw) : null
      if (path === '/api/leads') return send({})
      if (path === '/api/checkout/quote') {
        quotes.push(body)
        const price = body.offerSlug === 'anual' ? 97000 : 9700
        return send({
          ok: true,
          couponCode: 'PRIMEIRA50',
          priceCents: price,
          discountCents: price / 2,
          finalPriceCents: price / 2,
        })
      }
      if (path === '/api/checkout/subscription') {
        attempts.push(body)
        if (lostResponse) {
          lostResponse = false
          return send({ error: { code: 'UPSTREAM_ERROR', message: 'Lost response' } }, 502)
        }
        return send({
          subscriptionId: 'sub-qa',
          status: 'ACTIVE',
          paymentId: 'pay-qa',
          paymentStatus,
        })
      }
      if (path === '/api/checkout/pay-qa') return send({ status: paymentStatus })
      return send({ unexpected: path }, 500)
    }
    if (path === '/fixture.js') {
      res.writeHead(200, { 'content-type': 'text/javascript' })
      return res.end(js)
    }
    if (path === '/efi.js') {
      res.writeHead(200, { 'content-type': 'text/javascript' })
      return res.end(
        `const chain={isScriptBlocked:async()=>false,setCardNumber:()=>chain,verifyCardBrand:async()=>'visa',setAccount:()=>chain,setEnvironment:()=>chain,setCreditCardData:()=>chain,getPaymentToken:async()=>({payment_token:'isolated-token',card_mask:'************4242'})};export default {CreditCard:chain}`,
      )
    }
    res.writeHead(200, { 'content-type': 'text/html' })
    const kids = !req.url.includes('adult')
    res.end(
      `<!doctype html><html class="${kids ? 'theme-kids' : 'theme-arcade'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><body><div id="root"></div><script type="importmap">{"imports":{"payment-token-efi":"/efi.js"}}</script><script type="module" src="/fixture.js"></script></body></html>`,
    )
  })
  await new Promise((done) => server.listen(0, '127.0.0.1', done))
  const origin = `http://127.0.0.1:${server.address().port}`
  browser = await chromium.launch(process.platform === 'win32' ? { channel: 'chrome' } : {})
  for (const audience of ['kids', 'adult']) {
    lostResponse = true
    paymentStatus = 'PENDING'
    attempts.length = 0
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(`${origin}/?audience=${audience}`)
    await page.getByRole('region', { name: 'Resumo da assinatura' }).waitFor()
    assert.match(
      await page.getByRole('region', { name: 'Resumo da assinatura' }).innerText(),
      /48,50[\s\S]*97,00/,
    )
    await page.getByLabel('Anual', { exact: false }).check()
    assert.equal(await page.getByRole('region', { name: 'Resumo da assinatura' }).count(), 0)
    assert.match(await page.locator('body').innerText(), /Confira o cupom para o novo plano/)
    await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
    await page.getByRole('region', { name: 'Resumo da assinatura' }).waitFor()
    assert.equal(quotes.at(-1).offerSlug, 'anual')
    assert.match(
      await page.getByRole('region', { name: 'Resumo da assinatura' }).innerText(),
      /485,00[\s\S]*970,00/,
    )
    await page.locator('[name="termsAccepted"]').check()
    await page.locator('#metodo-cartao').check()
    for (const [label, value] of [
      ['Número do cartão', '4242424242424242'],
      ['Nome impresso no cartão', 'Pessoa de Teste'],
      ['Mês (MM)', '12'],
      ['Ano (AAAA)', '2035'],
      ['CVV', '123'],
      ['Data de nascimento do titular', '1990-05-10'],
      ['Endereço (rua/avenida)', 'Rua de Teste'],
      ['Número', '100'],
      ['Bairro', 'Centro'],
      ['CEP', '01001000'],
      ['Cidade', 'São Paulo'],
      ['UF', 'SP'],
    ])
      await page.getByLabel(label, { exact: true }).fill(value)
    for (const { width, fontSize } of [16, 18].flatMap((fontSize) =>
      [320, 390, 1440].map((width) => ({ width, fontSize })),
    )) {
      await page.evaluate((size) => {
        document.documentElement.style.fontSize = `${size}px`
      }, fontSize)
      await page.setViewportSize({ width, height: 900 })
      // A resposta do resize pode chegar antes do recálculo de layout no Chromium Linux.
      // Espere a condição visual; overflow persistente continua falhando com diagnóstico.
      await page
        .waitForFunction(() => document.documentElement.scrollWidth <= innerWidth, null, {
          timeout: 3000,
        })
        .catch(async (error) => {
          const layout = await page.evaluate(() => ({
            viewport: innerWidth,
            document: document.documentElement.scrollWidth,
            overflow: [...document.querySelectorAll('*')]
              .map((el) => ({
                tag: el.tagName,
                class: el.className,
                right: el.getBoundingClientRect().right,
                client: el.clientWidth,
                scroll: el.scrollWidth,
              }))
              .filter((el) => el.right > innerWidth || el.scroll > el.client + 1),
          }))
          await page.screenshot({
            path: join(output, `${audience}-${width}-overflow.png`),
            fullPage: true,
          })
          throw new Error(`${audience} ${width}: ${JSON.stringify(layout)}`, { cause: error })
        })
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
        `${audience} ${width}`,
      )
      if (width !== 320)
        await page.screenshot({
          path: join(output, `${audience}-${width}-${fontSize}.png`),
          fullPage: true,
        })
    }
    await page.getByRole('button', { name: /Assinar.*485,00/ }).click()
    await page.getByRole('button', { name: 'Conferir pagamento', exact: true }).waitFor()
    assert.equal(await page.locator('#plano-principal').isDisabled(), true)
    assert.equal(await page.locator('#metodo-pix').isDisabled(), true)
    assert.equal(
      await page.getByRole('button', { name: 'Remover', exact: true }).isDisabled(),
      true,
    )
    await page.getByRole('button', { name: 'Conferir pagamento', exact: true }).click()
    await page.waitForFunction(() =>
      document.querySelector('[role="status"]')?.textContent.includes('Aguarde'),
    )
    assert.equal(attempts.length, 2)
    assert.deepEqual(
      attempts[0],
      attempts[1],
      'lost response reuses authorized payload and attempt id',
    )
    assert.equal(attempts[0].couponCode, 'PRIMEIRA50')
    assert.equal(attempts[0].offerSlug, 'anual')
    assert.equal('number' in attempts[0], false)
    paymentStatus = 'FAILED'
    await page.getByRole('button', { name: 'Conferir pagamento', exact: true }).click()
    await page.getByRole('button', { name: /Assinar.*485,00/ }).waitFor()
    assert.equal(await page.locator('#plano-principal').isDisabled(), false)
    assert.deepEqual(errors, [])
    await page.close()
  }
  console.log(
    'PASS: Kids/Adult, first charge/full renewal, plan revalidation, pending locks, same-attempt replay, mobile/desktop',
  )
} finally {
  await browser?.close()
  await new Promise((done) => (server ? server.close(done) : done()))
  rmSync(temp, { recursive: true, force: true })
}

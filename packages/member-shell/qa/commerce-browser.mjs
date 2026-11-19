import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const require = createRequire(new URL('../../funnel/package.json', import.meta.url))
const { chromium } = require('playwright')
const evidence = resolve(import.meta.dirname, '../../../.cache/commerce-browser')
mkdirSync(evidence, { recursive: true })
const browser = await chromium.launch({ headless: true })
async function settle(page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => {})),
    ),
  )
}
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.request.get('http://127.0.0.1:5294/__reset')
  await page.goto('http://127.0.0.1:5294')
  await page.getByRole('button', { name: 'Assinar a comunidade', exact: true }).click()
  await page.getByRole('textbox', { name: 'CPF', exact: true }).waitFor()
  assert.equal(await page.getByRole('textbox', { name: 'Nome completo', exact: true }).count(), 0)
  assert.equal(await page.getByRole('textbox', { name: 'Telefone', exact: true }).count(), 0)
  await page.getByRole('textbox', { name: 'CPF', exact: true }).fill('52998224725')
  await page.getByRole('checkbox').check()
  await settle(page)
  await page.screenshot({ path: resolve(evidence, 'checkout-desktop.png'), fullPage: true })
  await page.getByRole('button', { name: 'Gerar Pix', exact: true }).click()
  await page.getByText('Aguardando a confirmação do pagamento.', { exact: true }).waitFor()
  assert.equal((await (await page.request.get('http://127.0.0.1:5294/__state')).json()).payCalls, 1)
  await page.reload()
  await page.getByRole('button', { name: 'Assinar a comunidade', exact: true }).click()
  await page.getByText('Aguardando a confirmação do pagamento.', { exact: true }).waitFor()
  assert.equal((await (await page.request.get('http://127.0.0.1:5294/__state')).json()).payCalls, 1)
  await page.goto('http://127.0.0.1:5294/?pending')
  await page.getByRole('button', { name: 'Acompanhar compra', exact: true }).click()
  await page.getByText('Aguardando a confirmação do pagamento.', { exact: true }).waitFor()
  await page.request.get('http://127.0.0.1:5294/__paid')
  await page.getByRole('button', { name: 'Conferir pagamento', exact: true }).click()
  await page.getByText('Seu acesso já está disponível na plataforma.', { exact: true }).waitFor()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('http://127.0.0.1:5294/?gift')
  await page.getByRole('button', { name: 'Ativar presente', exact: true }).click()
  await page.getByRole('button', { name: 'Ativar meu presente', exact: true }).waitFor()
  assert.equal(await page.locator('input').count(), 0)
  await settle(page)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: resolve(evidence, 'presente-mobile.png'), fullPage: true })
  await page.getByRole('button', { name: 'Ativar meu presente', exact: true }).click()
  await page.getByText('Presente ativado!', { exact: true }).waitFor()
  assert.equal(
    (await (await page.request.get('http://127.0.0.1:5294/__state')).json()).activated,
    true,
  )
  assert.ok(
    (await page.getByRole('link', { name: 'Continuar na plataforma' }).getAttribute('href')) ===
      '/pais/familia',
  )
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()
  // R05: fechar/reabrir após encerramento conserva a retomada e o prazo do claim.
  const pendingGift = await (await page.request.get('http://127.0.0.1:5294/__gift-pending')).json()
  await page.reload()
  await page.getByRole('button', { name: 'Ativar presente', exact: true }).click()
  await page.getByRole('button', { name: 'Conferir ativação', exact: true }).waitFor()
  assert.equal(
    await page
      .getByText('Esta campanha não está disponível para novas ativações.', { exact: true })
      .count(),
    0,
  )
  assert.equal(await page.locator('input').count(), 0)
  await settle(page)
  await page.screenshot({
    path: resolve(evidence, 'presente-pendente-campanha-encerrada.png'),
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Conferir ativação', exact: true }).click()
  await page.getByText('Presente ativado!', { exact: true }).waitFor()
  assert.ok(pendingGift.expiresAt)
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()
  await page.goto('http://127.0.0.1:5294/?adult')
  await page.getByRole('button', { name: 'Assinar a comunidade', exact: true }).click()
  await page.getByRole('dialog').waitFor()
  await settle(page)
  await page.screenshot({ path: resolve(evidence, 'checkout-adulto.png'), fullPage: true })
  await page.request.get('http://127.0.0.1:5294/__reset')
  await page.goto('http://127.0.0.1:5294/?monthly')
  await page.getByRole('button', { name: 'Assinar a comunidade', exact: true }).click()
  await page.getByRole('textbox', { name: 'Número do cartão', exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Pix', exact: true }).count(), 0)
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab')
    assert.equal(
      await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))),
      true,
    )
  }
  await settle(page)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: resolve(evidence, 'checkout-mensal-mobile.png'), fullPage: true })
  await page.keyboard.press('Escape')
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  assert.equal(
    await page
      .getByRole('button', { name: 'Assinar a comunidade', exact: true })
      .evaluate((button) => button === document.activeElement),
    true,
  )
  await page.request.get('http://127.0.0.1:5294/__reset')
  await page.goto('http://127.0.0.1:5294/')
  await page.getByRole('button', { name: 'Assinar a comunidade', exact: true }).click()
  await page.getByRole('textbox', { name: 'CPF', exact: true }).fill('52998224725')
  await page.getByRole('checkbox').check()
  await page.request.get('http://127.0.0.1:5294/__price')
  await page.getByRole('button', { name: 'Gerar Pix', exact: true }).click()
  await page.getByText(/980,00 por ano/).waitFor()
  assert.equal(await page.getByRole('checkbox').isChecked(), false)
  assert.equal((await (await page.request.get('http://127.0.0.1:5294/__state')).json()).payCalls, 0)
  // R02: a resposta pode apontar à compra já iniciada por outra oferta/aba.
  let adopted = null
  let adoptedStatusCalls = 0
  await page.route('**/api/commerce', async (route) => {
    const body = route.request().postDataJSON()
    if (body.action === 'pay') {
      const response = await route.fetch()
      const current = await response.json()
      adopted = {
        ...current,
        checkoutId: '40000000-0000-4000-8000-000000000099',
        origin: { kind: 'promotion', offerRef: 'comunidade-mensal' },
        offer: {
          ...current.offer,
          slug: 'comunidade-mensal',
          priceCents: 9700,
          billingIntervalMonths: 1,
        },
        status: 'PENDING',
        payment: { status: 'PENDING', pix: null },
      }
      return route.fulfill({ json: adopted })
    }
    if (body.action === 'status' && adopted) {
      assert.equal(body.checkoutId, adopted.checkoutId)
      assert.deepEqual(body.origin, adopted.origin)
      adoptedStatusCalls++
      return route.fulfill({ json: { ...adopted, status: 'PAID', accessGranted: true } })
    }
    return route.continue()
  })
  await page.request.get('http://127.0.0.1:5294/__reset')
  await page.goto('http://127.0.0.1:5294/')
  await page.getByRole('button', { name: 'Assinar a comunidade', exact: true }).click()
  await page.getByRole('textbox', { name: 'CPF', exact: true }).fill('52998224725')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Gerar Pix', exact: true }).click()
  await page.getByText('Aguardando a confirmação do pagamento.', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Conferir pagamento', exact: true }).click()
  await page.getByText('Seu acesso já está disponível na plataforma.', { exact: true }).waitFor()
  assert.ok(adoptedStatusCalls >= 1)
  assert.deepEqual(errors, [])
  console.log(
    'PASS: identidade visual Kids/adulto, dados faltantes, Pix retomado após recarga, confirmação, presente mobile sem recadastro, retomada após campanha encerrada e próximo passo Família.',
  )
} finally {
  await browser.close()
}

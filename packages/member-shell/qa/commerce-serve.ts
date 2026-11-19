import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '../../..')
const twPath = Bun.resolveSync('@tailwindcss/postcss', resolve(root, 'packages/community-kids'))
const { default: tailwind } = await import(twPath)
const postcss = createRequire(twPath)('postcss')
const styles = new Map<string, string>()
for (const app of ['community-kids', 'community']) {
  const from = resolve(root, `packages/${app}/src/app/globals.css`)
  styles.set(
    app,
    (
      await postcss([tailwind({ base: resolve(root, `packages/${app}`) })]).process(
        await Bun.file(from).text(),
        { from },
      )
    ).css,
  )
}
const bundle = await Bun.build({
  entrypoints: [resolve(import.meta.dir, 'commerce-client.tsx')],
  target: 'browser',
  define: { 'process.env.NODE_ENV': '"production"', 'process.env': '{}' },
})
if (!bundle.success) throw new AggregateError(bundle.logs, 'Falha na prévia')
const script = bundle.outputs.find((o) => o.path.endsWith('.js'))
if (!script) throw new Error('Bundle ausente')
let paid = false
let activated = false
let giftPending = false
const giftExpiresAt = new Date(Date.now() + 7 * 86400000).toISOString()
let payCalls = 0
const offer = {
  id: '20000000-0000-4000-8000-000000000001',
  slug: 'comunidade-anual',
  name: 'Comunidade dos Criadores',
  status: 'active',
  isAvailable: true,
  priceCents: 97000,
  pricingMode: 'subscription',
  billingIntervalMonths: 12,
  installmentsMax: null,
  accessMode: 'billing_cycle',
  accessDurationValue: null,
  accessDurationUnit: null,
  product: {
    id: '30000000-0000-4000-8000-000000000001',
    audience: 'kids',
    sku: 'COMUNIDADE',
    name: 'Comunidade',
    status: 'active',
  },
  content: null,
  includes: [],
}
const purchase = () => ({
  mode: 'purchase',
  origin: { kind: 'promotion', offerRef: 'comunidade-anual' },
  checkoutId: '40000000-0000-4000-8000-000000000001',
  offer,
  contact: { nome: 'Pessoa de Teste', email: 'qa@example.test', cpf: '', telefone: '11988887777' },
  birth: '',
  address: null,
  status: paid ? 'PAID' : payCalls ? 'PENDING' : 'READY',
  accessGranted: paid,
  payment: payCalls
    ? {
        status: paid ? 'PAID' : 'PENDING',
        pix: {
          copiaECola: 'PIX-DE-TESTE-SEM-VALOR',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        },
      }
    : null,
  cardConfig: { available: false, accountIdentifier: null, environment: 'sandbox' },
  termsVersion: 'qa',
  termsUrl: '/termos',
  privacyUrl: '/privacidade',
  config: { kind: 'purchase', offerRef: 'comunidade-anual' },
})
Bun.serve({
  hostname: '127.0.0.1',
  port: 5294,
  async fetch(req) {
    const url = new URL(req.url)
    if (url.pathname === '/app.js') return new Response(script)
    if (url.pathname === '/style.css')
      return new Response(
        styles.get(url.searchParams.get('adult') ? 'community' : 'community-kids'),
        { headers: { 'content-type': 'text/css' } },
      )
    if (url.pathname === '/__state') return Response.json({ paid, activated, payCalls })
    if (url.pathname === '/__gift-pending') {
      giftPending = true
      activated = false
      return Response.json({ expiresAt: giftExpiresAt })
    }
    if (url.pathname === '/__paid') {
      paid = true
      return Response.json({ ok: true })
    }
    if (url.pathname === '/__price') {
      offer.priceCents = 98000
      return Response.json({ ok: true })
    }
    if (url.pathname === '/__reset') {
      paid = false
      activated = false
      payCalls = 0
      offer.priceCents = 97000
      return Response.json({ ok: true })
    }
    if (url.pathname === '/api/commerce/pending')
      return Response.json({
        items:
          payCalls && !paid
            ? [{ checkoutId: purchase().checkoutId, origin: purchase().origin, title: offer.name }]
            : [],
      })
    if (url.pathname === '/api/commerce') {
      const body = (await req.json()) as {
        action: string
        origin: { offerRef: string }
        data?: { acceptedTerms?: boolean; expectedPriceCents?: number; contact?: { cpf?: string } }
      }
      if (body.origin.offerRef === 'cade-presente') {
        if (body.action === 'redeem') {
          const kind = activated ? 'already_redeemed' : 'completed'
          giftPending = false
          activated = true
          return Response.json({
            kind,
            expiresAt: giftExpiresAt,
          })
        }
        return Response.json({
          mode: 'gift',
          state: giftPending ? 'ended' : 'active',
          redemption: giftPending
            ? { status: 'pending', canResume: true, expiresAt: giftExpiresAt }
            : activated
              ? { status: 'completed', canResume: false, expiresAt: giftExpiresAt }
              : null,
          gift: {
            offerId: offer.id,
            offerTitle: 'Cadê Todo Mundo',
            courseTitle: 'Cadê Todo Mundo',
            courseSlug: 'cade-todo-mundo',
            learner: 'child',
            accessDays: 7,
            includesMural: false,
          },
          config: { kind: 'gift', campaignCode: 'qa-presente' },
        })
      }
      if (body.action === 'pay') {
        if (body.data?.expectedPriceCents !== offer.priceCents)
          return Response.json(
            {
              error: {
                code: 'OFFER_CHANGED',
                message: 'O preço mudou. Confira a oferta antes de confirmar.',
              },
            },
            { status: 409 },
          )
        if (!body.data?.acceptedTerms || !body.data.contact?.cpf)
          return Response.json({ error: { message: 'Confira os dados.' } }, { status: 400 })
        payCalls++
        return Response.json(purchase())
      }
      const view = purchase()
      if (body.origin.offerRef === 'comunidade-mensal')
        view.offer = { ...offer, billingIntervalMonths: 1, priceCents: 9700 }
      return Response.json(view)
    }
    return new Response(
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Comércio — QA local</title><link rel="stylesheet" href="/style.css${url.searchParams.has('adult') ? '?adult=1' : ''}"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>`,
      { headers: { 'content-type': 'text/html' } },
    )
  },
})
console.log('Prévia comercial em http://127.0.0.1:5294 (sem pagamentos reais)')

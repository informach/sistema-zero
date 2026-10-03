// Catálogo efêmero de QA, restrito ao loopback. Não autentica compradores,
// não cria cobranças, não envia mensagens e não deve ser usado no app habitual.
import { createFakeGateway } from '../fakes/fake-gateway'

const fake = createFakeGateway()
const slug = 'desafio-primeiro-jogo'
const modes = ['available', 'unavailable', 'wrong_duration', 'changed_price'] as const
type Mode = (typeof modes)[number]
let mode: Mode = 'available'
fake.addCoupon('QA10', 1000)
Bun.serve({
  hostname: '127.0.0.1',
  port: 3347,
  async fetch(request) {
    const url = new URL(request.url)
    if (url.pathname === '/__qa/catalog' && request.method === 'POST') {
      const body = (await request.json()) as { mode?: Mode }
      if (!body.mode || !modes.includes(body.mode)) return new Response(null, { status: 400 })
      mode = body.mode
      return Response.json({ mode })
    }
    const match = url.pathname.match(/^\/catalog\/offers\/([^/]+)(\/quote)?$/)
    if (!match) return Response.json({ error: { code: 'QA_CATALOG_ONLY' } }, { status: 503 })
    if (decodeURIComponent(match[1]!) !== slug)
      return Response.json({ error: { code: 'OFFER_NOT_FOUND' } }, { status: 404 })
    if (mode === 'unavailable')
      return Response.json({ error: { code: 'QA_OFFLINE' } }, { status: 503 })
    fake.setOfferConfig(slug, {
      priceCents: mode === 'changed_price' ? 7700 : 6700,
      pricingMode: 'one_time',
      accessMode: 'fixed',
      accessDurationValue: mode === 'wrong_duration' ? 7 : 30,
      accessDurationUnit: 'days',
    })
    const result = match[2]
      ? await fake.gateway.quoteOffer(
          slug,
          ((await request.json()) as { couponCode?: string }).couponCode,
        )
      : await fake.gateway.getOffer(slug)
    if (!match[2] && result.status === 200)
      Object.assign(result.body as object, {
        name: 'Desafio do Primeiro Jogo',
        product: { name: 'Desafio do Primeiro Jogo', sku: slug },
        content: { allowsCoupon: true },
      })
    return Response.json(result.body, { status: result.status })
  },
})
console.log('QA catalog on 127.0.0.1:3347; payments and messaging disabled')

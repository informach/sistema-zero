// Throwaway: reproduces exactly what the funnel BFF does on POST /api/checkout/pix
// (edge-HMAC sign as consumer `funnel` → gateway POST /payments). Delete after use.
import { createHmac, randomUUID } from 'node:crypto'

const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://localhost:3000'
const consumerId = process.env.FUNNEL_CONSUMER_ID ?? 'funnel'
const secret = process.env.FUNNEL_HMAC_SECRET
if (!secret) throw new Error('FUNNEL_HMAC_SECRET missing (run from packages/funnel)')

const leadId = randomUUID()
const idempotencyKey = `repro-${leadId}`
const input = {
  amountInCents: 3700,
  method: 'PIX',
  description: 'No Comando da IA (ebook)',
  payerMessage: 'Pagamento do ebook No Comando da IA',
  metadata: {
    leadId,
    sku: 'no-comando-da-ia',
    offerId: 'a322e3bf-0fe2-4538-812b-449b79942dff',
    nome: 'Repro Test',
    email: 'repro@example.com',
    telefone: '(11) 99999-9999',
  },
}
const rawBody = JSON.stringify(input)
const ts = Math.floor(Date.now() / 1000)
const sig = createHmac('sha256', secret).update(`${ts}.${idempotencyKey}.${rawBody}`).digest('hex')

const started = Date.now()
const res = await fetch(`${GATEWAY_URL}/payments`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-consumer-id': consumerId,
    'x-signature': `t=${ts},v1=${sig}`,
    'idempotency-key': idempotencyKey,
  },
  body: rawBody,
})
const text = await res.text()
console.log('elapsed_ms', Date.now() - started)
console.log('HTTP', res.status)
try {
  const j = JSON.parse(text)
  console.log(
    'id',
    j.id,
    'status',
    j.status,
    'has_pix',
    !!j.pix,
    'copia_len',
    j.pix?.copiaECola?.length ?? 0,
  )
} catch {
  console.log(text.slice(0, 800))
}

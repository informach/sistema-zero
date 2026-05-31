import { signHmac } from '../src/infrastructure/security/hmac'
import { hasFlag, readArg } from './args'

/**
 * Cliente de teste: simula um sistema consumidor.
 *   bun run call-example                 # cria a cobrança e mostra a resposta
 *   bun run call-example --poll          # após o POST, consulta GET /payments/:id
 *                                        # até o Pix aparecer (ideal p/ o modo assíncrono)
 *   opcionais: --secret <hmac>  --url http://localhost:3001  --consumer teste-local  --amount 100
 */
const baseUrl = readArg('url', 'BASE_URL') ?? 'http://localhost:3001'
const consumerId = readArg('consumer', 'CONSUMER_ID') ?? 'teste-local'
const secret = readArg('secret', 'CONSUMER_SECRET')
const amountInCents = Number(readArg('amount') ?? '100')
const poll = hasFlag('poll')

if (!secret) {
  console.error('❌ Informe o HMAC secret: --secret <secret> (ou CONSUMER_SECRET no .env)')
  process.exit(1)
}

interface PaymentView {
  id?: string
  status?: string
  pix?: { copiaECola?: string }
}

/**
 * Assina a mensagem canônica `"<ts>.<msg>"`, onde `msg` é `"<idempotencyKey>.<body>"`
 * quando há Idempotency-Key (POST) ou apenas `<body>` (GET, corpo vazio). Incluir
 * a chave na assinatura impede replay com troca de Idempotency-Key.
 */
function sign(body: string, idempotencyKey?: string): string {
  const ts = Math.floor(Date.now() / 1000)
  const msg = idempotencyKey ? `${idempotencyKey}.${body}` : body
  return `t=${ts},v1=${signHmac(secret as string, msg, ts)}`
}

async function createPayment(): Promise<{ httpStatus: number; view: PaymentView }> {
  const body = JSON.stringify({
    amountInCents,
    method: 'PIX',
    description: 'Cobrança de teste (local/sandbox)',
  })
  const idempotencyKey = `teste-${Math.floor(Date.now() / 1000)}-${Math.floor(Math.random() * 1_000_000)}`
  const res = await fetch(`${baseUrl}/payments`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-consumer-id': consumerId,
      'idempotency-key': idempotencyKey,
      'x-signature': sign(body, idempotencyKey),
    },
    body,
  })
  return { httpStatus: res.status, view: (await res.json()) as PaymentView }
}

async function getPayment(id: string): Promise<{ httpStatus: number; view: PaymentView }> {
  const res = await fetch(`${baseUrl}/payments/${id}`, {
    headers: { 'x-consumer-id': consumerId, 'x-signature': sign('') }, // GET → corpo vazio
  })
  return { httpStatus: res.status, view: (await res.json()) as PaymentView }
}

const TERMINAL = ['PAID', 'FAILED', 'EXPIRED', 'CANCELED']

console.log(`→ POST ${baseUrl}/payments  (consumer=${consumerId}, valor=R$ ${(amountInCents / 100).toFixed(2)})`)
const { httpStatus, view } = await createPayment()
console.log(`← HTTP ${httpStatus}  status=${view.status}  pix=${view.pix ? 'sim' : 'não'}  id=${view.id}`)

if (view.pix?.copiaECola) {
  console.log('\n✅ Cobrança Pix criada (síncrono)! Copia-e-cola:')
  console.log(view.pix.copiaECola)
} else if (httpStatus === 401 || httpStatus === 403) {
  console.log('\n⚠️ Auth recusada. Confira: secret, X-Consumer-Id e IP do consumidor na allowlist.')
} else if (poll && view.id) {
  console.log('\n⏳ Assíncrono: consultando GET /payments/:id até o worker criar a cobrança...')
  let done = false
  for (let i = 1; i <= 15 && !done; i++) {
    await Bun.sleep(1000)
    const polled = await getPayment(view.id)
    console.log(`  [${i}] HTTP ${polled.httpStatus}  status=${polled.view.status}  pix=${polled.view.pix ? 'sim' : 'não'}`)
    if (polled.view.pix?.copiaECola) {
      console.log('\n✅ QR disponível (criado pelo worker)! Copia-e-cola:')
      console.log(polled.view.pix.copiaECola)
      done = true
    } else if (TERMINAL.includes(polled.view.status ?? '')) {
      console.log(`\nℹ️ Estado terminal: ${polled.view.status}`)
      done = true
    }
  }
  if (!done) console.log('\n⚠️ Tempo esgotado — o worker ainda não criou a cobrança (veja os logs do servidor).')
} else if (httpStatus === 202) {
  console.log('\nℹ️ Aceito (assíncrono). Rode com --poll para acompanhar até o QR aparecer.')
}

import { randomBytes } from 'node:crypto'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { consumers } from '../src/infrastructure/persistence/drizzle/schema'
import { readArg } from './args'

/**
 * Cadastra (ou atualiza) um sistema consumidor autorizado a chamar este serviço.
 * Sem um registro em `consumers`, toda requisição é rejeitada com 401.
 *
 * Uso:
 *   bun run db:seed --id sistema-checkout --name "Checkout" --cidrs "203.0.113.10/32,10.0.0.0/8" \
 *     --webhook-url https://checkout.exemplo.com/webhooks/pagamentos
 *   (--secret é opcional; se omitido, um segredo HMAC forte é gerado)
 *   (--webhook-url é opcional; define para onde o serviço notifica o pagamento)
 */
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('❌ DATABASE_URL não definida.')
  process.exit(1)
}

const id = readArg('id', 'SEED_CONSUMER_ID')
if (!id) {
  console.error('❌ Informe o id do consumidor: --id <id>')
  process.exit(1)
}

const name = readArg('name', 'SEED_CONSUMER_NAME') ?? id
const cidrs = (readArg('cidrs', 'SEED_ALLOWED_CIDRS') ?? '')
  .split(',')
  .map((c) => c.trim())
  .filter(Boolean)
const secret = readArg('secret', 'SEED_HMAC_SECRET') ?? randomBytes(32).toString('hex')
const webhookUrl = readArg('webhook-url', 'SEED_WEBHOOK_URL') ?? null
// Fan-out: eventos aos quais o consumer assina além dos próprios pagamentos
// (ex.: --subscribed-events "payment.paid,payment.refunded" p/ o serviço fiscal).
const subscribedEvents = (readArg('subscribed-events', 'SEED_SUBSCRIBED_EVENTS') ?? '')
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean)

if (cidrs.length === 0) {
  console.warn(
    '⚠️  Nenhum CIDR informado (--cidrs "1.2.3.4/32,10.0.0.0/8"). ' +
      'O consumidor NÃO conseguirá chamar até ter IPs autorizados.',
  )
}

const { db, close } = createDbConnection(databaseUrl)

await db
  .insert(consumers)
  .values({
    id,
    name,
    hmacSecret: secret,
    allowedCidrs: cidrs,
    webhookUrl,
    subscribedEvents,
    isActive: true,
  })
  .onConflictDoUpdate({
    target: consumers.id,
    set: {
      name,
      hmacSecret: secret,
      allowedCidrs: cidrs,
      webhookUrl,
      subscribedEvents,
      isActive: true,
    },
  })

await close()

console.log('✅ Consumidor salvo:')
console.log(
  JSON.stringify({ id, name, allowedCidrs: cidrs, webhookUrl, subscribedEvents }, null, 2),
)
console.log('\n🔑 HMAC secret (guarde com segurança — configure no sistema consumidor):')
console.log(secret)

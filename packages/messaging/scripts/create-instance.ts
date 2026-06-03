/**
 * Cria uma instância na Evolution (retorna QR p/ parear) e a registra no banco.
 * Uso: `bun run evolution:create-instance <instanceName> <phoneNumber>`
 */
import { WhatsAppInstance } from '../src/domain/lane/whatsapp-instance.aggregate'
import { loadEnv } from '../src/infrastructure/config/env'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleWhatsAppInstanceRepository } from '../src/infrastructure/persistence/drizzle/whatsapp-instance.repository'

const env = loadEnv()
const [instanceName, phoneNumber] = process.argv.slice(2)

if (!instanceName || !phoneNumber) {
  console.error('uso: bun run evolution:create-instance <instanceName> <phoneNumber>')
  process.exit(1)
}
if (!env.EVOLUTION_URL || !env.EVOLUTION_API_KEY) {
  console.error('configure EVOLUTION_URL e EVOLUTION_API_KEY')
  process.exit(1)
}

const res = await fetch(`${env.EVOLUTION_URL.replace(/\/$/, '')}/instance/create`, {
  method: 'POST',
  headers: { apikey: env.EVOLUTION_API_KEY, 'content-type': 'application/json' },
  body: JSON.stringify({ instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' }),
})
console.log('evolution /instance/create →', res.status)
console.log((await res.text()).slice(0, 800))

const connection = createDbConnection(env.DATABASE_URL, { max: 2 })
const repo = new DrizzleWhatsAppInstanceRepository(connection.db)
if (await repo.findByInstanceName(instanceName)) {
  console.log('já registrada no banco')
} else {
  await repo.create(
    WhatsAppInstance.create({
      id: crypto.randomUUID(),
      instanceName,
      phoneNumber,
      warmup: true,
      now: new Date(),
    }),
  )
  console.log('registrada no banco (em aquecimento, DISCONNECTED até parear o QR)')
}
await connection.close()

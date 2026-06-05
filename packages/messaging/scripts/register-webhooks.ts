/**
 * Aponta o webhook de uma instância da Evolution para o nosso endpoint de status.
 * Uso: `bun run webhooks:register <instanceName> <url-publica-do-webhook>`
 *   ex.: bun run webhooks:register vendas https://gw.exemplo.com/messaging/webhooks/evolution?token=XYZ
 */
import { loadEnv } from '../src/infrastructure/config/env'

const env = loadEnv()
const [instanceName, url] = process.argv.slice(2)

if (!instanceName || !url) {
  console.error('uso: bun run webhooks:register <instanceName> <url>')
  process.exit(1)
}
if (!env.EVOLUTION_URL || !env.EVOLUTION_API_KEY) {
  console.error('configure EVOLUTION_URL e EVOLUTION_API_KEY')
  process.exit(1)
}

const res = await fetch(
  `${env.EVOLUTION_URL.replace(/\/$/, '')}/webhook/set/${encodeURIComponent(instanceName)}`,
  {
    method: 'POST',
    headers: { apikey: env.EVOLUTION_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      enabled: true,
      url,
      webhookByEvents: false,
      // Só o que o handler consome (SEND_MESSAGE era registrado e ignorado).
      events: ['MESSAGES_UPDATE', 'CONNECTION_UPDATE'],
    }),
  },
)
console.log(res.status, await res.text())

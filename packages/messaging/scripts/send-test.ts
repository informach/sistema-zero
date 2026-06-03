/**
 * Dispara um envio de teste contra o serviço local.
 * Uso: `bun run send:test <email|whatsapp> <templateKey> <email-ou-telefone>`
 */
import { loadEnv } from '../src/infrastructure/config/env'

const env = loadEnv()
const [channel, templateKey, contact] = process.argv.slice(2)

if ((channel !== 'email' && channel !== 'whatsapp') || !templateKey || !contact) {
  console.error('uso: bun run send:test <email|whatsapp> <templateKey> <email-ou-telefone>')
  process.exit(1)
}

const recipient =
  channel === 'email' ? { name: 'Teste', email: contact } : { name: 'Teste', phone: contact }

const headers: Record<string, string> = { 'content-type': 'application/json' }
if (env.MESSAGING_INTERNAL_TOKEN) headers['x-internal-token'] = env.MESSAGING_INTERNAL_TOKEN

const res = await fetch(`http://localhost:${env.PORT}/messaging/send`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    channel,
    templateKey,
    recipient,
    variables: { nome: 'Teste', link: 'https://exemplo.com/acesso' },
  }),
})

console.log(res.status, await res.text())

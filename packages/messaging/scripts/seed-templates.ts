/**
 * Popula templates iniciais (idempotente). Uso: `bun run templates:seed`.
 */
import { Template } from '../src/domain/template/template.aggregate'
import { loadEnv } from '../src/infrastructure/config/env'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleTemplateRepository } from '../src/infrastructure/persistence/drizzle/template.repository'

const env = loadEnv()
const connection = createDbConnection(env.DATABASE_URL, { max: 2 })
const templates = new DrizzleTemplateRepository(connection.db)
const now = new Date()

const seeds = [
  {
    key: 'welcome',
    channel: 'email' as const,
    name: 'Boas-vindas (e-mail)',
    subject: 'Bem-vindo(a), {{nome}}!',
    body: '<p>Olá {{nome}},</p><p>Seu acesso: <a href="{{link}}">{{link}}</a></p>',
    variables: ['nome', 'link'],
  },
  {
    key: 'welcome',
    channel: 'whatsapp' as const,
    name: 'Boas-vindas (WhatsApp)',
    body: 'Olá {{nome}}! 👋 Seu acesso: {{link}}',
    variables: ['nome', 'link'],
  },
  {
    key: 'password-reset',
    channel: 'email' as const,
    name: 'Redefinição de senha (e-mail)',
    subject: 'Redefina sua senha',
    body: '<p>Olá {{nome}},</p><p>Para definir ou redefinir sua senha, acesse: <a href="{{link}}">{{link}}</a></p><p>O link expira em 1 hora e só pode ser usado uma vez. Se você não solicitou, ignore este e-mail.</p>',
    variables: ['nome', 'link'],
  },
]

for (const seed of seeds) {
  const existing = await templates.findByChannelAndKey(seed.channel, seed.key)
  if (existing) {
    console.log(`já existe: ${seed.channel}/${seed.key}`)
    continue
  }
  await templates.create(Template.create({ id: crypto.randomUUID(), ...seed, now }))
  console.log(`criado: ${seed.channel}/${seed.key}`)
}

await connection.close()

import { randomBytes, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import path from 'node:path'
import { z } from 'zod'
import { createApplication as gatewayApp } from '../packages/api-gateway/src/composition-root'
import { loadEnv as gatewayEnv } from '../packages/api-gateway/src/infrastructure/config/env'
import { createApplication as authApp } from '../packages/auth/src/composition-root'
import { UserAggregate } from '../packages/auth/src/domain/user/user.aggregate'
import { Email } from '../packages/auth/src/domain/value-objects/email'
import { loadEnv as authEnv } from '../packages/auth/src/infrastructure/config/env'
import { createDbConnection } from '../packages/auth/src/infrastructure/persistence/drizzle/db'
import { DrizzleUserRepository } from '../packages/auth/src/infrastructure/persistence/drizzle/user.repository'
import { createBunPasswordHasher } from '../packages/auth/src/infrastructure/security/bun-password-hasher'
import { createApplication as marketingApp } from '../packages/marketing/src/composition-root'
import { loadEnv as marketingEnv } from '../packages/marketing/src/infrastructure/config/env'
import { reviewStorage } from './marketing-review-storage'

// Deliberately fixed to the disposable local review database, never DATABASE_URL.
for (const port of [15300, 15302, 15311]) {
  await new Promise<void>((resolve, reject) => {
    const probe = createServer()
    probe.once('error', () =>
      reject(
        new Error(`A porta ${port} já está ocupada. Encerre a stack anterior antes da revisão.`),
      ),
    )
    probe.listen({ host: '127.0.0.1', port, exclusive: true }, () =>
      probe.close((error) => (error ? reject(error) : resolve())),
    )
  })
}
const DATABASE_URL = 'postgres://postgres@127.0.0.1:15439/marketing_review'
const JWT_HS256_SECRET = 'marketing-local-review-only-not-for-production-2026'
const INTERNAL = 'marketing-review-internal-only-2026'
const HMAC = 'marketing-review-hmac-only-2026'
const common = {
  NODE_ENV: 'development',
  HOST: '127.0.0.1',
  DATABASE_URL,
  JWT_HS256_SECRET,
  JWT_ISSUER: 'sistemazero-auth',
  JWT_AUDIENCE: 'sistemazero',
  AUTH_INTERNAL_TOKEN: INTERNAL,
}
const auth = await authApp(authEnv({ ...common, PORT: '15302' }))
const marketing = marketingApp(
  marketingEnv({
    ...common,
    ...(await reviewStorage()),
    PORT: '15311',
    INTERNAL_API_TOKEN: INTERNAL,
    GATEWAY_URL: 'http://127.0.0.1:15300',
    MARKETING_HMAC_SECRET: HMAC,
  }),
)
Object.assign(process.env, {
  AUTH_URL: 'http://127.0.0.1:15302',
  MARKETING_URL: 'http://127.0.0.1:15311',
  AUTH_INTERNAL_TOKEN: INTERNAL,
  MARKETING_INTERNAL_TOKEN: INTERNAL,
  MARKETING_HMAC_SECRET: HMAC,
})
const { default: config } = await import('../packages/api-gateway/gateway.config')
const localConfig = {
  ...config,
  services: Object.fromEntries(
    Object.entries(config.services ?? {}).filter(([key]) => ['auth', 'marketing'].includes(key)),
  ),
  routes: config.routes?.filter((route) => ['auth', 'marketing'].includes(route.service)),
  consumers: [{ id: 'marketing', hmacSecret: HMAC }],
}
const gateway = await gatewayApp(
  gatewayEnv({
    ...common,
    PORT: '15300',
    AUTH_URL: process.env.AUTH_URL,
    MARKETING_URL: process.env.MARKETING_URL,
    MARKETING_INTERNAL_TOKEN: INTERNAL,
    GATEWAY_CONFIG_JSON: JSON.stringify(localConfig),
    SHUTDOWN_DRAIN_MS: '0',
    LOG_LEVEL: 'warn',
  }),
)
const connection = createDbConnection(DATABASE_URL)
const directory = path.resolve(
  import.meta.dir,
  '../packages/marketing-desktop/.cache/connected-proof',
)
await mkdir(directory, { recursive: true })
const fixtureSchema = z.object({
  email: z.string().email(),
  password: z.string().min(20),
  userId: z.string().uuid(),
  origin: z.literal('http://127.0.0.1:15312'),
})
let previous: z.infer<typeof fixtureSchema> | null = null
try {
  previous = fixtureSchema.parse(
    JSON.parse(await readFile(path.join(directory, 'fixture.json'), 'utf8')),
  )
} catch (error) {
  if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
    throw error
}
const users = new DrizzleUserRepository(connection.db)
const retained = previous && (await users.findById(previous.userId))
const id = retained && previous ? previous.userId : randomUUID()
const password = retained && previous ? previous.password : randomBytes(24).toString('base64url')
const email = retained && previous ? previous.email : `review-${id}@example.test`
if (!retained)
  await users.create(
    UserAggregate.register({
      id,
      email: Email.create(email),
      passwordHash: await createBunPasswordHasher().hash(password),
      firstName: 'Revisão',
      lastName: 'Marketing',
      role: 'staff',
      passwordSet: true,
    }),
  )
await connection.close()
await writeFile(
  path.join(directory, 'fixture.json'),
  JSON.stringify({ email, password, userId: id, origin: 'http://127.0.0.1:15312' }),
  { mode: 0o600 },
)
for (const service of [auth, marketing, gateway]) await service.start()
await writeFile(path.join(directory, 'stack.pid'), String(process.pid))
console.log('MARKETING_REVIEW_STACK_READY ports=15302,15311,15300 database=marketing_review')
let stopping = false
async function stop() {
  if (stopping) return
  stopping = true
  for (const service of [gateway, marketing, auth]) await service.stop()
  process.exit(0)
}
process.on('SIGINT', () => void stop())
process.on('SIGTERM', () => void stop())

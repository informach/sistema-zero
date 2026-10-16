import { randomBytes, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import { UserAggregate } from '../packages/auth/src/domain/user/user.aggregate'
import { Email } from '../packages/auth/src/domain/value-objects/email'
import { createDbConnection } from '../packages/auth/src/infrastructure/persistence/drizzle/db'
import { DrizzleUserRepository } from '../packages/auth/src/infrastructure/persistence/drizzle/user.repository'
import { createBunPasswordHasher } from '../packages/auth/src/infrastructure/security/bun-password-hasher'

// Only the same isolated native review database as marketing-review-stack.ts.
// No production URL, no actual person, no authentication material in stdout.
const password = (
  await readFile(path.resolve(import.meta.dir, '../.cache/pg16-native-review/password'), 'utf8')
).trim()
const connection = createDbConnection(
  `postgres://postgres:${encodeURIComponent(password)}@127.0.0.1:15440/marketing_review`,
)
const directory = path.resolve(
  import.meta.dir,
  '../packages/marketing-desktop/.cache/ui-latency-proof',
)
const file = path.join(directory, 'team.json')
const schema = z
  .array(
    z.object({
      userId: z.string().uuid(),
      email: z.string().email(),
      password: z.string().min(20),
    }),
  )
  .length(2)
try {
  const users = new DrizzleUserRepository(connection.db)
  let previous: z.infer<typeof schema> | undefined
  try {
    previous = schema.parse(JSON.parse(await readFile(file, 'utf8')))
  } catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
      throw error
  }
  const team: z.infer<typeof schema> = []
  for (let index = 0; index < 2; index++) {
    const prior = previous?.[index]
    if (prior && (await users.findById(prior.userId))) {
      team.push(prior)
      continue
    }
    const id = randomUUID(),
      secret = randomBytes(24).toString('base64url'),
      email = `team-review-${id}@example.test`
    await users.create(
      UserAggregate.register({
        id,
        email: Email.create(email),
        passwordHash: await createBunPasswordHasher().hash(secret),
        firstName: 'Revisão',
        lastName: `Colaboração ${index + 1}`,
        role: 'staff',
        passwordSet: true,
      }),
    )
    team.push({ userId: id, email, password: secret })
  }
  await mkdir(directory, { recursive: true })
  await writeFile(file, JSON.stringify(schema.parse(team)), { mode: 0o600 })
  console.log(
    'Duas identidades sintéticas prontas no banco nativo de revisão; credenciais não exibidas.',
  )
} finally {
  await connection.close()
}

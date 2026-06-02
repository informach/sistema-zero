import { eq } from 'drizzle-orm'
import { UserAggregate } from '../src/domain/user/user.aggregate'
import { isUserRole } from '../src/domain/user/user.role'
import { Email } from '../src/domain/value-objects/email'
import { loadEnv } from '../src/infrastructure/config/env'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { users } from '../src/infrastructure/persistence/drizzle/schema'
import { DrizzleUserRepository } from '../src/infrastructure/persistence/drizzle/user.repository'
import { createBunPasswordHasher } from '../src/infrastructure/security/bun-password-hasher'

/**
 * Cria/atualiza o 1º usuário administrador (idempotente por e-mail).
 * Uso: bun run db:seed --email <email> --password <senha> [--first <nome>] \
 *        [--last <sobrenome>] [--role admin|staff|superadmin|customer]
 */
function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`)
  return idx >= 0 ? process.argv[idx + 1] : undefined
}

const email = getArg('email')
const password = getArg('password')
if (!email || !password) {
  console.error(
    'Uso: bun run db:seed --email <email> --password <senha> [--first <nome>] [--last <sobrenome>] [--role admin|staff|superadmin|customer]',
  )
  process.exit(1)
}

const roleArg = getArg('role') ?? 'admin'
if (!isUserRole(roleArg)) {
  console.error(`Papel inválido: ${roleArg} (use admin|staff|superadmin|customer)`)
  process.exit(1)
}

const env = loadEnv()
const connection = createDbConnection(env.DATABASE_URL)
const hasher = createBunPasswordHasher()
const repo = new DrizzleUserRepository(connection.db)

const emailVo = Email.create(email)
const passwordHash = await hasher.hash(password)
const existing = await repo.findByEmail(emailVo.value)

if (existing) {
  await connection.db
    .update(users)
    .set({ passwordHash, role: roleArg, status: 'active', updatedAt: new Date() })
    .where(eq(users.id, existing.id))
  console.log(`✓ Usuário atualizado: ${emailVo.value} (role=${roleArg}, status=active)`)
} else {
  const user = UserAggregate.register({
    id: crypto.randomUUID(),
    email: emailVo,
    passwordHash,
    firstName: getArg('first') ?? 'Admin',
    lastName: getArg('last') ?? 'User',
    role: roleArg,
    status: 'active',
    signupSource: 'seed',
  })
  await repo.create(user)
  console.log(`✓ Usuário criado: ${emailVo.value} (role=${roleArg}, status=active)`)
}

await connection.close()

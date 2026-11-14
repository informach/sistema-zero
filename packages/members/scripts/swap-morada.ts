/** Ensaio por padrão. --confirm aplica apenas depois de revisar o relatório do ambiente. */
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { swapMorada } from '../src/infrastructure/persistence/drizzle/morada-swap'

const url = process.env.DATABASE_URL?.trim()
if (!url) throw new Error('DATABASE_URL é obrigatória')
const connection = createDbConnection(url, { max: 1 })
try {
  const report = await swapMorada(connection.sql, {
    dryRun: !process.argv.includes('--confirm'),
    now: new Date(),
  })
  console.log(JSON.stringify(report, null, 2))
} finally {
  await connection.close()
}

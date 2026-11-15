/**
 * Dá a posse das peças pagas que já estão nas casas Morada (a Morada ganhou preço depois de as
 * casas existirem). Ensaio por padrão; `--confirm` aplica. Sem moeda, sem apagar; repetir não muda.
 * Depois de aplicar, repetir o ensaio: `granted` tem de ser 0.
 */
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { grantMoradaHouses } from '../src/infrastructure/persistence/drizzle/morada-grant'

const url = process.env.DATABASE_URL?.trim()
if (!url) throw new Error('DATABASE_URL é obrigatória')
const connection = createDbConnection(url, { max: 1 })
try {
  const report = await grantMoradaHouses(connection.sql, {
    dryRun: !process.argv.includes('--confirm'),
    now: new Date(),
  })
  console.log(JSON.stringify(report, null, 2))
} finally {
  await connection.close()
}

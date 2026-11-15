/** Ensaio por padrão. --confirm aplica apenas depois de revisar o relatório do ambiente. */
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { swapMorada } from '../src/infrastructure/persistence/drizzle/morada-swap'

const url = process.env.DATABASE_URL?.trim()
if (!url) throw new Error('DATABASE_URL é obrigatória')
const connection = createDbConnection(url, { max: 1 })
try {
  if (process.argv.includes('--backup-json')) {
    if (process.argv.includes('--confirm')) throw new Error('Backup não aceita --confirm')
    const backup = await connection.sql.begin(async (tx) => {
      await tx`set transaction isolation level repeatable read, read only`
      return {
        version: 1,
        at: new Date().toISOString(),
        environment: process.env.APP_ENV,
        profiles: await tx`select * from members.gamification_profiles`,
        roomState: await tx`select * from members.room_state`,
        inventory: await tx`select * from members.room_inventory`,
        coinEvents: await tx`select * from members.coin_events`,
        houses: await tx`select * from members.morada_houses`,
      }
    })
    console.log(JSON.stringify(backup))
  } else {
    const report = await swapMorada(connection.sql, {
      dryRun: !process.argv.includes('--confirm'),
      now: new Date(),
    })
    console.log(JSON.stringify(report, null, 2))
  }
} finally {
  await connection.close()
}

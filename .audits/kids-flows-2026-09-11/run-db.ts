import { createDbConnection } from '../../packages/members/src/infrastructure/persistence/drizzle/db'

const admin = createDbConnection('postgres://postgres:postgres@localhost:5433/postgres', {
  connectTimeoutSeconds: 3,
})
const files = process.argv.slice(2)
try {
  for (const [index, file] of files.entries()) {
    const name = `sz_aulas_qa_kids_${Date.now()}_${index}`
    if (!/^sz_aulas_qa_kids_\d+_\d+$/.test(name)) throw new Error('Invalid disposable database')
    await admin.sql.unsafe(`CREATE DATABASE ${name}`)
    const test = Bun.spawn(['bun', 'test', '--timeout', '30000', file], {
      cwd: 'packages/members',
      env: {
        ...process.env,
        LEARNING_QA_DATABASE_URL: `postgres://postgres:postgres@localhost:5433/${name}`,
        TEST_DATABASE_URL: `postgres://postgres:postgres@localhost:5433/${name}`,
      },
      stdout: 'inherit',
      stderr: 'inherit',
    })
    const code = await test.exited
    if (code !== 0) {
      console.error(`Banco descartável preservado para diagnóstico: ${name}`)
      process.exitCode = code
      break
    }
    await admin.sql.unsafe(`DROP DATABASE ${name}`)
  }
} finally {
  await admin.close()
}

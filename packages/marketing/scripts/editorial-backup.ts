import path from 'node:path'
import { z } from 'zod'
import {
  createEditorialArchive,
  restoreEditorialAssets,
  verifyEditorialArchive,
} from '../src/infrastructure/backup/editorial-archive'
import {
  assertEmptyRestoreTarget,
  quarantineRestoredWork,
} from '../src/infrastructure/backup/postgres-archive'
import { R2MediaStore } from '../src/infrastructure/gateways/r2/r2-media-store'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'

const [action, selected] = process.argv.slice(2)
if (!selected || !['create', 'verify', 'restore-assets', 'restore-database'].includes(action ?? ''))
  throw new Error(
    'Uso: bun run scripts/editorial-backup.ts create|verify|restore-assets|restore-database <diretório>',
  )
const directory = path.resolve(selected),
  signal = AbortSignal.timeout(6 * 60 * 60 * 1000)
function store() {
  const env = z
    .object({
      R2_ACCOUNT_ID: z.string().min(1),
      R2_ACCESS_KEY_ID: z.string().min(1),
      R2_SECRET_ACCESS_KEY: z.string().min(1),
      R2_MARKETING_BUCKET: z.string().min(1),
    })
    .parse(process.env)
  return new R2MediaStore({
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucket: env.R2_MARKETING_BUCKET,
  })
}
async function pgTool(binary: string, url: URL, args: string[]) {
  const child = Bun.spawn([binary, ...args], {
    stdout: 'ignore',
    stderr: 'pipe',
    signal,
    env: {
      ...process.env,
      PGHOST: url.hostname,
      PGPORT: url.port || '5432',
      PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
      PGUSER: decodeURIComponent(url.username),
      PGPASSWORD: decodeURIComponent(url.password),
      PGSSLMODE:
        url.searchParams.get('sslmode') ??
        (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ? 'disable' : 'require'),
    },
  })
  let message = ''
  for await (const chunk of child.stderr)
    message = (message + Buffer.from(chunk).toString()).slice(-4000)
  if ((await child.exited) !== 0) throw new Error(`A ferramenta PostgreSQL falhou: ${message}`)
}
if (action === 'verify') {
  const manifest = await verifyEditorialArchive(directory, signal)
  console.log(JSON.stringify({ verified: true, assets: manifest.assets }))
} else if (action === 'restore-assets') {
  const result = await restoreEditorialAssets(directory, store(), signal)
  console.log(JSON.stringify({ restored: result.restored, preserved: result.preserved }))
} else {
  // Separate variable prevents an accidental restore into the application's DATABASE_URL.
  const raw = z
    .string()
    .url()
    .parse(
      action === 'create'
        ? process.env.MARKETING_BACKUP_DATABASE_URL
        : process.env.MARKETING_RESTORE_DATABASE_URL,
    )
  const url = new URL(raw)
  if (!['postgres:', 'postgresql:'].includes(url.protocol))
    throw new Error('Endereço PostgreSQL obrigatório')
  const connection = createDbConnection(raw, {
    max: 2,
    ssl:
      url.searchParams.get('sslmode') !== 'disable' &&
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname),
    idleInTransactionTimeoutMs: 600000,
  })
  try {
    if (action === 'create') {
      const manifest = await createEditorialArchive({
        connection,
        directory,
        store: store(),
        signal,
        dump: (snapshot, selection, destination) =>
          pgTool(process.env.PG_DUMP_PATH ?? 'pg_dump', url, [
            '--format=custom',
            '--no-owner',
            '--no-privileges',
            ...(selection === 'marketing'
              ? ['--schema=marketing']
              : ['--table=drizzle.marketing_migrations']),
            `--snapshot=${snapshot}`,
            `--file=${destination}`,
          ]),
      })
      console.log(
        JSON.stringify({ complete: true, assets: manifest.assets, scope: manifest.scope }),
      )
    } else {
      if (process.env.MARKETING_RESTORE_NEW_INSTANCE !== 'true')
        throw new Error(
          'Restaure somente em uma instância isolada com nova origem; defina MARKETING_RESTORE_NEW_INSTANCE=true após preparar o destino offline',
        )
      await verifyEditorialArchive(directory, signal)
      await assertEmptyRestoreTarget(connection)
      for (const name of ['marketing.dump', 'journal.dump'])
        await pgTool(process.env.PG_RESTORE_PATH ?? 'pg_restore', url, [
          '--dbname',
          decodeURIComponent(url.pathname.slice(1)),
          '--exit-on-error',
          '--single-transaction',
          '--no-owner',
          '--no-privileges',
          path.join(directory, name),
        ])
      await quarantineRestoredWork(connection)
      console.log(
        JSON.stringify({
          restored: true,
          externalActionsHeld: true,
          mediaMustBeRestoredBeforeStartup: true,
        }),
      )
    }
  } finally {
    await connection.close()
  }
}

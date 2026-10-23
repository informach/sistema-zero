#!/usr/bin/env -S bun --no-env-file
import './preflight.mjs'
import { spawnSync } from 'node:child_process'
/**
 * Provisiona a pilha local do Studio do zero (idempotente; reexecutar só completa o que falta):
 *
 *  1. Segredos locais novos em .cache/local-stack/secrets.json.
 *  2. Postgres portátil: baixa o zip oficial da EDB, confere o SHA-256 fixado em lib.ts,
 *     extrai em .cache/tools/postgresql-<versão>, faz initdb em .cache/local-stack/pg
 *     (scram-sha-256, só 127.0.0.1:55432) e cria o banco `sistemazero`. Sem serviço do Windows.
 *  3. Migrations de auth, catalog e members (migrate.ts) e o seed canônico do catálogo.
 *  4. Studio Python local (python-local.ts), previamente validado; --without-python o omite.
 *  5. Sobe a pilha (up.ts), publica a jornada Kids inicial pelo bootstrap canônico do Members,
 *     cria as contas de QA (accounts.ts), publica o currículo mínimo e leva o cliente adulto e a
 *     criança ao Estúdio livre pelo progresso real (curriculum.ts, kids-first-course.mjs).
 *
 *   bun --no-env-file scripts/local-studio-stack/setup.ts [--no-start] [--without-python]
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { join } from 'node:path'
import {
  bunArgs,
  CACHE,
  childEnv,
  databaseUrl,
  ensureSecrets,
  exe,
  PG_DATA,
  PG_DB,
  PG_HOME,
  PG_PORT,
  PG_VERSION,
  PG_ZIP_SHA256,
  PG_ZIP_URL,
  pgEnv,
  probePort,
  ROOT,
  run,
  STACK_DIR,
  serviceEnv,
  startPostgresServer,
} from './lib'
import { option, readLocalPythonInput } from './python-input'

const here = (name: string) => join(import.meta.dir, name)
const pythonInput = process.argv.includes('--without-python')
  ? undefined
  : await readLocalPythonInput({
      planFile: option('--plan'),
      distribution: option('--distribution') ?? process.env.STUDIO_PYTHON_DISTRIBUTION,
    })
const secrets = ensureSecrets()

async function provisionPostgresBinaries() {
  if (fs.existsSync(exe('postgres'))) return
  const downloads = join(CACHE, 'downloads', `postgresql-${PG_VERSION}`)
  fs.mkdirSync(downloads, { recursive: true })
  const zip = join(downloads, `postgresql-${PG_VERSION}-1-windows-x64-binaries.zip`)
  if (!fs.existsSync(zip)) {
    console.log(`↓ ${PG_ZIP_URL}`)
    run('curl', ['-fsSL', '--proto', '=https', '-o', zip, PG_ZIP_URL])
  }
  const digest = createHash('sha256').update(fs.readFileSync(zip)).digest('hex')
  if (digest !== PG_ZIP_SHA256) {
    fs.rmSync(zip)
    throw new Error(`SHA-256 do Postgres não confere (${digest}); download descartado`)
  }
  console.log(`✓ SHA-256 do zip confere (${digest})`)
  const extract = join(CACHE, 'tools', `pg-extract-${process.pid}`)
  fs.mkdirSync(extract, { recursive: true })
  run('unzip', [
    '-q',
    zip,
    '-x',
    'pgsql/pgAdmin 4/*',
    'pgsql/StackBuilder/*',
    'pgsql/doc/*',
    '-d',
    extract,
  ])
  fs.renameSync(join(extract, 'pgsql'), PG_HOME)
  fs.rmSync(extract, { recursive: true, force: true })
}

function initDataDir() {
  if (fs.existsSync(join(PG_DATA, 'PG_VERSION'))) return
  const pwfile = join(STACK_DIR, `.pw-${process.pid}`)
  fs.writeFileSync(pwfile, secrets.PG_PASSWORD, { mode: 0o600 })
  try {
    run(exe('initdb'), [
      '-D',
      PG_DATA,
      '-U',
      'postgres',
      '--auth-local=scram-sha-256',
      '--auth-host=scram-sha-256',
      `--pwfile=${pwfile}`,
      '-E',
      'UTF8',
      '--locale=C',
    ])
  } finally {
    fs.rmSync(pwfile, { force: true })
  }
  fs.appendFileSync(
    join(PG_DATA, 'postgresql.conf'),
    `\n# --- local-studio-stack ---\nlisten_addresses = '127.0.0.1'\nport = ${PG_PORT}\nmax_connections = 200\nshared_buffers = 128MB\n`,
  )
}

async function startPostgresAndDb() {
  if (!(await probePort(PG_PORT))) {
    startPostgresServer(secrets)
  }
  const exists = spawnSync(
    exe('psql'),
    ['-d', 'postgres', '-tAc', `select 1 from pg_database where datname='${PG_DB}'`],
    {
      env: pgEnv(secrets),
      encoding: 'utf8',
    },
  )
  if (exists.stdout.trim() !== '1')
    run(exe('psql'), ['-d', 'postgres', '-c', `create database ${PG_DB}`], { env: pgEnv(secrets) })
}

function migrateAndSeed() {
  for (const pkg of ['auth', 'catalog', 'members', 'hub']) {
    run(process.execPath, [here('migrate.ts'), pkg], {
      env: childEnv({ DATABASE_URL: databaseUrl(secrets) }),
    })
  }
  // Servidores da comunidade (Clube e Mural dos Criadores), idempotente por slug.
  run(process.execPath, ['run', 'scripts/seed-community-spaces.ts', 'apply'], {
    cwd: join(ROOT, 'packages', 'hub'),
    env: childEnv(serviceEnv('hub', secrets)),
  })
  // Seed canônico do catálogo (idempotente por sku/slug): produtos e ofertas Kids e Adulto.
  run(process.execPath, ['run', 'scripts/seed.ts', 'apply'], {
    cwd: join(ROOT, 'packages', 'catalog'),
    env: childEnv(serviceEnv('catalog', secrets)),
  })
}

function bootstrapKidsJourney() {
  const membersScript = (...args: string[]) => {
    const r = spawnSync(
      process.execPath,
      bunArgs([
        here('members-script.ts'),
        'bootstrap-kids-journey.ts',
        ...args,
        '--confirm-rollout-order',
      ]),
      {
        cwd: ROOT,
        env: childEnv({}),
        encoding: 'utf8',
      },
    )
    if (r.status !== 0)
      throw new Error(`bootstrap-kids-journey ${args[0]}: ${r.stderr || r.stdout}`)
    const lines = r.stdout.trim().split('\n')
    return JSON.parse(lines[lines.length - 1])
  }
  const init = membersScript('initialize')
  if (init.status === 'already-published') {
    console.log('✓ jornada Kids já publicada')
    return
  }
  membersScript('advance', '--preparation', init.preparationId, '--steps', '20')
  const published = membersScript('publish', '--preparation', init.preparationId)
  console.log(`✓ jornada Kids publicada (versão ${published.version})`)
}

await provisionPostgresBinaries()
initDataDir()
await startPostgresAndDb()
migrateAndSeed()
if (pythonInput) {
  run(
    process.execPath,
    [
      here('python-local.ts'),
      '--plan',
      pythonInput.planFile,
      '--distribution',
      pythonInput.distribution,
    ],
    {
      env: childEnv({ WRANGLER_SEND_METRICS: 'false' }),
    },
  )
}

if (!process.argv.includes('--no-start')) {
  run(process.execPath, [here('up.ts')])
  bootstrapKidsJourney()
  run(process.execPath, [here('accounts.ts')])
  // Currículo mínimo pelas rotas do Admin + progresso real do cliente adulto e da criança.
  run(process.execPath, [here('curriculum.ts'), 'all'])
  run('node', [here('kids-first-course.mjs')])
}
console.log(
  '\n✓ setup concluído. Verificar: bun --no-env-file scripts/local-studio-stack/verify.ts',
)

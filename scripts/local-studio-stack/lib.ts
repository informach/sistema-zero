/**
 * Base comum da pilha LOCAL do Studio (Auth, Catalog, Members, Gateway, Admin, Adulto e
 * Kids sobre um Postgres portátil). Tudo o que é gerado — binários, dados, segredos,
 * logs, estado — fica em `.cache/` (ignorado pelo git). Nada aqui fala com ambiente
 * hospedado: todas as URLs são loopback.
 */
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import net from 'node:net'
import { join } from 'node:path'

export const ROOT = join(import.meta.dir, '..', '..')
export const CACHE = join(ROOT, '.cache')
export const STACK_DIR = join(CACHE, 'local-stack')
export const LOG_DIR = join(STACK_DIR, 'logs')
export const STATE_FILE = join(STACK_DIR, 'state.json')
export const SECRETS_FILE = join(STACK_DIR, 'secrets.json')
export const CREDENTIALS_FILE = join(STACK_DIR, 'credentials.json')

// Postgres portátil (binários oficiais da EDB). O SHA-256 foi medido no download
// HTTPS de get.enterprisedb.com em 21/10/2026 (a EDB não publica checksum nem assina
// os .exe — ver README). Trocar a versão exige medir e fixar o novo hash aqui.
export const PG_VERSION = '16.15'
export const PG_ZIP_URL = `https://get.enterprisedb.com/postgresql/postgresql-${PG_VERSION}-1-windows-x64-binaries.zip`
export const PG_ZIP_SHA256 = '25e6fcdfb8caec38691bf461125e7564508760666f7b8e5dc6a5f0818f58f81e'
export const PG_HOME = join(CACHE, 'tools', `postgresql-${PG_VERSION}`)
export const PG_BIN = join(PG_HOME, 'bin')
export const PG_DATA = join(STACK_DIR, 'pg')
export const PG_HOST = '127.0.0.1'
export const PG_PORT = 55432
export const PG_DB = 'sistemazero'

export const exe = (name: string) =>
  join(PG_BIN, process.platform === 'win32' ? `${name}.exe` : name)

export type ServiceName =
  | 'auth'
  | 'catalog'
  | 'members'
  | 'gateway'
  | 'admin'
  | 'community'
  | 'kids'
  | 'studio-runtime'

export type ServiceDef = {
  name: ServiceName
  dir: string
  port: number
  /** Comando a partir da pasta do pacote. */
  args: string[]
  /** Caminho HTTP que responde 2xx quando o serviço está pronto. */
  health: string
  kind: 'api' | 'next'
  /** Executável (default: o bun atual). */
  cmd?: string
  /** Só sobe quando o arquivo existe (ex.: config gerada por python-local.ts). */
  requires?: string
}

const nextArgs = (port: number) => ['run', 'dev', '--', '-H', '127.0.0.1', '-p', String(port)]

// Portas canônicas de scripts/dev.ts. Payments, messaging, fiscal, funnel, hub etc.
// ficam DESLIGADOS: as rotas do gateway para eles respondem 502/503 localmente.
export const SERVICES: ServiceDef[] = [
  {
    name: 'auth',
    dir: 'auth',
    port: 3002,
    args: ['run', 'src/index.ts'],
    health: '/readyz',
    kind: 'api',
  },
  {
    name: 'catalog',
    dir: 'catalog',
    port: 3003,
    args: ['run', 'src/index.ts'],
    health: '/readyz',
    kind: 'api',
  },
  {
    name: 'members',
    dir: 'members',
    port: 3004,
    args: ['run', 'src/index.ts'],
    health: '/readyz',
    kind: 'api',
  },
  {
    name: 'gateway',
    dir: 'api-gateway',
    port: 3000,
    args: ['run', 'src/index.ts'],
    health: '/health',
    kind: 'api',
  },
  // Worker do Studio (Python no navegador) em `wrangler dev --local`, sem contêiner.
  // Config e R2 local gerados por python-local.ts.
  {
    name: 'studio-runtime',
    dir: 'studio-runtime',
    port: 8791,
    cmd: join(
      ROOT,
      'packages/studio-runtime/node_modules/.bin',
      process.platform === 'win32' ? 'wrangler.exe' : 'wrangler',
    ),
    args: [
      'dev',
      '-c',
      join(STACK_DIR, 'studio-runtime', 'wrangler.jsonc'),
      '--local',
      '--persist-to',
      join(STACK_DIR, 'wrangler'),
      '--ip',
      '127.0.0.1',
      '--port',
      '8791',
      '--inspector-port',
      '9231',
      '--show-interactive-dev-session=false',
    ],
    health:
      '/v1/runtimes/0000000000000000000000000000000000000000000000000000000000000000/frame.html',
    kind: 'api',
    requires: join(STACK_DIR, 'studio-runtime', 'wrangler.jsonc'),
  },
  { name: 'admin', dir: 'admin', port: 3005, args: nextArgs(3005), health: '/', kind: 'next' },
  {
    name: 'community',
    dir: 'community',
    port: 3007,
    args: nextArgs(3007),
    health: '/',
    kind: 'next',
  },
  {
    name: 'kids',
    dir: 'community-kids',
    port: 3008,
    args: nextArgs(3008),
    health: '/',
    kind: 'next',
  },
]

export const url = (port: number) => `http://localhost:${port}`

// ---------------------------------------------------------------------------- secrets
export type Secrets = Record<string, string>

const SECRET_NAMES = [
  'PG_PASSWORD',
  'JWT_HS256_SECRET',
  'GATEWAY_HMAC_SECRET',
  'AUTH_INTERNAL_TOKEN',
  'MEMBERS_INTERNAL_TOKEN',
  'CATALOG_INTERNAL_TOKEN',
  'MEMBERS_PROFILE_ADMISSION_TOKEN',
  'MEMBER_SHELL_HMAC_SECRET',
  'PARENT_GATE_HMAC_SECRET',
  'METRICS_TOKEN',
  'FUNNEL_HMAC_SECRET',
  'FUNNEL_INTERNAL_TOKEN',
  'STUDIO_PRO_RUNTIME_TOKEN',
  'STUDIO_PYTHON_RUNTIME_TOKEN',
  'STUDIO_PYTHON_LANGUAGE_TOKEN',
  'STUDIO_BUILDER_EXECUTOR_SECRET',
] as const

/** Lê os segredos locais; gera os que faltam (hex aleatório de 48 chars). */
export function ensureSecrets(): Secrets {
  fs.mkdirSync(STACK_DIR, { recursive: true })
  let secrets: Secrets = {}
  try {
    secrets = JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf8'))
  } catch {
    /* primeira execução */
  }
  let changed = false
  for (const name of SECRET_NAMES) {
    if (!secrets[name]) {
      secrets[name] = randomBytes(24).toString('hex')
      changed = true
    }
  }
  if (changed)
    fs.writeFileSync(SECRETS_FILE, `${JSON.stringify(secrets, null, 2)}\n`, { mode: 0o600 })
  return secrets
}

export function readSecrets(): Secrets {
  if (!fs.existsSync(SECRETS_FILE))
    throw new Error('Rode antes: bun scripts/local-studio-stack/setup.ts')
  return JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf8'))
}

export const databaseUrl = (s: Secrets) =>
  `postgres://postgres:${s.PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${PG_DB}`

// ---------------------------------------------------------------------------- env por serviço
/** Configuração opcional do runtime do Studio (gerada por studio-runtime.ts). */
export const STUDIO_ENV_FILE = join(STACK_DIR, 'studio-env.json')
export function readStudioEnv(): Record<string, Record<string, string>> {
  try {
    return JSON.parse(fs.readFileSync(STUDIO_ENV_FILE, 'utf8'))
  } catch {
    return {}
  }
}

const JWT = { JWT_ISSUER: 'sistemazero-auth', JWT_AUDIENCE: 'sistemazero' }

/**
 * Env explícita de cada serviço (nenhum `.env` é escrito nos pacotes). Os serviços
 * rodam com NODE_ENV=development; os apps Next escolhem o NODE_ENV sozinhos.
 */
export function serviceEnv(name: ServiceName, s: Secrets): Record<string, string> {
  const db = databaseUrl(s)
  const studio = readStudioEnv()[name] ?? {}
  const apps = {
    GATEWAY_URL: url(3000),
    JWT_HS256_SECRET: s.JWT_HS256_SECRET,
    ...JWT,
    MEMBER_SHELL_HMAC_SECRET: s.MEMBER_SHELL_HMAC_SECRET,
    COMMUNITY_URL: url(3007),
    KIDS_COMMUNITY_URL: url(3008),
    NEXT_TELEMETRY_DISABLED: '1',
  }
  const byService: Record<ServiceName, Record<string, string>> = {
    auth: {
      NODE_ENV: 'development',
      PORT: '3002',
      HOST: '127.0.0.1',
      DATABASE_URL: db,
      JWT_ALG: 'HS256',
      JWT_HS256_SECRET: s.JWT_HS256_SECRET,
      ...JWT,
      COMMUNITY_URL: url(3007),
      KIDS_COMMUNITY_URL: url(3008),
      AUTH_INTERNAL_TOKEN: s.AUTH_INTERNAL_TOKEN,
      MEMBERS_BASE_URL: url(3004),
      MEMBERS_INTERNAL_TOKEN: s.MEMBERS_INTERNAL_TOKEN,
      MEMBERS_PROFILE_ADMISSION_TOKEN: s.MEMBERS_PROFILE_ADMISSION_TOKEN,
      // Sem GATEWAY_URL + AUTH_HMAC_SECRET o envio de e-mail é no-op (messaging desligado).
      PROFILE_ADULT_NOTICE_INTERVAL_MS: '0',
    },
    catalog: {
      NODE_ENV: 'development',
      PORT: '3003',
      HOST: '127.0.0.1',
      DATABASE_URL: db,
      REQUIRE_ADMIN: 'true',
      INTERNAL_API_TOKEN: s.CATALOG_INTERNAL_TOKEN,
    },
    members: {
      NODE_ENV: 'development',
      PORT: '3004',
      HOST: '127.0.0.1',
      DATABASE_URL: db,
      CATALOG_BASE_URL: url(3003),
      CATALOG_INTERNAL_TOKEN: s.CATALOG_INTERNAL_TOKEN,
      GATEWAY_HMAC_SECRET: s.GATEWAY_HMAC_SECRET,
      INTERNAL_API_TOKEN: s.MEMBERS_INTERNAL_TOKEN,
      MEMBERS_PROFILE_ADMISSION_TOKEN: s.MEMBERS_PROFILE_ADMISSION_TOKEN,
      REQUIRE_ADMIN: 'true',
      KIDS_COMMUNITY_URL: url(3008),
      // S2S direto ao Auth (coorte de perfis da jornada Kids). Sem GATEWAY_URL +
      // MEMBERS_HMAC_SECRET os jobs de e-mail (report dos pais/renovação) ficam no-op.
      AUTH_BASE_URL: url(3002),
      AUTH_INTERNAL_TOKEN: s.AUTH_INTERNAL_TOKEN,
      ...studio,
    },
    gateway: {
      NODE_ENV: 'development',
      PORT: '3000',
      LOG_LEVEL: 'info',
      STATE_BACKEND: 'memory',
      GATEWAY_CONFIG_PATH: './gateway.config.ts',
      TRUST_PROXY: 'false',
      MAX_REQUEST_BODY_BYTES: '3004096',
      METRICS_TOKEN: s.METRICS_TOKEN,
      JWT_HS256_SECRET: s.JWT_HS256_SECRET,
      ...JWT,
      GATEWAY_CONSUMER_ID: 'gateway',
      GATEWAY_HMAC_SECRET: s.GATEWAY_HMAC_SECRET,
      AUTH_URL: url(3002),
      AUTH_INTERNAL_TOKEN: s.AUTH_INTERNAL_TOKEN,
      CATALOG_URL: url(3003),
      CATALOG_INTERNAL_TOKEN: s.CATALOG_INTERNAL_TOKEN,
      MEMBERS_URL: url(3004),
      MEMBERS_INTERNAL_TOKEN: s.MEMBERS_INTERNAL_TOKEN,
      MEMBER_SHELL_HMAC_SECRET: s.MEMBER_SHELL_HMAC_SECRET,
      // Desligados localmente (porta fechada → 502/503 nas rotas deles).
      PAYMENTS_URL: url(3001),
      MESSAGING_URL: url(3006),
      FISCAL_URL: url(3009),
      FUNNEL_URL: url(4321),
      // Consumer `funnel` é incondicional no gateway.config.ts; o funil não roda aqui.
      FUNNEL_HMAC_SECRET: s.FUNNEL_HMAC_SECRET,
      FUNNEL_INTERNAL_TOKEN: s.FUNNEL_INTERNAL_TOKEN,
      HUB_URL: url(3010),
      MARKETING_URL: url(3011),
      REFERRALS_URL: url(3012),
      HELPDESK_URL: url(3013),
    },
    admin: { ...apps, ...studio },
    community: { ...apps, ...studio },
    'studio-runtime': {
      WRANGLER_SEND_METRICS: 'false',
      CLOUDFLARE_ACCOUNT_ID: '',
      NO_UPDATE_NOTIFIER: '1',
    },
    kids: {
      ...apps,
      PARENT_GATE_HMAC_SECRET: s.PARENT_GATE_HMAC_SECRET,
      KIDS_REFORM_NOTICE_ENABLED: 'false',
      ...studio,
    },
  }
  return byService[name]
}

/** Env herdada mínima (PATH, perfis do Windows) + a env do serviço; nada de .env. */
export function childEnv(extra: Record<string, string>): Record<string, string> {
  const keep = [
    'PATH',
    'Path',
    'SystemRoot',
    'SYSTEMROOT',
    'windir',
    'TEMP',
    'TMP',
    'USERPROFILE',
    'HOME',
    'APPDATA',
    'LOCALAPPDATA',
    'ProgramData',
    'ProgramFiles',
    'ProgramFiles(x86)',
    'COMSPEC',
    'ComSpec',
    'PATHEXT',
    'NUMBER_OF_PROCESSORS',
    'PROCESSOR_ARCHITECTURE',
    'OS',
    'HOMEDRIVE',
    'HOMEPATH',
    'USERNAME',
    'COMPUTERNAME',
  ]
  const env: Record<string, string> = {}
  for (const k of keep) if (process.env[k] !== undefined) env[k] = process.env[k] as string
  return { ...env, ...extra }
}

// ---------------------------------------------------------------------------- processos
export type StateRecord = { pid: number; port: number; logFile: string; startedAt: string }
export type State = {
  postgres?: { port: number; dataDir: string }
  services: Record<string, StateRecord>
}

export function readState(): State {
  try {
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
    return parsed?.services ? parsed : { services: {} }
  } catch {
    return { services: {} }
  }
}

export function writeState(state: State): void {
  fs.mkdirSync(STACK_DIR, { recursive: true })
  fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`)
}

export function isAlive(pid: number | undefined): boolean {
  if (!pid) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM'
  }
}

export function killTree(pid: number): void {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' })
  } else {
    try {
      process.kill(-pid, 'SIGTERM')
    } catch {
      try {
        process.kill(pid, 'SIGTERM')
      } catch {
        /* já morto */
      }
    }
  }
}

export function probePort(port: number, host = '127.0.0.1', timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port })
    let done = false
    const finish = (v: boolean) => {
      if (done) return
      done = true
      socket.destroy()
      resolve(v)
    }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
  })
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function run(
  cmd: string,
  args: string[],
  opts: { cwd?: string; env?: Record<string, string> } = {},
) {
  const r = spawnSync(cmd, args, {
    cwd: opts.cwd ?? ROOT,
    env: opts.env ?? childEnv({}),
    stdio: 'inherit',
  })
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} falhou (status ${r.status})`)
}

export function pgEnv(s: Secrets): Record<string, string> {
  return childEnv({
    PGPASSWORD: s.PG_PASSWORD,
    PGHOST: PG_HOST,
    PGPORT: String(PG_PORT),
    PGUSER: 'postgres',
  })
}

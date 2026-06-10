#!/usr/bin/env bun
/**
 * Orquestrador de desenvolvimento — sobe/para/reinicia TODOS os serviços de uma vez.
 *
 * Só para ambiente local. Roda cada serviço em background (detached), gravando logs
 * em logs/<serviço>.log e os PIDs em logs/dev-manager.json. Parada confiável matando a
 * árvore de processos (no Windows via `taskkill /T`, pois `bun --watch` cria subprocessos).
 *
 * Uso (via package.json):
 *   bun run dev:up        [serviços...]   sobe tudo (ou só os listados) em background
 *   bun run dev:down      [serviços...]   para tudo (ou só os listados)
 *   bun run dev:restart   [serviços...]   reinicia tudo (ou só os listados)
 *   bun run dev:status                    mostra o que está de pé
 *   bun run dev:logs      <serviço> [--once]   acompanha o log de um serviço
 *
 * Serviços válidos: gateway, payments, auth, catalog, members, messaging, funnel, admin,
 * community, kids
 */

import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const LOG_DIR = join(ROOT, 'logs')
const STATE_FILE = join(LOG_DIR, 'dev-manager.json')

type ServiceDef = { name: string; dir: string; script: string; port: number }

// Mapa fixo: espelha os scripts de raiz do package.json e a porta-padrão de cada serviço.
// `core` (lib) e `tui` (CLI interativo) ficam de fora — não são servidores de background.
const SERVICES: ServiceDef[] = [
  { name: 'gateway', dir: 'api-gateway', script: 'dev:gateway', port: 3000 },
  { name: 'payments', dir: 'payments', script: 'dev:payments', port: 3001 },
  { name: 'auth', dir: 'auth', script: 'dev:auth', port: 3002 },
  { name: 'catalog', dir: 'catalog', script: 'dev:catalog', port: 3003 },
  { name: 'members', dir: 'members', script: 'dev:members', port: 3004 },
  // Mensageria: e-mail (SendGrid) + WhatsApp (Evolution) com templates.
  { name: 'messaging', dir: 'messaging', script: 'dev:messaging', port: 3006 },
  { name: 'funnel', dir: 'funnel', script: 'dev:funnel', port: 4321 },
  // Painel admin (Next.js). Não usa banco próprio — é um BFF que chama o gateway.
  { name: 'admin', dir: 'admin', script: 'dev:admin', port: 3005 },
  // Área do aluno (Next.js). Também é só um BFF que chama o gateway (sem banco próprio).
  { name: 'community', dir: 'community', script: 'dev:community', port: 3007 },
  // Plataforma kids (Next.js) — mesmo padrão BFF do community, vitrine kids do members.
  { name: 'kids', dir: 'community-kids', script: 'dev:kids', port: 3008 },
]

type StateRecord = { pid: number; startedAt: string; port: number; logFile: string }
type State = { services: Record<string, StateRecord> }

// ---------------------------------------------------------------------------- output
const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR
const c = useColor
  ? {
      reset: '\x1b[0m',
      bold: '\x1b[1m',
      dim: '\x1b[2m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
    }
  : { reset: '', bold: '', dim: '', red: '', green: '', yellow: '' }

const log = (msg = '') => console.log(msg)
const err = (msg: string) => console.error(`${c.red}erro:${c.reset} ${msg}`)
const rel = (p: string) => relative(ROOT, p) || p
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ---------------------------------------------------------------------------- state
function readState(): State {
  try {
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
    return parsed?.services ? parsed : { services: {} }
  } catch {
    return { services: {} }
  }
}

function writeState(state: State): void {
  fs.mkdirSync(LOG_DIR, { recursive: true })
  fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`)
}

// ---------------------------------------------------------------------------- process helpers
function isAlive(pid: number | undefined): boolean {
  if (!pid) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    // EPERM = existe mas sem permissão de sinalizar (ainda vivo); ESRCH = não existe.
    return (e as NodeJS.ErrnoException).code === 'EPERM'
  }
}

function killTree(pid: number): void {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' })
  } else {
    // Spawnado com detached:true → é líder de grupo; mata o grupo inteiro.
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

function probePort(port: number, host = '127.0.0.1', timeoutMs = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port })
    let done = false
    const finish = (value: boolean) => {
      if (done) return
      done = true
      socket.destroy()
      resolve(value)
    }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
  })
}

async function waitPortFree(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!(await probePort(port, '127.0.0.1', 400))) return
    await sleep(250)
  }
}

// ---------------------------------------------------------------------------- preflight
function resolveDb(): { host: string; port: number } {
  for (const s of SERVICES) {
    const envPath = join(ROOT, 'packages', s.dir, '.env')
    if (!fs.existsSync(envPath)) continue
    const m = fs.readFileSync(envPath, 'utf8').match(/^\s*DATABASE_URL\s*=\s*(.+)$/m)
    if (!m) continue
    const val = m[1].trim().replace(/^["']|["']$/g, '')
    try {
      const u = new URL(val)
      return { host: u.hostname || '127.0.0.1', port: Number(u.port) || 5432 }
    } catch {
      /* URL inválida — tenta o próximo */
    }
  }
  return { host: '127.0.0.1', port: 5433 } // padrão do README (Postgres em :5433)
}

async function preflight(): Promise<void> {
  const db = resolveDb()
  if (await probePort(db.port, db.host, 1000)) {
    log(`${c.green}✓${c.reset} Postgres respondendo em ${db.host}:${db.port}`)
  } else {
    log(
      `${c.yellow}⚠${c.reset}  Postgres NÃO respondeu em ${db.host}:${db.port} — serviços com banco vão falhar no boot`,
    )
  }
  const missing = SERVICES.filter((s) => !fs.existsSync(join(ROOT, 'packages', s.dir, '.env'))).map(
    (s) => s.dir,
  )
  if (missing.length) {
    log(`${c.yellow}⚠${c.reset}  .env ausente em: ${missing.join(', ')}`)
  } else {
    log(`${c.green}✓${c.reset} .env presente em todos os pacotes`)
  }
}

// ---------------------------------------------------------------------------- targets
function resolveTargets(args: string[]): ServiceDef[] {
  const names = args.filter((a) => !a.startsWith('-'))
  if (names.length === 0) return SERVICES
  const unknown = names.filter((n) => !SERVICES.some((s) => s.name === n))
  if (unknown.length) {
    err(
      `serviço(s) desconhecido(s): ${unknown.join(', ')}. Válidos: ${SERVICES.map((s) => s.name).join(', ')}`,
    )
    process.exit(1)
  }
  return SERVICES.filter((s) => names.includes(s.name))
}

// ---------------------------------------------------------------------------- commands
async function up(args: string[]): Promise<void> {
  fs.mkdirSync(LOG_DIR, { recursive: true })
  const targets = resolveTargets(args)

  log(`${c.bold}Preflight${c.reset}`)
  await preflight()
  log('')

  const state = readState()
  const started: ServiceDef[] = []

  for (const s of targets) {
    const rec = state.services[s.name]
    if (rec && isAlive(rec.pid)) {
      log(`${c.dim}• ${s.name} já rodando (pid ${rec.pid})${c.reset}`)
      continue
    }
    if (await probePort(s.port)) {
      log(
        `${c.yellow}• ${s.name}: porta :${s.port} já em uso (processo não gerenciado) — pulando${c.reset}`,
      )
      continue
    }

    const logFile = join(LOG_DIR, `${s.name}.log`)
    const fd = fs.openSync(logFile, 'w')
    const child = spawn(process.execPath, ['run', s.script], {
      cwd: ROOT,
      detached: true,
      windowsHide: true,
      stdio: ['ignore', fd, fd],
    })
    child.on('error', (e) => err(`falha ao iniciar ${s.name}: ${e.message}`))
    fs.closeSync(fd)

    if (!child.pid) {
      log(`${c.red}✗${c.reset} ${s.name}: não obteve PID (spawn falhou)`)
      continue
    }
    child.unref()
    state.services[s.name] = {
      pid: child.pid,
      startedAt: new Date().toISOString(),
      port: s.port,
      logFile,
    }
    started.push(s)
    log(`${c.green}▶${c.reset} ${s.name} iniciado (pid ${child.pid}) → ${rel(logFile)}`)
  }

  writeState(state)

  if (started.length === 0) {
    log('\nNada novo para subir.')
    return
  }

  log(`\n${c.bold}Aguardando readiness...${c.reset}`)
  const ready = await waitReady(started, 20_000)
  log('')
  for (const s of started) {
    if (ready.has(s.name)) {
      log(`${c.green}✓${c.reset} ${s.name.padEnd(9)} :${s.port}`)
    } else {
      log(
        `${c.yellow}…${c.reset} ${s.name.padEnd(9)} :${s.port} (ainda subindo — veja ${rel(join(LOG_DIR, `${s.name}.log`))})`,
      )
    }
  }
  log(
    `\n${c.dim}Use 'bun run dev:status' para ver tudo, 'bun run dev:logs <serviço>' para acompanhar.${c.reset}`,
  )
}

async function waitReady(services: ServiceDef[], timeoutMs: number): Promise<Set<string>> {
  const deadline = Date.now() + timeoutMs
  const ready = new Set<string>()
  while (ready.size < services.length && Date.now() < deadline) {
    for (const s of services) {
      if (ready.has(s.name)) continue
      if (await probePort(s.port)) ready.add(s.name)
    }
    if (ready.size < services.length) await sleep(500)
  }
  return ready
}

async function down(args: string[]): Promise<void> {
  const targets = resolveTargets(args)
  const state = readState()
  let any = false
  for (const s of targets) {
    const rec = state.services[s.name]
    if (!rec) {
      log(`${c.dim}• ${s.name} não estava registrado${c.reset}`)
      continue
    }
    if (isAlive(rec.pid)) {
      killTree(rec.pid)
      log(`${c.red}■${c.reset} ${s.name} parado (pid ${rec.pid})`)
      any = true
    } else {
      log(`${c.dim}• ${s.name} já estava parado${c.reset}`)
    }
    delete state.services[s.name]
  }
  writeState(state)
  if (!any) log('Nenhum serviço ativo para parar.')
}

async function restart(args: string[]): Promise<void> {
  await down(args)
  const targets = resolveTargets(args)
  for (const s of targets) await waitPortFree(s.port, 5_000)
  log('')
  await up(args)
}

async function status(): Promise<void> {
  const state = readState()
  const cell = (text: string, width: number, color = '') =>
    color ? color + text.padEnd(width) + c.reset : text.padEnd(width)

  log(
    c.bold +
      'Serviço'.padEnd(11) +
      ' ' +
      'PID'.padEnd(8) +
      ' ' +
      'Porta'.padEnd(7) +
      ' ' +
      'Gerenciado'.padEnd(11) +
      ' ' +
      'Escutando'.padEnd(9) +
      c.reset,
  )

  for (const s of SERVICES) {
    const rec = state.services[s.name]
    const managed = isAlive(rec?.pid)
    const listening = await probePort(s.port)
    log(
      cell(s.name, 11) +
        ' ' +
        cell(rec?.pid ? String(rec.pid) : '-', 8) +
        ' ' +
        cell(`:${s.port}`, 7) +
        ' ' +
        cell(managed ? 'sim' : 'não', 11, managed ? c.green : c.dim) +
        ' ' +
        cell(listening ? 'sim' : 'não', 9, listening ? c.green : c.red),
    )
  }
}

async function logs(args: string[]): Promise<void> {
  const once = args.includes('--once') || args.includes('-o')
  const name = args.find((a) => !a.startsWith('-'))
  if (!name) {
    err('uso: bun run dev:logs <serviço> [--once]')
    process.exit(1)
  }
  if (!SERVICES.some((s) => s.name === name)) {
    err(`serviço desconhecido: ${name}. Válidos: ${SERVICES.map((s) => s.name).join(', ')}`)
    process.exit(1)
  }
  const file = join(LOG_DIR, `${name}.log`)
  if (!fs.existsSync(file)) {
    log(`Sem log ainda para ${name} (${rel(file)}). Rode 'bun run dev:up ${name}'.`)
    return
  }

  const content = fs.readFileSync(file, 'utf8')
  const lines = content.split(/\r?\n/)
  const tail = lines.slice(Math.max(0, lines.length - 201)).join('\n')
  process.stdout.write(tail.endsWith('\n') ? tail : `${tail}\n`)
  if (once) return

  log(`${c.dim}— seguindo ${rel(file)} (Ctrl+C para sair) —${c.reset}`)
  let offset = Buffer.byteLength(content, 'utf8')
  setInterval(() => {
    try {
      const { size } = fs.statSync(file)
      if (size < offset) offset = 0 // log truncado (ex.: restart)
      if (size > offset) {
        const fd = fs.openSync(file, 'r')
        const buf = Buffer.alloc(size - offset)
        fs.readSync(fd, buf, 0, buf.length, offset)
        fs.closeSync(fd)
        process.stdout.write(buf.toString('utf8'))
        offset = size
      }
    } catch {
      /* arquivo pode estar sendo rotacionado — ignora este tick */
    }
  }, 400)
}

function printHelp(): void {
  log(`${c.bold}Orquestrador de dev — sistema-zero${c.reset}

  bun run dev:up        [serviços...]   sobe tudo (ou só os listados) em background
  bun run dev:down      [serviços...]   para tudo (ou só os listados)
  bun run dev:restart   [serviços...]   reinicia tudo (ou só os listados)
  bun run dev:status                    mostra o que está de pé
  bun run dev:logs      <serviço> [--once]   acompanha o log de um serviço

  Serviços: ${SERVICES.map((s) => s.name).join(', ')}`)
}

// ---------------------------------------------------------------------------- main
async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2)
  switch (cmd) {
    case 'up':
      await up(rest)
      break
    case 'down':
      await down(rest)
      break
    case 'restart':
      await restart(rest)
      break
    case 'status':
      await status()
      break
    case 'logs':
      await logs(rest)
      break
    case undefined:
    case 'help':
    case '-h':
    case '--help':
      printHelp()
      break
    default:
      err(`comando desconhecido: ${cmd}`)
      printHelp()
      process.exit(1)
  }
}

main().catch((e) => {
  err(e?.message ?? String(e))
  process.exit(1)
})

#!/usr/bin/env bun
/**
 * Sobe a pilha local: Postgres portátil (:55432) + Auth, Catalog, Members, Gateway,
 * Admin, Adulto e Kids, cada um em background com a env explícita de lib.ts (nenhum
 * .env nos pacotes). Logs em .cache/local-stack/logs, PIDs/portas em state.json.
 *
 *   bun scripts/local-studio-stack/up.ts [serviço...] [--no-wait]
 *
 * Pré-requisito: `bun scripts/local-studio-stack/setup.ts`.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { join } from 'node:path'
import {
  childEnv,
  ensureSecrets,
  exe,
  isAlive,
  LOG_DIR,
  PG_DATA,
  PG_PORT,
  pgEnv,
  probePort,
  ROOT,
  readState,
  run,
  SERVICES,
  type ServiceDef,
  STACK_DIR,
  serviceEnv,
  sleep,
  writeState,
} from './lib'

const args = process.argv.slice(2)
const names = args.filter((a) => !a.startsWith('-'))
const targets = names.length ? SERVICES.filter((s) => names.includes(s.name)) : SERVICES
const secrets = ensureSecrets()
fs.mkdirSync(LOG_DIR, { recursive: true })

async function startPostgres(): Promise<void> {
  if (await probePort(PG_PORT)) {
    console.log(`✓ Postgres já respondendo em 127.0.0.1:${PG_PORT}`)
    return
  }
  run(exe('pg_ctl'), ['-D', PG_DATA, '-l', join(STACK_DIR, 'pg.log'), '-w', 'start'], {
    env: pgEnv(secrets),
  })
}

async function startService(s: ServiceDef): Promise<boolean> {
  const state = readState()
  const rec = state.services[s.name]
  if (rec && isAlive(rec.pid)) {
    console.log(`• ${s.name} já rodando (pid ${rec.pid})`)
    return false
  }
  if (await probePort(s.port)) {
    throw new Error(`porta :${s.port} (${s.name}) já está em uso por um processo não gerenciado`)
  }
  if (s.requires && !fs.existsSync(s.requires)) {
    console.log(`• ${s.name} pulado (falta ${s.requires}; rode python-local.ts)`)
    return false
  }
  const logFile = join(LOG_DIR, `${s.name}.log`)
  const fd = fs.openSync(logFile, 'w')
  const child = spawn(s.cmd ?? process.execPath, s.args, {
    cwd: join(ROOT, 'packages', s.dir),
    env: childEnv(serviceEnv(s.name, secrets)),
    detached: true,
    windowsHide: true,
    stdio: ['ignore', fd, fd],
  })
  fs.closeSync(fd)
  if (!child.pid) throw new Error(`${s.name}: spawn sem PID`)
  child.unref()
  state.services[s.name] = {
    pid: child.pid,
    port: s.port,
    logFile,
    startedAt: new Date().toISOString(),
  }
  writeState(state)
  console.log(`▶ ${s.name} (pid ${child.pid}) :${s.port} → ${logFile}`)
  return true
}

async function waitHealthy(s: ServiceDef, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${s.port}${s.health}`, {
        signal: AbortSignal.timeout(s.kind === 'next' ? 240_000 : 3_000),
        redirect: 'manual',
      })
      if (res.status < 500) return true
    } catch {
      /* ainda subindo */
    }
    const rec = readState().services[s.name]
    if (rec && !isAlive(rec.pid)) return false
    await sleep(1000)
  }
  return false
}

await startPostgres()
const state = readState()
state.postgres = { port: PG_PORT, dataDir: PG_DATA }
writeState(state)

// APIs primeiro (o gateway sonda os upstreams), depois os apps Next.
const failed: string[] = []
for (const group of [
  targets.filter((s) => s.kind === 'api'),
  targets.filter((s) => s.kind === 'next'),
]) {
  for (const s of group) await startService(s)
  if (args.includes('--no-wait')) continue
  for (const s of group) {
    if (s.requires && !fs.existsSync(s.requires)) continue
    const ok = await waitHealthy(s, s.kind === 'next' ? 300_000 : 60_000)
    console.log(`${ok ? '✓' : '✗'} ${s.name.padEnd(9)} http://localhost:${s.port}${s.health}`)
    if (!ok) failed.push(s.name)
  }
}
if (failed.length) {
  console.error(`\nFalharam: ${failed.join(', ')} — veja ${LOG_DIR}`)
  process.exit(1)
}
console.log('\nPilha local de pé. Parar: bun scripts/local-studio-stack/down.ts')

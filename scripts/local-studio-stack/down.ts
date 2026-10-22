#!/usr/bin/env -S bun --no-env-file
import { spawnSync } from 'node:child_process'
/**
 * Para a pilha local: mata a árvore de cada serviço registrado em state.json e para o
 * Postgres portátil (pg_ctl stop -m fast). `--keep-db` mantém o Postgres de pé.
 *
 *   bun --no-env-file scripts/local-studio-stack/down.ts [serviço...] [--keep-db]
 */
import fs from 'node:fs'
import {
  exe,
  isAlive,
  isOurProcess,
  killTree,
  PG_DATA,
  pgEnv,
  probePort,
  readSecrets,
  readState,
  writeState,
} from './lib'

const args = process.argv.slice(2)
const names = args.filter((a) => !a.startsWith('-'))
const state = readState()
for (const [name, rec] of Object.entries(state.services)) {
  if (names.length && !names.includes(name)) continue
  if (isOurProcess(rec)) {
    killTree(rec.pid)
    console.log(`■ ${name} parado (pid ${rec.pid})`)
  } else if (isAlive(rec.pid)) {
    // O PID existe mas não é o processo iniciado pelo up.ts (o Windows reutiliza PIDs) ou o
    // registro é antigo, sem identidade: não encerra; só esquece o registro.
    console.log(
      `⚠ ${name}: o pid ${rec.pid} existe mas não confere com o processo iniciado (executável/início); não foi encerrado`,
    )
  } else {
    console.log(`• ${name} já estava parado`)
  }
  delete state.services[name]
}
writeState(state)

if (!names.length && !args.includes('--keep-db')) {
  if (state.postgres && (await probePort(state.postgres.port)) && fs.existsSync(PG_DATA)) {
    // Cleanup must remain available if a dotenv appeared after startup. No app loader runs here.
    const stopped = spawnSync(exe('pg_ctl'), ['-D', PG_DATA, '-m', 'fast', '-w', 'stop'], {
      env: pgEnv(readSecrets()),
      stdio: 'inherit',
      windowsHide: true,
    })
    if (stopped.status !== 0) throw new Error(`pg_ctl stop falhou (status ${stopped.status})`)
  }
  delete state.postgres
  writeState(state)
}

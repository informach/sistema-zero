#!/usr/bin/env bun
/**
 * Roda um script canônico de packages/members/scripts com a env local do Members.
 *   bun scripts/local-studio-stack/members-script.ts bootstrap-kids-journey.ts initialize --confirm-rollout-order
 */
import { join } from 'node:path'
import { childEnv, ROOT, readSecrets, run, serviceEnv } from './lib'

const [script, ...rest] = process.argv.slice(2)
if (!script || !/^[a-z0-9-]+\.ts$/.test(script)) {
  console.error('uso: members-script.ts <script.ts> [args...]')
  process.exit(1)
}
run(process.execPath, ['run', `scripts/${script}`, ...rest], {
  cwd: join(ROOT, 'packages', 'members'),
  env: childEnv(serviceEnv('members', readSecrets())),
})

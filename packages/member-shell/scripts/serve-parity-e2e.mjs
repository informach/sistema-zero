import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readlinkSync,
  rmSync,
  statSync,
  symlinkSync,
} from 'node:fs'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const app = process.argv[2]
if (!['community', 'community-kids'].includes(app))
  throw new Error('Specify community or community-kids for the isolated local parity server.')
const packagesRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const packageRoot = resolve(packagesRoot, app)
const standalone = resolve(packageRoot, '.next/standalone/packages', app)
const standaloneRoot = resolve(packageRoot, '.next/standalone')
if (!existsSync(resolve(standalone, 'server.js')))
  throw new Error('Build the selected community before starting parity QA.')

// Only the disposable build copy is sanitized. Never edit source environments.
for (const name of ['.env', '.env.local', '.env.production', '.env.production.local'])
  rmSync(resolve(standalone, name), { force: true })
for (const name of Object.keys(process.env))
  if (
    /^(R2_|OPENROUTER_|ELEVENLABS_|SENTRY_|STUDIO_PRO_RUNTIME_|STUDIO_BUILDER_EXECUTOR_)/.test(name)
  )
    delete process.env[name]
delete process.env.JWT_HS256_SECRET
Object.assign(process.env, {
  NODE_ENV: 'production',
  HOSTNAME: '127.0.0.1',
  PORT: app === 'community' ? '43107' : '43108',
  APP_PUBLIC_URL: app === 'community' ? 'http://127.0.0.1:43107' : 'http://127.0.0.1:43108',
  GATEWAY_URL: 'http://127.0.0.1:43100',
  JWT_ISSUER: 'local-qa-auth',
  JWT_AUDIENCE: 'local-qa',
  JWT_JWKS_URL: 'http://127.0.0.1:43102/auth/.well-known/jwks.json',
  MEMBER_SHELL_HMAC_SECRET: 'local-qa-internal-secret-2026-only',
  GATEWAY_HMAC_SECRET: 'local-qa-internal-secret-2026-only',
  PARENT_GATE_HMAC_SECRET: 'local-qa-parent-gate-secret-2026-only',
  CREATION_CLEANUP_CRON_SECRET: 'local-qa-creation-cleanup-secret-2026-only',
  VOICE_INPUT_ENABLED: 'false',
})

mkdirSync(resolve(standalone, '.next'), { recursive: true })
cpSync(resolve(packageRoot, '.next/static'), resolve(standalone, '.next/static'), {
  recursive: true,
  force: true,
})
cpSync(resolve(packageRoot, 'public'), resolve(standalone, 'public'), {
  recursive: true,
  force: true,
})

// Next's tracing can emit file-typed links to directories on Windows. Native Node
// rejects these with EPERM even when their targets exist. Correct only directory
// links wholly contained in this disposable standalone tree; source links stay intact.
if (process.platform === 'win32') {
  function fixDirectoryLinks(directory) {
    for (const entry of readdirSync(directory)) {
      const path = resolve(directory, entry)
      const info = lstatSync(path)
      if (info.isSymbolicLink()) {
        const target = resolve(dirname(path), readlinkSync(path))
        const inside = relative(standaloneRoot, target)
        if (inside.startsWith('..') || isAbsolute(inside) || !existsSync(target)) continue
        if (statSync(target).isDirectory()) {
          rmSync(path)
          symlinkSync(target, path, 'junction')
        }
      } else if (info.isDirectory()) fixDirectoryLinks(path)
    }
  }
  fixDirectoryLinks(standaloneRoot)
}
await import(pathToFileURL(resolve(standalone, 'server.js')).href)

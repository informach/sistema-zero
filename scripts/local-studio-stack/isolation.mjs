import fs from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const SERVICE_DIRECTORIES = {
  auth: 'auth',
  catalog: 'catalog',
  members: 'members',
  hub: 'hub',
  gateway: 'api-gateway',
  admin: 'admin',
  community: 'community',
  kids: 'community-kids',
  'studio-runtime': 'studio-runtime',
}
// All automatic modes used by Bun and Next. Templates such as .env.example are allowed.
export const DOTENV_NAMES = [
  '.env',
  '.env.local',
  ...['development', 'production', 'test'].flatMap((mode) => [
    `.env.${mode}`,
    `.env.${mode}.local`,
  ]),
]

/** Inspect paths only: never read, print, rename or remove an environmental file. */
export function assertLocalStackIsolation({ root = ROOT, cwd = process.cwd() } = {}) {
  const directories = new Set([
    resolve(root),
    resolve(cwd),
    ...Object.values(SERVICE_DIRECTORIES).map((dir) => join(resolve(root), 'packages', dir)),
  ])
  const checks = new Map([...directories].map((directory) => [directory, DOTENV_NAMES]))
  // Wrangler also loads dotenv relative to its config, when .dev.vars is absent.
  // Neither dev nor getPlatformProxy selects an environment here: only these two names apply.
  const runtimeConfigDirectory = join(resolve(root), '.cache/local-stack/studio-runtime')
  if (!checks.has(runtimeConfigDirectory))
    checks.set(runtimeConfigDirectory, ['.env', '.env.local'])
  const conflicts = []
  for (const [directory, names] of checks) {
    for (const name of names) {
      const path = join(directory, name)
      try {
        // A symlink or an unreadable file must also stop the preflight.
        fs.lstatSync(path)
        conflicts.push(path)
      } catch (error) {
        if (error.code !== 'ENOENT')
          throw new Error(`Não foi possível verificar o caminho dotenv: ${path}`)
      }
    }
  }
  if (conflicts.length)
    throw new Error(
      `Pilha local recusada: Bun/Next/Wrangler podem carregar estes arquivos dotenv:\n${conflicts.join('\n')}\nUse uma worktree sem esses arquivos e invoque Bun com --no-env-file. Nenhum arquivo foi alterado.`,
    )
}

/** Bun's flag does not disable Next's loader; the path preflight is required as well. */
export const bunArgs = (args) => ['--no-env-file', ...args]

import {
  resolveStudioProRemoteDependencies,
  STUDIO_PRO_BUILD_LIMITS,
} from '@sistemazero/core/studio'
import runtimeLock from '../runtime/package-lock.json' with { type: 'json' }

interface LockedPackage {
  version?: string
  dependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
  dev?: boolean
  [key: string]: unknown
}

/** Pure selection from the installed image graph: no registry lookup, scripts or model-authored hashes. */
export function prepareRuntimeDependencyLock(packageJson: string): string {
  const manifest = JSON.parse(packageJson) as Record<string, unknown>
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest))
    throw new Error('Manifesto inválido.')
  const trusted = runtimeLock.packages as Record<string, LockedPackage>
  if (Object.keys(trusted).some((path) => path.includes('/node_modules/')))
    throw new Error('O grafo do runtime mudou de estrutura e precisa de revisão.')
  const root: LockedPackage = {
    ...(typeof manifest.name === 'string' ? { name: manifest.name } : {}),
    ...(typeof manifest.version === 'string' ? { version: manifest.version } : {}),
    ...(manifest.dependencies
      ? { dependencies: manifest.dependencies as Record<string, string> }
      : {}),
    ...(manifest.devDependencies ? { devDependencies: manifest.devDependencies } : {}),
  }
  const resolved = resolveStudioProRemoteDependencies(
    packageJson,
    JSON.stringify({ lockfileVersion: 3, packages: { ...trusted, '': root } }),
  )
  const packages: Record<string, LockedPackage> = { '': root }
  const roles = new Map<string, boolean>()
  const queue = [
    ...Object.keys(resolved.dependencies).map((name) => ({ name, dev: false })),
    ...Object.keys(resolved.devDependencies).map((name) => ({ name, dev: true })),
  ]
  for (let index = 0; index < queue.length; index++) {
    const { name, dev } = queue[index]!
    const path = `node_modules/${name}`
    if (roles.has(path) && (!roles.get(path) || dev)) continue
    roles.set(path, dev)
    const entry = trusted[path]
    if (!entry) throw new Error(`Dependência ausente na imagem: ${name}`)
    const { dev: _dev, ...copy } = entry
    packages[path] = { ...copy, ...(dev ? { dev: true } : {}) }
    queue.push(
      ...Object.keys({ ...entry.dependencies, ...entry.optionalDependencies }).map((name) => ({
        name,
        dev,
      })),
    )
    for (const peer of Object.keys(entry.peerDependencies ?? {}))
      if (!entry.peerDependenciesMeta?.[peer]?.optional) queue.push({ name: peer, dev })
  }
  const lock = `${JSON.stringify({ ...(root.name ? { name: root.name } : {}), ...(root.version ? { version: root.version } : {}), lockfileVersion: 3, requires: true, packages: Object.fromEntries(Object.entries(packages).sort(([a], [b]) => a.localeCompare(b, 'en'))) }, null, 2)}\n`
  if (lock.length > STUDIO_PRO_BUILD_LIMITS.maxFileChars)
    throw new Error('O lock ultrapassa o limite da revisão.')
  return lock
}

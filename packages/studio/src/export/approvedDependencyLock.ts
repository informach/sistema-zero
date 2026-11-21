import { APPROVED_LOCK_PACKAGES_JSON } from './approvedDependencyLock.generated'

/**
 * Lote 7 da missão (seção 14, "builds reproduzíveis"): a trava (`package-lock.json`) que a
 * exportação do Pro leva quando o projeto não tem a sua. Sem trava, as dependências diretas têm
 * versão exata mas as indiretas (as do Vite, por exemplo) mudam com o tempo, e o mesmo ZIP instala
 * outra coisa amanhã. A trava sai do grafo APROVADO (o do build hospedado, com os hashes de
 * integridade de todas as plataformas): o recorte que as dependências do projeto alcançam.
 *
 * Só sai trava quando ela é verdadeira: toda dependência direta precisa estar no grafo com a
 * MESMA versão exata, e toda indireta obrigatória precisa estar nele. Uma biblioteca que a criança
 * instalou e o grafo não tem (ou outro gerenciador declarado em `packageManager`) devolve `null`, e
 * a exportação segue sem trava, com as instruções de `npm install`.
 */
export interface ApprovedLockPackage {
  version?: string
  dependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
  optional?: boolean
  [key: string]: unknown
}

let approved: Record<string, ApprovedLockPackage> | undefined
const approvedPackages = () => {
  approved ??= JSON.parse(APPROVED_LOCK_PACKAGES_JSON) as Record<string, ApprovedLockPackage>
  return approved
}

const record = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  )
}

export function approvedLockFor(
  manifestText: string,
  packages: Record<string, ApprovedLockPackage> = approvedPackages(),
): string | null {
  let manifest: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(manifestText)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    manifest = parsed as Record<string, unknown>
  } catch {
    return null
  }
  const declared = typeof manifest.packageManager === 'string' ? manifest.packageManager : ''
  if (declared && !declared.startsWith('npm@')) return null
  // Campos que a trava daqui não descreve: com eles o `npm ci` recusa a trava ("Missing … from
  // lock file"). Melhor sair sem trava, com `npm install` (revisão do lote 7).
  for (const field of [
    'optionalDependencies',
    'peerDependencies',
    'overrides',
    'bundleDependencies',
    'bundledDependencies',
    'workspaces',
  ])
    if (manifest[field] !== undefined) return null
  const dependencies = record(manifest.dependencies)
  const devDependencies = record(manifest.devDependencies)
  const direct = { ...dependencies, ...devDependencies }
  if (Object.keys(direct).length === 0) return null
  for (const [name, version] of Object.entries(direct))
    if (packages[`node_modules/${name}`]?.version !== version) return null

  // O que cada lado alcança: o que só as dependências de desenvolvimento alcançam leva `dev`.
  const reach = (roots: string[]): Set<string> | null => {
    const seen = new Set<string>()
    const queue = roots.map((name) => ({ name, optional: false }))
    while (queue.length) {
      const next = queue.shift()
      if (!next) break
      const path = `node_modules/${next.name}`
      if (seen.has(path)) continue
      const entry = packages[path]
      if (!entry) {
        if (next.optional) continue
        return null
      }
      seen.add(path)
      for (const name of Object.keys(entry.dependencies ?? {}))
        queue.push({ name, optional: false })
      for (const name of Object.keys(entry.optionalDependencies ?? {}))
        queue.push({ name, optional: true })
      for (const name of Object.keys(entry.peerDependencies ?? {}))
        queue.push({ name, optional: Boolean(entry.peerDependenciesMeta?.[name]?.optional) })
    }
    return seen
  }
  const production = reach(Object.keys(dependencies))
  const everything = reach(Object.keys(direct))
  if (!production || !everything) return null

  const locked: Record<string, ApprovedLockPackage> = {
    '': {
      ...(typeof manifest.name === 'string' ? { name: manifest.name } : {}),
      ...(typeof manifest.version === 'string' ? { version: manifest.version } : {}),
      ...(Object.keys(dependencies).length ? { dependencies } : {}),
      ...(Object.keys(devDependencies).length ? { devDependencies } : {}),
    },
  }
  for (const path of [...everything].sort((a, b) => a.localeCompare(b, 'en'))) {
    const { dev: _dev, ...entry } = packages[path] as ApprovedLockPackage & { dev?: boolean }
    locked[path] = production.has(path) ? entry : { ...entry, dev: true }
  }
  return `${JSON.stringify(
    {
      ...(typeof manifest.name === 'string' ? { name: manifest.name } : {}),
      ...(typeof manifest.version === 'string' ? { version: manifest.version } : {}),
      lockfileVersion: 3,
      requires: true,
      packages: locked,
    },
    null,
    2,
  )}\n`
}

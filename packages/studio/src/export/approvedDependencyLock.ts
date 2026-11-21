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

interface LockMark {
  dev: boolean
  optional: boolean
  devOptional: boolean
  peer: boolean
}

/**
 * O recorte do grafo que o projeto alcança, com as marcas que o npm calcula para ESTE projeto
 * (revisão final do lote 7). As marcas da trava do runtime valem para o runtime: o `tslib`, por
 * exemplo, é opcional lá (só o `@emnapi` chega nele) e seria copiado como opcional mesmo declarado
 * direto pelo projeto, e o `npm ci --omit=optional` o tiraria calado. Cada pacote guarda por que
 * tipos de caminho foi alcançado; uma marca fica só se NENHUM caminho a desfaz:
 * - `dev`: nenhum caminho sai das `dependencies`;
 * - `optional`: todo caminho passa por uma dependência opcional;
 * - `devOptional`: todo caminho passa por desenvolvimento OU por opcional;
 * - `peer`: todo caminho passa por um par (`peerDependencies`).
 * O par OPCIONAL não entra no recorte: o npm nunca o instala sozinho. Uma indireta obrigatória
 * que falta no grafo devolve `null` (a trava seria falsa).
 */
function lockFlags(
  dependencies: Record<string, string>,
  devDependencies: Record<string, string>,
  packages: Record<string, ApprovedLockPackage>,
): Map<string, LockMark> | null {
  interface Step {
    name: string
    dev: boolean
    optional: boolean
    peer: boolean
    required: boolean
  }
  const marks = new Map<string, LockMark>()
  const seen = new Set<string>()
  const queue: Step[] = [
    ...Object.keys(dependencies).map((name) => ({
      name,
      dev: false,
      optional: false,
      peer: false,
      required: true,
    })),
    ...Object.keys(devDependencies).map((name) => ({
      name,
      dev: true,
      optional: false,
      peer: false,
      required: true,
    })),
  ]
  for (let index = 0; index < queue.length; index++) {
    const step = queue[index] as Step
    const path = `node_modules/${step.name}`
    const entry = packages[path]
    if (!entry) {
      if (step.required) return null
      continue
    }
    const key = `${path}|${step.dev}|${step.optional}|${step.peer}`
    if (seen.has(key)) continue
    seen.add(key)
    const mark = marks.get(path) ?? { dev: true, optional: true, devOptional: true, peer: true }
    if (!step.dev) mark.dev = false
    if (!step.optional) mark.optional = false
    if (!step.dev && !step.optional) mark.devOptional = false
    if (!step.peer) mark.peer = false
    marks.set(path, mark)
    const next = (name: string, kind: 'dependency' | 'optional' | 'peer') =>
      queue.push({
        name,
        dev: step.dev,
        optional: step.optional || kind === 'optional',
        peer: step.peer || kind === 'peer',
        required: kind !== 'optional',
      })
    const optionalNames = entry.optionalDependencies ?? {}
    for (const name of Object.keys(entry.dependencies ?? {}))
      if (!(name in optionalNames)) next(name, 'dependency')
    for (const name of Object.keys(optionalNames)) next(name, 'optional')
    for (const name of Object.keys(entry.peerDependencies ?? {}))
      if (!entry.peerDependenciesMeta?.[name]?.optional) next(name, 'peer')
  }
  return marks
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

  const flags = lockFlags(dependencies, devDependencies, packages)
  if (!flags) return null

  const locked: Record<string, ApprovedLockPackage> = {
    '': {
      ...(typeof manifest.name === 'string' ? { name: manifest.name } : {}),
      ...(typeof manifest.version === 'string' ? { version: manifest.version } : {}),
      ...(Object.keys(dependencies).length ? { dependencies } : {}),
      ...(Object.keys(devDependencies).length ? { devDependencies } : {}),
    },
  }
  for (const [path, mark] of [...flags].sort(([a], [b]) => a.localeCompare(b, 'en'))) {
    const {
      dev: _dev,
      optional: _optional,
      devOptional: _devOptional,
      peer: _peer,
      ...entry
    } = packages[path] as ApprovedLockPackage
    locked[path] = {
      ...entry,
      ...(mark.peer ? { peer: true } : {}),
      ...(mark.dev ? { dev: true } : {}),
      ...(mark.optional ? { optional: true } : {}),
      ...(mark.devOptional && !mark.dev && !mark.optional ? { devOptional: true } : {}),
    }
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

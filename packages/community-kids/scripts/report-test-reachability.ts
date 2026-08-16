import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'

const packageRoot = resolve(import.meta.dir, '..')
const sourceRoot = join(packageRoot, 'src')
const testsRoot = join(packageRoot, 'tests')
const sourceExtensions = new Set(['.ts', '.tsx'])

function collectFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name)
    return entry.isDirectory() ? collectFiles(path) : [path]
  })
}

const sourceFiles = collectFiles(sourceRoot).filter(
  (file) => sourceExtensions.has(extname(file)) && !file.endsWith('.d.ts'),
)
const testFiles = collectFiles(testsRoot).filter((file) => /\.test\.tsx?$/.test(file))
const sourceSet = new Set(sourceFiles.map((file) => resolve(file)))

function resolveImport(fromFile: string, specifier: string): string | null {
  const base = specifier.startsWith('@/')
    ? join(sourceRoot, specifier.slice(2))
    : specifier.startsWith('.')
      ? resolve(dirname(fromFile), specifier)
      : null
  if (!base) return null
  const candidates = extname(base)
    ? [base]
    : [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]
  return candidates.find((candidate) => existsSync(candidate)) ?? null
}

function importsOf(file: string): string[] {
  const source = readFileSync(file, 'utf8')
  const specifiers = new Set<string>()
  const patterns = [
    /(?:import|export)\s+(?:type\s+)?(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g,
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1]
      if (specifier) specifiers.add(specifier)
    }
  }
  return [...specifiers]
    .map((specifier) => resolveImport(file, specifier))
    .filter((resolved): resolved is string => resolved !== null)
}

const visited = new Set<string>()
const queue = [...testFiles]
while (queue.length > 0) {
  const file = queue.pop()
  if (!file) continue
  const absolute = resolve(file)
  if (visited.has(absolute)) continue
  visited.add(absolute)
  queue.push(...importsOf(absolute))
}

const reachableSources = new Set([...visited].filter((file) => sourceSet.has(file)))
const percent = (reachableSources.size / sourceFiles.length) * 100
console.log(
  `Alcance estático dos testes: ${reachableSources.size}/${sourceFiles.length} módulos de src (${percent.toFixed(1)}%).`,
)
console.log(
  'Este número mede módulos alcançáveis pelo grafo de imports; não é cobertura de linhas e acompanha o relatório do Bun.',
)

const criticalFiles = [
  'app/(app)/recados/[threadId]/recado-thread-client.tsx',
  'app/perfis/parent-dashboard.tsx',
  'app/perfis/purchases-view.tsx',
  'components/kids/kids-space-view-client.tsx',
  'components/kids/kids-space-content.tsx',
  'components/kids/mobile-gamepad.tsx',
  'components/kids/public-player.tsx',
  'components/kids/room/room-builder.tsx',
  'components/kids/room/room-builder-view.tsx',
  'components/kids/use-pensa-task-handoff.ts',
  'lib/gamepad-visibility.ts',
  'lib/guide.ts',
  'lib/lesson-block-content.ts',
  'lib/pensa-capabilities.ts',
  'components/kids/room/coords.ts',
  'components/kids/room/placement.ts',
  'server/parent-gate-token.ts',
]
const missingCritical = criticalFiles.filter(
  (file) => !reachableSources.has(resolve(sourceRoot, file)),
)
if (missingCritical.length > 0) {
  console.error('Módulos críticos fora do alcance dos testes:')
  for (const file of missingCritical) console.error(`- src/${file}`)
  process.exitCode = 1
} else {
  console.log('Todos os módulos críticos declarados estão alcançados por testes.')
}

const uncovered = sourceFiles
  .filter((file) => !reachableSources.has(resolve(file)))
  .map((file) => relative(sourceRoot, file).replaceAll('\\', '/'))
console.log(`Módulos ainda não alcançados: ${uncovered.length}.`)

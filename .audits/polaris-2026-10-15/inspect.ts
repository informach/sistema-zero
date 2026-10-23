import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// Read-only inspection of the supplied repository. Outputs stay beside this script.
const root = 'C:/Users/tocha/Downloads/polaris-main/polaris-main'
const output = import.meta.dir
const files: string[] = []
async function walk(dir: string) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.next'].includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) await walk(full)
    else files.push(path.relative(root, full).replaceAll('\\', '/'))
  }
}
await walk(root)
files.sort()
const contents = new Map<string, string>()
const inventory = []
const transpiler = new Bun.Transpiler({ loader: 'tsx' })
const sourceFiles = files.filter((file) => /\.(?:ts|tsx|js|mjs)$/.test(file))
function resolveImport(from: string, specifier: string) {
  let base: string
  if (specifier.startsWith('@/')) base = `src/${specifier.slice(2)}`
  else if (specifier.startsWith('.')) base = path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier))
  else return null
  return [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}/index.ts`, `${base}/index.tsx`].find((candidate) => files.includes(candidate)) ?? null
}
for (const file of files) {
  const bytes = await readFile(path.join(root, file))
  const source = bytes.toString('utf8')
  if (!/\.(ico|png|jpg|webp)$/.test(file)) contents.set(file, source)
  let scan: ReturnType<typeof transpiler.scan> | undefined
  let scanError: string | undefined
  if (sourceFiles.includes(file) && !file.endsWith('.d.ts')) {
    try { scan = transpiler.scan(source) } catch (error) { scanError = String(error) }
  }
  inventory.push({
    file,
    bytes: bytes.length,
    lines: sourceFiles.includes(file) ? source.split(/\r?\n/).length : null,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    exports: scan?.exports ?? [],
    imports: scan?.imports ?? [],
    localImports: scan?.imports.map((item) => resolveImport(file, item.path)).filter(Boolean) ?? [],
    scanError,
  })
}
const graph = new Map(inventory.map((item) => [item.file, item.localImports]))
// Framework entry points are roots even without a static importer.
const roots = sourceFiles.filter((file) => file.startsWith('src/app/') || file.startsWith('convex/') || !file.includes('/') || /^src\/(proxy|instrumentation|instrumentation-client)\./.test(file))
const reachable = new Set<string>()
function visit(file: string) {
  if (reachable.has(file)) return
  reachable.add(file)
  for (const dependency of graph.get(file) ?? []) if (dependency) visit(dependency)
}
roots.forEach(visit)
const groups = ['src/components/ui/', 'src/components/ai-elements/', 'src/features/', 'src/app/', 'convex/'].map((prefix) => {
  const entries = inventory.filter((item) => item.file.startsWith(prefix) && item.lines !== null)
  return { prefix, files: entries.length, lines: entries.reduce((sum, item) => sum + (item.lines ?? 0), 0), reachableFiles: entries.filter((item) => reachable.has(item.file)).length }
})
const pkg = JSON.parse(contents.get('package.json')!)
const summary = {
  root,
  recordedAt: new Date().toISOString(),
  files: files.length,
  sourceFiles: sourceFiles.length,
  sourceLines: inventory.reduce((sum, item) => sum + (item.lines ?? 0), 0),
  sourceFilesWithoutGenerated: sourceFiles.filter((file) => !file.startsWith('convex/_generated/')).length,
  sourceLinesWithoutGenerated: inventory.filter((item) => !item.file.startsWith('convex/_generated/')).reduce((sum, item) => sum + (item.lines ?? 0), 0),
  groups,
  testFiles: files.filter((file) => /(?:\.test\.|\.spec\.|__tests__)/.test(file)),
  licenseFiles: files.filter((file) => /(?:^|\/)(license|copying|notice)(?:\.|$)/i.test(file)),
  scripts: pkg.scripts,
  dependencies: Object.keys(pkg.dependencies).length,
  aiElementsReachable: sourceFiles.filter((file) => file.startsWith('src/components/ai-elements/') && reachable.has(file)),
  aiElementsNotReachable: sourceFiles.filter((file) => file.startsWith('src/components/ai-elements/') && !reachable.has(file)),
  largeFiles: inventory.filter((item) => (item.lines ?? 0) > 500).map(({ file, lines }) => ({ file, lines })),
  scanErrors: inventory.filter((item) => item.scanError).map(({ file, scanError }) => ({ file, scanError })),
  caution: 'Static import reachability is triage, not proof that every export is unused or that runtime behavior works. Type-only imports may be erased. No external service or application startup was used.',
}
await writeFile(path.join(output, 'inventory.json'), JSON.stringify(inventory.map((item) => ({ ...item, reachable: reachable.has(item.file) })), null, 2) + '\n')
await writeFile(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n')

// Execute only the original pure tree utility. Bun erases its type-only imports.
const { buildFileTree } = await import(pathToFileURL(path.join(root, 'src/features/preview/utils/file-tree.ts')).href)
const folder = { _id: 'folder', projectId: 'project', name: 'src', type: 'folder' }
const child = { _id: 'child', projectId: 'project', parentId: 'folder', name: 'index.ts', type: 'file', content: 'export const value = 1' }
const binary = { _id: 'binary', projectId: 'project', name: 'cover.png', type: 'file', storageId: 'storage' }
const parentFirst = buildFileTree([folder, child])
const childFirst = buildFileTree([child, folder])
const withBinary = buildFileTree([folder, child, binary])
const checks = {
  method: 'Original pure function imported from supplied repository; synthetic in-memory file metadata; no backend, browser, or credentials.',
  parentFirstPreservesChild: !!parentFirst.src?.directory?.['index.ts'],
  childFirstPreservesChild: !!childFirst.src?.directory?.['index.ts'],
  binaryIncluded: !!withBinary['cover.png'],
  parentFirst,
  childFirst,
  withBinary,
}
await writeFile(path.join(output, 'reproduction.json'), JSON.stringify(checks, null, 2) + '\n')
console.log(JSON.stringify({ summary, reproduction: checks }, null, 2))

import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname, relative } from 'node:path'
import ts from '../../packages/agent-runtime/node_modules/typescript'

const root = resolve(import.meta.dir, '../..')
async function command(args: string[]) {
  const child = Bun.spawn(args, { cwd: root, stdout: 'pipe', stderr: 'pipe' })
  const [out, err, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
  if (code) throw new Error(err)
  return out.trim().split(/\r?\n/).filter(Boolean).map(path => path.replaceAll('\\', '/'))
}
const scope = ['agent-core', 'agent-runtime', 'agent-integrations', 'tui']
const files = new Set(await command(['rg', '--files', ...scope.map(name => `packages/${name}`), 'scripts/tui-release']))
for (const file of await command(['git', 'diff', '--name-only', 'fcd6f117^', 'fcd6f117', '--', 'packages/auth', 'packages/core', 'packages/messaging', 'packages/api-gateway', 'packages/studio-runtime'])) files.add(file)
const absolute = new Map([...files].map(file => [resolve(root, file), file]))
const exports = new Map<string, string>()
for (const name of scope) {
  const file = `packages/${name}/package.json`
  const data = JSON.parse(await readFile(resolve(root, file), 'utf8'))
  if (data.module) exports.set(data.name, resolve(root, dirname(file), data.module))
  for (const [key, value] of Object.entries(data.exports ?? {}))
    if (typeof value === 'string') exports.set(data.name + (key === '.' ? '' : key.slice(1)), resolve(root, dirname(file), value))
}
const identifiers = new Map<string, number>()
const entries: { file: string; lines: number; sha256: string; exports: string[]; imports: string[]; runtimeDependencies: string[]; typeEscapes: string[] }[] = []
for (const file of [...files].sort()) {
  const text = await readFile(resolve(root, file), 'utf8')
  const entry = { file, lines: text.split('\n').length, sha256: createHash('sha256').update(text).digest('hex'), exports: [] as string[], imports: [] as string[], runtimeDependencies: [] as string[], typeEscapes: [] as string[] }
  if (/\.[cm]?tsx?$/.test(file)) {
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
    const visit = (node: ts.Node) => {
      if (ts.isIdentifier(node)) identifiers.set(node.text, (identifiers.get(node.text) ?? 0) + 1)
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const spec = node.moduleSpecifier.text
        entry.imports.push(spec)
        if (!node.importClause?.isTypeOnly) {
          const target = spec.startsWith('.') ? resolve(root, dirname(file), spec) : exports.get(spec)
          if (target) {
            const found = [target, target + '.ts', target + '.tsx', resolve(target, 'index.ts'), resolve(target, 'index.tsx')].find(path => absolute.has(path))
            if (found) entry.runtimeDependencies.push(absolute.get(found)!)
          }
        }
      }
      if (ts.canHaveModifiers(node) && ts.getModifiers(node)?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword)) {
        if (ts.isVariableStatement(node)) { for (const item of node.declarationList.declarations) if (ts.isIdentifier(item.name)) entry.exports.push(item.name.text) }
        else if (ts.isClassDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) { if (node.name) entry.exports.push(node.name.text) }
      }
      if (node.kind === ts.SyntaxKind.AnyKeyword) entry.typeEscapes.push(`any:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`)
      ts.forEachChild(node, visit)
    }
    visit(source)
    for (const match of text.matchAll(/@ts-(ignore|nocheck)|as unknown as/g)) entry.typeEscapes.push(match[0])
  }
  entries.push(entry)
}
const graph = new Map(entries.map(entry => [entry.file, entry.runtimeDependencies]))
const cycles = new Set<string>()
function walk(file: string, stack: string[], visited: Set<string>) {
  const start = stack.indexOf(file)
  if (start >= 0) { cycles.add([...stack.slice(start), file].join(' -> ')); return }
  if (visited.has(file)) return
  visited.add(file)
  for (const target of graph.get(file) ?? []) walk(target, [...stack, file], visited)
}
for (const file of graph.keys()) walk(file, [], new Set())
const result = {
  base: '8ea02d96e48f447762ee070e8334d8a6c515c437', generatedAt: new Date().toISOString(),
  methodology: 'Inventory and AST triage of all scoped files; candidates require manual confirmation. Type-only imports, dynamic imports and worker URLs are reviewed separately. This is not proof of absence of defects.',
  totals: { files: entries.length, lines: entries.reduce((sum, entry) => sum + entry.lines, 0) },
  cycles: [...cycles],
  unreferencedExportCandidates: entries.flatMap(entry => entry.exports.filter(name => identifiers.get(name) === 1).map(name => ({ file: entry.file, name }))),
  entries,
}
await writeFile(resolve(import.meta.dir, 'inventory.json'), JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify({ ...result.totals, cycles: result.cycles, candidates: result.unreferencedExportCandidates, typeEscapes: entries.filter(entry => entry.typeEscapes.length).map(entry => ({ file: entry.file, values: entry.typeEscapes })) }, null, 2))

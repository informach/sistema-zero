import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

if (Bun.version !== '1.3.11' || ts.version !== '5.9.3')
  throw new Error('Gere com Bun 1.3.11 e TypeScript 5.9.3.')
const root = fileURLToPath(new URL('../../..', import.meta.url))
const base = path.join(root, 'packages/studio/src/official-extensions')
const contracts = [
  'game-2d/runtimeContract.ts',
  'game-2d/classicContracts.ts',
  'scene-2d/spriteContract.ts',
  'map-2d/contract.ts',
  'game-2d-advanced/runtimeContract.ts',
  'game-2d-advanced/campaignVocabulary.ts',
]
const core = path.join(root, 'packages/core/src/studio/pinta-scene.ts')
const program = ts.createProgram([...contracts.map((p) => path.join(base, p)), core], {
  declaration: true,
  newLine: ts.NewLineKind.LineFeed,
  emitDeclarationOnly: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  skipLibCheck: true,
  strict: true,
  outDir: path.join(root, '.cache/pro-runtime-declarations'),
})
const entries: Record<string, string> = {}
const header = '// Generated from the platform TypeScript contracts. Do not edit.\n'
for (const file of contracts) {
  const source = program.getSourceFile(path.join(base, file))
  if (!source) throw new Error('Contrato não encontrado: ' + file)
  const errors = program.getSemanticDiagnostics(source)
  if (errors.length)
    throw new Error(
      errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n'),
    )
  const result = program.emit(
    source,
    (_filename, data) => {
      const portable = data.replace(
        "'@sistemazero/core/studio/pinta-scene'",
        "'./pinta-scene-object'",
      )
      if (portable.includes('@sistemazero/'))
        throw new Error('Declaração externa não portátil: ' + file)
      entries[file.replace(/\.ts$/, '.d.ts')] = header + portable
    },
    undefined,
    true,
  )
  if (result.emitSkipped || result.diagnostics.length) throw new Error('Falha na emissão: ' + file)
}
const source = program.getSourceFile(core)
if (!source) throw new Error('Contrato de objeto ausente.')
const object = source.statements.find(
  (n) => ts.isTypeAliasDeclaration(n) && n.name.text === 'PintaSceneObject',
)
if (!object) throw new Error('Tipo de objeto ausente.')
const checker = program.getTypeChecker()
const shape = checker.typeToString(
  checker.getTypeAtLocation(object),
  undefined,
  ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.InTypeAlias,
)
if (/import\(|\bz\./.test(shape))
  throw new Error('O objeto não saiu como um tipo estrutural portátil.')
entries['map-2d/pinta-scene-object.d.ts'] =
  header + 'export type PintaSceneObject = ' + shape + ';\n'
const lifecycleText = await readFile(
  path.join(root, 'packages/studio/src/extensions/types.ts'),
  'utf8',
)
const lifecycle = ts.createSourceFile(
  'types.ts',
  lifecycleText.replaceAll('\r\n', '\n'),
  ts.ScriptTarget.Latest,
  true,
)
const names = new Set([
  'ProjectRunContext',
  'ProjectRunScheduler',
  'ProjectRunTimeoutHandle',
  'ProjectRunIntervalHandle',
])
const selected = lifecycle.statements.filter(
  (n) => (ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) && names.has(n.name.text),
)
if (selected.length !== names.size) throw new Error('Contrato de ciclo de vida incompleto.')
entries['lifecycle.d.ts'] = header + selected.map((n) => n.getFullText(lifecycle)).join('\n') + '\n'
const output =
  JSON.stringify(
    Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b, 'en'))),
    null,
    2,
  ) + '\n'
const target = path.join(root, 'packages/studio/src/modes/pro/runtimeDeclarations.generated.json')
if (process.argv.includes('--check')) {
  if ((await readFile(target, 'utf8').catch(() => '')) !== output)
    throw new Error('Declarações Pro desatualizadas. Rode gen:pro-runtime-declarations.')
} else await writeFile(target, output)
console.log('Pro runtime declarations verified: ' + Object.keys(entries).length + ' files.')

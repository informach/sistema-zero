import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { gameTwoDRuntime } from '../runtime'

const RUNTIME_FILE = 'game-2d-runtime.generated.js'
const RUNTIME_CONTRACT_FILE = 'runtimeContract.ts'
const HOST_CONTRACT_FILE = 'game-2d-runtime-host.d.ts'
const RUNTIME_CONTRACT = readFileSync(join(import.meta.dir, '../runtimeContract.ts'), 'utf8')
const HOST_CONTRACT = `
type GameTwoDRuntimeApi = import('./runtimeContract').GameTwoDRuntimeApi

interface SZGameTileMapAssetMetadata {
  tilemap?: {
    grid?: string
    platform?: ArrayLike<number>
    solid?: ArrayLike<number>
    tileSize?: number
    tileset?: { dataUrl?: string }
  }
}

interface Window {
  SZGame2D: GameTwoDRuntimeApi
  SZGameUIFont: { family: string; install(): void }
  __SZProjectLifecycle?: {
    run(
      callback: (...args: never[]) => unknown,
      thisArg?: unknown,
      args?: unknown[],
    ): unknown
    endCallback(): void
  }
  __SZGAME_ASSETS?: Record<string, string>
  __SZGAME_ASSET_META?: Record<string, SZGameTileMapAssetMetadata>
  webkitAudioContext?: typeof AudioContext
}
`

function parameterNames(parameters: ts.NodeArray<ts.ParameterDeclaration>): string[] {
  return parameters.map((parameter) => parameter.name.getText())
}

function contractMethodSignatures(source: string): Map<string, string[]> {
  const file = ts.createSourceFile(
    RUNTIME_CONTRACT_FILE,
    source,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS,
  )
  const interfaces = new Map<string, ts.InterfaceDeclaration>()
  for (const statement of file.statements) {
    if (ts.isInterfaceDeclaration(statement)) interfaces.set(statement.name.text, statement)
  }

  const signatures = new Map<string, string[]>()
  const visited = new Set<string>()
  const collect = (name: string) => {
    if (visited.has(name)) return
    visited.add(name)
    const declaration = interfaces.get(name)
    if (!declaration) throw new Error(`interface ${name} ausente no contrato do Jogo 2D`)
    for (const heritage of declaration.heritageClauses ?? []) {
      for (const parent of heritage.types) {
        if (ts.isIdentifier(parent.expression)) collect(parent.expression.text)
      }
    }
    for (const member of declaration.members) {
      if (ts.isMethodSignature(member) && ts.isIdentifier(member.name)) {
        signatures.set(member.name.text, parameterNames(member.parameters))
      }
    }
  }
  collect('GameTwoDRuntimeApi')
  return signatures
}

function runtimeFunctionSignatures(source: string): Map<string, string[]> {
  const file = ts.createSourceFile(
    RUNTIME_FILE,
    source,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.JS,
  )
  const signatures = new Map<string, string[]>()
  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      signatures.set(node.name.text, parameterNames(node.parameters))
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return signatures
}

function runtimeSignatureMismatches(source: string): string[] {
  const expected = contractMethodSignatures(RUNTIME_CONTRACT)
  const actual = runtimeFunctionSignatures(source)
  const mismatches: string[] = []
  for (const [name, expectedParameters] of expected) {
    const actualParameters = actual.get(name)
    if (!actualParameters) {
      mismatches.push(`${name}: função ausente`)
      continue
    }
    if (actualParameters.join(',') !== expectedParameters.join(',')) {
      mismatches.push(
        `${name}: runtime (${actualParameters.join(', ')}) ≠ contrato (${expectedParameters.join(', ')})`,
      )
    }
  }
  return mismatches
}

function formatDiagnostic(diagnostic: ts.Diagnostic): string {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
  if (!diagnostic.file || diagnostic.start === undefined) return message
  const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
  return `${diagnostic.file.fileName}:${position.line + 1}:${position.character + 1} ${message}`
}

test('o runtime injetado não contém referências ou propriedades semanticamente inválidas', () => {
  const options: ts.CompilerOptions = {
    allowJs: true,
    checkJs: true,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
    module: ts.ModuleKind.ESNext,
    noEmit: true,
    noImplicitAny: false,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
  }
  const defaultHost = ts.createCompilerHost(options)
  const virtualSources = new Map([
    [RUNTIME_FILE, { source: gameTwoDRuntime, kind: ts.ScriptKind.JS }],
    [RUNTIME_CONTRACT_FILE, { source: RUNTIME_CONTRACT, kind: ts.ScriptKind.TS }],
    [HOST_CONTRACT_FILE, { source: HOST_CONTRACT, kind: ts.ScriptKind.TS }],
  ])
  const host: ts.CompilerHost = {
    ...defaultHost,
    fileExists: (fileName) => virtualSources.has(fileName) || defaultHost.fileExists(fileName),
    readFile: (fileName) => virtualSources.get(fileName)?.source ?? defaultHost.readFile(fileName),
    getSourceFile: (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
      const virtual = virtualSources.get(fileName)
      return virtual
        ? ts.createSourceFile(fileName, virtual.source, languageVersion, true, virtual.kind)
        : defaultHost.getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)
    },
  }
  const program = ts.createProgram(
    [HOST_CONTRACT_FILE, RUNTIME_CONTRACT_FILE, RUNTIME_FILE],
    options,
    host,
  )
  const errors = ts
    .getPreEmitDiagnostics(program)
    .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
    .map(formatDiagnostic)

  expect(errors).toEqual([])
}, 20_000)

test('as funções públicas mantêm a ordem de parâmetros do contrato TypeScript', () => {
  expect(runtimeSignatureMismatches(gameTwoDRuntime)).toEqual([])
})

test('a guarda de assinatura detecta uma troca de parâmetros', () => {
  const swapped = gameTwoDRuntime.replace(
    'function flyFree(sprite, speed)',
    'function flyFree(speed, sprite)',
  )

  expect(runtimeSignatureMismatches(swapped)).toContain(
    'flyFree: runtime (speed, sprite) ≠ contrato (sprite, speed)',
  )
})

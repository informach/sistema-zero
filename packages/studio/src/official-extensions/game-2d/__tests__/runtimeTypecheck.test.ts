import { expect, test } from 'bun:test'
import ts from 'typescript'
import { gameTwoDRuntime } from '../runtime'

const RUNTIME_FILE = 'game-2d-runtime.generated.js'
const HOST_CONTRACT_FILE = 'game-2d-runtime-host.d.ts'
const HOST_CONTRACT = `
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
  SZGame2D: unknown
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
  const program = ts.createProgram([HOST_CONTRACT_FILE, RUNTIME_FILE], options, host)
  const errors = ts
    .getPreEmitDiagnostics(program)
    .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
    .map(formatDiagnostic)

  expect(errors).toEqual([])
}, 20_000)

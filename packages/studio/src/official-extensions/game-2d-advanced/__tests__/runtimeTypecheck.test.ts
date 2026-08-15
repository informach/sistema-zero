import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { gameKitRuntime } from '../runtime'
import { GAME_KIT_ENUMERABLE_API_KEYS } from '../runtimeContract'

const RUNTIME_FILE = 'game-2d-advanced-runtime.generated.js'
const RUNTIME_CONTRACT_FILE = 'runtimeContract.ts'
const HOST_CONTRACT_FILE = 'game-2d-advanced-runtime-host.d.ts'
const RUNTIME_CONTRACT = readFileSync(join(import.meta.dir, '../runtimeContract.ts'), 'utf8')
const HOST_CONTRACT = `
type GameKitRuntimeApi = import('./runtimeContract').GameKitRuntimeApi

interface GameKitTilemapMetadata {
  dataUrl?: string
  grid?: string
  frontGrid?: string
  solid?: ArrayLike<number>
  platform?: ArrayLike<number>
  tileSize?: number
  tileset?: { dataUrl?: string }
}

interface Window {
  SZGameKit: GameKitRuntimeApi
  SZGameUIFont: { id: string; family: string; install(): void }
  __SZProjectLifecycle?: {
    run(callback: (...args: never[]) => unknown, thisArg?: unknown, args?: unknown[]): unknown
    endCallback(): void
  }
  __SZGAME_ASSETS?: Record<string, string>
  __SZGAME_SOUNDS?: Record<string, string>
  __SZGAME_ASSET_META?: Record<
    string,
    { tilemap?: GameKitTilemapMetadata; tileset?: GameKitTilemapMetadata }
  >
  __SZSTUDIO_RUNTIME_INSPECTORS?: Record<string, () => unknown>
  webkitAudioContext?: typeof AudioContext
}

interface HTMLAudioElement {
  _szgkSrc?: string
}
`

function parameterNames(parameters: ts.NodeArray<ts.ParameterDeclaration>): string[] {
  return parameters.map((parameter) => parameter.name.getText())
}

function knownContractSignatures(): Map<string, string[]> {
  const file = ts.createSourceFile(
    RUNTIME_CONTRACT_FILE,
    RUNTIME_CONTRACT,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS,
  )
  const declaration = file.statements.find(
    (statement): statement is ts.InterfaceDeclaration =>
      ts.isInterfaceDeclaration(statement) && statement.name.text === 'GameKitKnownApi',
  )
  if (!declaration) throw new Error('interface GameKitKnownApi ausente')
  return new Map(
    declaration.members.flatMap((member) =>
      ts.isMethodSignature(member) && ts.isIdentifier(member.name)
        ? [[member.name.text, parameterNames(member.parameters)] as const]
        : [],
    ),
  )
}

function publicRuntimeSignatures(source: string): Map<string, string[]> {
  const file = ts.createSourceFile(
    RUNTIME_FILE,
    source,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.JS,
  )
  const declarations = new Map<string, ts.FunctionDeclaration>()
  let apiObject: ts.ObjectLiteralExpression | undefined

  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name) declarations.set(node.name.text, node)
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText() === 'api' &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      apiObject = node.initializer
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  if (!apiObject) throw new Error('objeto público api ausente no runtime')

  const signatures = new Map<string, string[]>()
  for (const property of apiObject.properties) {
    if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) continue
    const guarded = property.initializer
    if (!ts.isCallExpression(guarded) || guarded.arguments.length < 2) continue
    const implementation = guarded.arguments[1]
    if (!implementation) continue
    if (ts.isFunctionExpression(implementation) || ts.isArrowFunction(implementation)) {
      signatures.set(property.name.text, parameterNames(implementation.parameters))
    } else if (ts.isIdentifier(implementation)) {
      const declaration = declarations.get(implementation.text)
      if (declaration) signatures.set(property.name.text, parameterNames(declaration.parameters))
    }
  }

  // runProject é não enumerável, mas também faz parte do contrato público.
  const runProject = declarations.get('runProject')
  if (runProject) signatures.set('runProject', parameterNames(runProject.parameters))
  return signatures
}

function runtimeSignatureMismatches(source: string): string[] {
  const actual = publicRuntimeSignatures(source)
  const mismatches: string[] = []
  for (const [name, expectedParameters] of knownContractSignatures()) {
    const actualParameters = actual.get(name)
    if (!actualParameters) {
      mismatches.push(`${name}: implementação pública ausente`)
    } else if (actualParameters.join(',') !== expectedParameters.join(',')) {
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

test('o inventário canônico não tem chaves repetidas', () => {
  expect(new Set(GAME_KIT_ENUMERABLE_API_KEYS).size).toBe(GAME_KIT_ENUMERABLE_API_KEYS.length)
})

/** Conta parâmetros de TODA função do runtime composto (o molde é o do irmão g2d). */
function runtimeFunctionParameterCount(source: string): number {
  const file = ts.createSourceFile(
    'gk-runtime.js',
    source,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.JS,
  )
  let count = 0
  const visit = (node: ts.Node) => {
    if (ts.isFunctionLike(node)) count += node.parameters.length
    ts.forEachChild(node, visit)
  }
  visit(file)
  return count
}

test('a dívida de parâmetros JS sem tipo não pode crescer', () => {
  // Catraca NOVA na gk (o irmão g2d tem a dele desde 07/2026, hoje em 1141).
  // Valor inicial = a medição de hoje, SEM folga: folga é catraca que não cobra.
  //
  // ⚠️ Ela é a única rede ESTRUTURAL da gk sobre a superfície que a checagem de
  // assinatura não alcança: o GameKitKnownApi declara 110 dos 383 métodos
  // enumeráveis, e os outros 273 caem no GameKitFallbackMethod pelo tipo mapeado.
  // Ou seja, o teste logo acima cobre 29% da API — ler o verde dele como "a API
  // está guardada" é o erro que esta catraca existe para dificultar.
  //
  // 1126 → 1127: o `zerar` da porta de diagnóstico de desempenho
  // (`game-2d-advanced:perf`), que só o HOST enxerga. Único parâmetro somado
  // pela sonda de trabalho — o inspetor da campanha não tem nenhum.
  //
  // 1127 → 1135: os consertos do motor da campanha, contados um a um —
  // `proTileBlocks(ch)` 1, `proTileSupports(ch)` 1, `proDefeatEnemy(entity)` 1,
  // `proGroundEntity(entity, dt)` 2 e `proShellContact(entity, pisada, hero)` 3.
  //
  // 1135 → 1136: o lote de desempenho. `drawDebugBox(e)` e `_mapCols(m)` somam
  // dois, e o `boxOf(e)` que era closure DENTRO do overlay (uma nova por quadro)
  // sumiu, devolvendo um. Saldo +1 — subir a catraca num lote de desempenho é
  // legítimo, desde que a conta esteja escrita.
  //
  // 1136 → 1145: o índice espacial do "para cada par". `_shapeLeft/_shapeTop/
  // _shapeRight/_shapeBottom` somam 4, `_buildOverlapIndex(lista)` 1,
  // `_overlapCandidates(indice, a)` 2 e o comparador `(x, y)` da ordenação 2.
  expect(runtimeFunctionParameterCount(gameKitRuntime)).toBeLessThanOrEqual(1145)
})

test('as assinaturas centrais mantêm nomes e ordem dos parâmetros do contrato', () => {
  expect(runtimeSignatureMismatches(gameKitRuntime)).toEqual([])
})

test('a guarda de assinatura detecta uma troca de parâmetros', () => {
  const swapped = gameKitRuntime.replace(
    'function moveWithKeys(c, dt)',
    'function moveWithKeys(dt, c)',
  )
  expect(runtimeSignatureMismatches(swapped)).toContain(
    'moveWithKeys: runtime (dt, c) ≠ contrato (c, dt)',
  )
})

test('o runtime injetado passa pela análise semântica do TypeScript', () => {
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
    [RUNTIME_FILE, { source: gameKitRuntime, kind: ts.ScriptKind.JS }],
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

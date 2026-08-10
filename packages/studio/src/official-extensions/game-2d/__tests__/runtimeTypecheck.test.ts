import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { gameTwoDRuntime } from '../runtime'

const RUNTIME_FILE = 'game-2d-runtime.generated.js'
const BROKEN_RUNTIME_FILE = 'game-2d-runtime.broken.generated.js'
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
  // Sons do projeto, do mesmo bridge das imagens. Opcional porque o mapa não é
  // semeado quando o projeto não tem nenhum arquivo de áudio.
  __SZGAME_SOUNDS?: Record<string, string>
  webkitAudioContext?: typeof AudioContext
}
`
const COMPILER_OPTIONS: ts.CompilerOptions = {
  allowJs: true,
  checkJs: true,
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
  module: ts.ModuleKind.ESNext,
  noEmit: true,
  // O runtime histórico ainda não anota todos os parâmetros. As demais opções
  // de strict ficam ligadas, e uma catraca estrutural abaixo impede aumentar
  // esse débito silenciosamente.
  noImplicitAny: false,
  skipLibCheck: true,
  strict: true,
  target: ts.ScriptTarget.ES2022,
}
const DEFAULT_COMPILER_HOST = ts.createCompilerHost(COMPILER_OPTIONS)

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

function compileRuntimeVariants(variants: ReadonlyMap<string, string>): Map<string, string[]> {
  const virtualSources = new Map([
    ...[...variants].map(
      ([fileName, source]) =>
        [fileName, { source: `${source}\nexport {}`, kind: ts.ScriptKind.JS }] as const,
    ),
    [RUNTIME_CONTRACT_FILE, { source: RUNTIME_CONTRACT, kind: ts.ScriptKind.TS }],
    [HOST_CONTRACT_FILE, { source: HOST_CONTRACT, kind: ts.ScriptKind.TS }],
  ])
  const host: ts.CompilerHost = {
    ...DEFAULT_COMPILER_HOST,
    fileExists: (fileName) =>
      virtualSources.has(fileName) || DEFAULT_COMPILER_HOST.fileExists(fileName),
    readFile: (fileName) =>
      virtualSources.get(fileName)?.source ?? DEFAULT_COMPILER_HOST.readFile(fileName),
    getSourceFile: (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
      const virtual = virtualSources.get(fileName)
      return virtual
        ? ts.createSourceFile(fileName, virtual.source, languageVersion, true, virtual.kind)
        : DEFAULT_COMPILER_HOST.getSourceFile(
            fileName,
            languageVersion,
            onError,
            shouldCreateNewSourceFile,
          )
    },
  }
  const variantFiles = [...variants.keys()]
  const program = ts.createProgram(
    [HOST_CONTRACT_FILE, RUNTIME_CONTRACT_FILE, ...variantFiles],
    COMPILER_OPTIONS,
    host,
  )
  const errorsByFile = new Map(variantFiles.map((fileName) => [fileName, [] as string[]]))
  const sharedErrors: string[] = []
  for (const diagnostic of ts
    .getPreEmitDiagnostics(program)
    .filter((item) => item.category === ts.DiagnosticCategory.Error)) {
    const formatted = formatDiagnostic(diagnostic)
    const bucket = diagnostic.file ? errorsByFile.get(diagnostic.file.fileName) : undefined
    if (bucket) bucket.push(formatted)
    else sharedErrors.push(formatted)
  }
  if (sharedErrors.length > 0) {
    for (const errors of errorsByFile.values()) errors.push(...sharedErrors)
  }
  return errorsByFile
}

let cachedRuntimeTypeErrors: Map<string, string[]> | undefined
function runtimeTypeErrors(fileName: string): string[] {
  cachedRuntimeTypeErrors ??= compileRuntimeVariants(
    new Map([
      [RUNTIME_FILE, gameTwoDRuntime],
      [BROKEN_RUNTIME_FILE, gameTwoDRuntime.replace('_hitboxOf(a)', '_missingHitboxOf(a)')],
    ]),
  )
  return cachedRuntimeTypeErrors.get(fileName) ?? [`resultado ausente para ${fileName}`]
}

function runtimeFunctionParameterCount(source: string): number {
  const file = ts.createSourceFile(
    RUNTIME_FILE,
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

test('o runtime injetado não contém referências ou propriedades semanticamente inválidas', () => {
  expect(runtimeTypeErrors(RUNTIME_FILE)).toEqual([])
}, 20_000)

test('o typecheck do arquivo composto detecta dependência interna ausente', () => {
  expect(
    runtimeTypeErrors(BROKEN_RUNTIME_FILE).some((error) => error.includes('_missingHitboxOf')),
  ).toBe(true)
}, 20_000)

test('a dívida de parâmetros JS sem tipo não pode crescer', () => {
  // 856 → 868: os 12 parâmetros do áudio de arquivo (loadSound/_startClip/
  // _requestClip/playClip/stopClip/playTrack/setSoundVolume/_clipKey).
  // 869 → 881: os 12 da animação de uma vez (_startAnimation/playAnimationOnce/
  // animationEnded).
  // 881 → 884: os 3 do atirador de lado (_enemySideShootAct).
  // 884 → 896: os 12 da VISTA de todos os inimigos (registrar, guardas,
  // encaminhamentos e o proxy que defende a lista derivada).
  // 896 → 893: a catraca DESCEU. Os três modos do perseguidor passaram a ser três
  // linhas da mesma função na tabela de eixos, e o _enemyTrackMove (o só-X
  // escrito à mão) saiu. Baixar o número em vez de deixar a folga é o que mantém
  // a catraca cobrando de verdade.
  // 893 → 907: +14 parâmetros intencionais para o contrato de apoio do quadro,
  // transporte por plataforma móvel, salto centralizado e plataformas de mão
  // única. São funções de runtime exercitadas pelos testes de clareza de movimento.
  // 907 → 995: +88 parâmetros dos contratos explícitos de layout de mapa,
  // Mundo, câmera configurável e Fase. O último é do reset central que também
  // inicializa corretamente os modos reversos; baixar este teto continua
  // obrigatório quando uma refatoração remover parâmetros.
  // 995 → 1028: +33 dos contratos de movimento varrido, índice espacial do
  // terreno, palco lógico responsivo e mapas encaixados. O teto é o valor
  // medido, sem folga: qualquer parâmetro novo continua quebrando a catraca.
  expect(runtimeFunctionParameterCount(gameTwoDRuntime)).toBeLessThanOrEqual(1028)
})

test('volume ZERO deixa mudo de verdade (não cai em fallback)', () => {
  // ⚠️ Defeito real (revisão de 08/2026): `setSoundVolume` usava
  // `_positiveFiniteNumber`, que só aceita `> 0`. O zero caía no fallback 8 e
  // "pôr o volume em 0" deixava o som em 80% — o OPOSTO do que o bloco promete,
  // justo no valor que a criança mais tenta (o rótulo diz "0 (mudo)").
  // Guarda de FONTE porque avaliar o runtime inteiro custaria caro aqui; o
  // comportamento equivalente é exercitado em `preview/__tests__/audioBridge`.
  const inicio = gameTwoDRuntime.indexOf('function setSoundVolume')
  expect(inicio).toBeGreaterThan(-1)
  // Sem os comentários: o próprio aviso que explica o defeito CITA o helper
  // proibido, e a guarda tropeçaria nele em vez de no código.
  const corpo = gameTwoDRuntime
    .slice(inicio, inicio + 700)
    .split('\n')
    .filter((linha) => !linha.trim().startsWith('//'))
    .join('\n')
  expect(corpo).not.toContain('_positiveFiniteNumber')
  expect(corpo).toContain('Math.max(0,')
})

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

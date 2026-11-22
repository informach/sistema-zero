/**
 * Organiza os exemplos Python em blocos pelas áreas do projeto (lote 6 das áreas, 22/11/2026),
 * pelo MESMO caminho do editor: projeta o `main.py`, monta os blocos nas áreas, organiza
 * (`organizePythonWorkspace`, só o que não muda o programa) e grava pela transação visual, que
 * escreve os comentários de área. A análise é a do Estúdio (`analyzer.py`) no CPython local 3.13+.
 *
 *     bun scripts/python/organize-examples.ts [--check] [--family pgzero|raylib|turtle|pygame] [--game <key>]
 *         [--out <pasta>]
 *
 * `--out` grava os arquivos organizados numa pasta à parte (mesmos caminhos), sem mexer nos
 * exemplos: eles só mudam junto com a requalificação dos recibos.
 *
 * Os blocos são os da versão final (todas as capacidades do motor ligadas). O relatório diz, por
 * jogo, se o arquivo mudou e quantas linhas ficaram fora da área delas (com o motivo).
 */
import assert from 'node:assert/strict'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { STUDIO_PYTHON_RUNTIME_FEATURES } from '@sistemazero/core/studio/python-runtime-features'
import * as Blockly from 'blockly/core'
import { PGZERO_GAMES } from '../../src/examples/python/pgzeroGames.manifest'
import { PYGAME_GAMES } from '../../src/examples/python/pygameGames.manifest'
import { RAYLIB_GAMES } from '../../src/examples/python/raylibGames.manifest'
import { VISUAL_REFERENCE_GAMES } from '../../src/examples/python/visualReferenceGames.manifest'
import { organizePythonWorkspace, pythonAreaNoteText } from '../../src/python/blocks/areaOrganize'
import {
  analyzePythonModuleAreas,
  type PythonAreaContext,
  pythonDisplayAreas,
} from '../../src/python/blocks/areas'
import { orderPythonAuthoringCodecs } from '../../src/python/blocks/authoring'
import { pythonVisualToWorkspace, pythonWorkspaceToVisual } from '../../src/python/blocks/blockly'
import type { PythonBlockCodec } from '../../src/python/blocks/contract'
import { type PythonVisualNode, pythonASTToVisual } from '../../src/python/blocks/projection'
import { pythonProjectModules } from '../../src/python/blocks/projectModules'
import { bindPythonVisualOrigins } from '../../src/python/blocks/provenance'
import {
  attachPythonResolverOptions,
  pythonResolverOptionsOf,
} from '../../src/python/blocks/resolverOptions'
import type { PythonProjectModules, PythonResolverOptions } from '../../src/python/blocks/scope'
import { orderPythonWorkspaceRoots } from '../../src/python/blocks/workspacePresentation'
import {
  PGZERO_RESOLVER_OPTIONS,
  PYTHON_PGZERO_CODECS,
} from '../../src/python/extensions/pgzero/catalog'
import { PYTHON_PYGAME_CODECS } from '../../src/python/extensions/pygame/catalog'
import {
  PYTHON_RAYLIB_2D_CODECS,
  RAYLIB_RESOLVER_OPTIONS,
} from '../../src/python/extensions/raylib2d/catalog'
import { PYTHON_RAYLIB_3D_CODECS } from '../../src/python/extensions/raylib3d/catalog'
import {
  PYTHON_TURTLE_CODECS,
  TURTLE_STAR_EXPORTS,
} from '../../src/python/extensions/turtle/catalog'
import { indexPythonSourceLines } from '../../src/python/language/sourceLines'
import { pythonStatementLines } from '../../src/python/language/statementMoves'
import type {
  PythonAnalysisIdentity,
  PythonNode,
  PythonParsedDocument,
} from '../../src/python/language/types'
import { preparePythonVisualTransaction } from '../../src/python/language/visualTransaction'
import { pythonOfficialModulesFor } from '../../src/python/officialModules'
import { PYGAME_EXTENSION } from '../../src/runtime/python/pygame/contract'
import type { VisualExampleEdit } from './visual-example-qualification'

const studio = resolve(import.meta.dirname, '../..')
const DRIVER = resolve(studio, 'src/python/blocks/areas.differential.py')
const args = process.argv.slice(2)
const option = (name: string) => {
  const at = args.indexOf(`--${name}`)
  return at < 0 ? undefined : args[at + 1]
}
const check = args.includes('--check')
const onlyFamily = option('family')
const onlyGame = option('game')
const out = option('out')

// O analisador do Estúdio usa `ast.parse(..., optimize=0)`: Python 3.13+ (o do Pyodide).
const python = ['python3', 'python'].find((command) => {
  try {
    const probe = Bun.spawnSync([command, '-c', 'import sys; print(sys.version_info >= (3, 13))'])
    return probe.exitCode === 0 && probe.stdout.toString().trim() === 'True'
  } catch {
    return false
  }
})
assert.ok(python, 'Organizar os exemplos exige Python 3.13+ no PATH.')

function service(request: Record<string, unknown>) {
  const result = Bun.spawnSync([python!, '-I', DRIVER], {
    stdin: new TextEncoder().encode(JSON.stringify({ op: 'service', request })),
  })
  if (result.exitCode !== 0) throw new Error(result.stderr.toString())
  return JSON.parse(result.stdout.toString())
}
const identity = (path: string, generation: number): PythonAnalysisIdentity => ({
  projectId: 'exemplo',
  instanceId: 'organizar',
  path,
  revision: 'a'.repeat(64),
  generation,
})
const analysis = {
  async parse(id: PythonAnalysisIdentity, source: string): Promise<PythonParsedDocument> {
    const result = service({ operation: 'parse', path: id.path, source, compilable: true })
    if (!result.ok) throw new Error(result.message)
    return {
      version: 1,
      language: 'python',
      identity: id,
      source,
      tree: result.tree,
      tokens: result.tokens,
      diagnostics: result.diagnostics,
    }
  },
  async render(node: PythonNode) {
    const result = service({ operation: 'render', node })
    if (!result.ok) throw new Error(result.message)
    return result.source as string
  },
}

/** Os blocos de uma extensão na versão final (todas as capacidades), como o editor os carrega. */
function codecsOf(extension: readonly PythonBlockCodec[], options: PythonResolverOptions) {
  return attachPythonResolverOptions(
    orderPythonAuthoringCodecs(extension, STUDIO_PYTHON_RUNTIME_FEATURES),
    options,
  )
}
const TURTLE = codecsOf(PYTHON_TURTLE_CODECS, {
  starExports: new Map([['turtle', TURTLE_STAR_EXPORTS]]),
})
const PGZERO = codecsOf(PYTHON_PGZERO_CODECS, PGZERO_RESOLVER_OPTIONS)
const RAYLIB_2D = codecsOf(PYTHON_RAYLIB_2D_CODECS, RAYLIB_RESOLVER_OPTIONS)
const RAYLIB_3D = codecsOf(PYTHON_RAYLIB_3D_CODECS, RAYLIB_RESOLVER_OPTIONS)
const PYGAME = codecsOf(PYTHON_PYGAME_CODECS, {})
/** Onde moram as edições de qualificação de cada família (o Pygame-ce não tem recibo de blocos). */
const FIXTURE_DIRECTORIES: Partial<Record<Example['family'], string>> = {
  turtle: 'visual-reference-games',
  pgzero: 'pgzero-games',
  raylib: 'raylib-games',
}

interface Example {
  family: 'turtle' | 'pgzero' | 'raylib' | 'pygame'
  key: string
  path: string
  codecs: readonly PythonBlockCodec[]
  modules: readonly string[]
  /** Pygame-ce: o jogo tem vários arquivos, e o editor lê o projeto inteiro. */
  project?: {
    officialModules: ReadonlySet<string>
    projectModules: PythonProjectModules
    moduleNames: ReadonlySet<string>
  }
}

/** Os arquivos de um jogo (pastas e arquivos de dados dão forma aos módulos, como no editor). */
async function projectFiles(folder: string): Promise<string[]> {
  const files: string[] = []
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (entry.name === '__pycache__' || entry.name.startsWith('.')) continue
    const path = join(folder, entry.name)
    if (entry.isDirectory()) files.push(...(await projectFiles(path)))
    else files.push(path)
  }
  return files.sort()
}

/** Cada `.py` de um jogo Pygame-ce, com o projeto inteiro lido como o editor lê. */
async function pygameExamples(key: string): Promise<Example[]> {
  const folder = resolve(studio, 'src/examples/python/pygame', key)
  const paths = (await projectFiles(folder)).map((file) =>
    relative(folder, file).replaceAll('\\', '/'),
  )
  const trees = new Map<string, PythonNode>()
  for (const path of paths.filter((item) => item.endsWith('.py'))) {
    const source = (await readFile(join(folder, path), 'utf8')).replaceAll('\r\n', '\n')
    const document = await analysis.parse(identity(path, 1), source)
    assert.ok(document.tree, `${key}/${path}: não analisa`)
    trees.set(path, document.tree)
  }
  const project = {
    officialModules: pythonOfficialModulesFor({
      paths,
      entrypoint: 'main.py',
      extensionIds: [PYGAME_EXTENSION.id],
    }),
    projectModules: pythonProjectModules({
      paths,
      trees,
      entrypoint: 'main.py',
      starExports: pythonResolverOptionsOf(PYGAME).starExports,
    }),
    moduleNames: new Set([...trees.keys()].map((path) => path.slice(0, -3).split('/')[0]!)),
  }
  return [...trees.keys()].map((path) => ({
    family: 'pygame' as const,
    key: `${key}/${path}`,
    path: join(folder, path),
    codecs: PYGAME,
    modules: ['pygame'],
    project,
  }))
}
const examples: Example[] = [
  ...VISUAL_REFERENCE_GAMES.map((game) => ({
    family: 'turtle' as const,
    key: game.key,
    path: resolve(studio, 'src/examples/python', game.key, 'main.py'),
    codecs: TURTLE,
    modules: ['turtle', 'formas_do_pinta'],
  })),
  ...PGZERO_GAMES.map((game) => ({
    family: 'pgzero' as const,
    key: game.key,
    path: resolve(studio, 'src/examples/python/pgzero', game.key, 'main.py'),
    codecs: PGZERO,
    modules: ['pgzero', 'pgzrun', 'pygame'],
  })),
  ...RAYLIB_GAMES.map((game) => ({
    family: 'raylib' as const,
    key: game.key,
    path: resolve(studio, 'src/examples/python/raylib', game.key, 'main.py'),
    codecs: game.extension === '3d' ? RAYLIB_3D : RAYLIB_2D,
    modules: ['pyray', 'raylib'],
  })),
]

/**
 * A posição nova de cada linha de topo, pelo texto dela (organizar só muda a ordem e os
 * comentários de área; o texto de cada linha fica igual). Linhas de texto repetido casam na
 * ordem em que aparecem.
 */
function statementPositions(before: PythonParsedDocument, after: PythonParsedDocument) {
  const texts = (document: PythonParsedDocument) =>
    ((document.tree?.fields.body as PythonNode[] | undefined) ?? []).map((node) =>
      node.range ? document.source.slice(node.range.start, node.range.end) : '',
    )
  const old = texts(before)
  const now = texts(after)
  const used = new Set<number>()
  return old.map((text) => {
    const index = now.findIndex((candidate, position) => candidate === text && !used.has(position))
    assert.ok(index >= 0, `Linha de topo sumiu ao organizar: ${text.slice(0, 60)}`)
    used.add(index)
    return index
  })
}

/** O arquivo organizado pelo caminho do editor, e as linhas que ficaram fora da área delas. */
export async function organizeExampleSource(source: string, path: string, example: Example) {
  const document = await analysis.parse(identity(path, 1), source)
  assert.ok(document.tree && !document.diagnostics.length, `${example.key}: não analisa`)
  const tree = document.tree
  const officialModules =
    example.project?.officialModules ?? new Set(['math', 'random', ...example.modules])
  const projection = pythonASTToVisual(tree, {
    codecs: example.codecs,
    officialModules,
    ...(example.project ? { projectModules: example.project.projectModules } : {}),
  })
  const context: PythonAreaContext = {
    starExports: pythonResolverOptionsOf(example.codecs).starExports,
    ...(example.project ? { projectModules: example.project.moduleNames } : {}),
  }
  const areas = pythonDisplayAreas(
    analyzePythonModuleAreas(
      tree,
      projection.body.map((value) => (value.kind === 'block' ? value.codecId : undefined)),
      context,
    ).statements,
  )
  const ws = new Blockly.Workspace()
  try {
    Blockly.Events.disable()
    let rootIds: string[]
    try {
      rootIds = pythonVisualToWorkspace(projection, ws, example.codecs, { areas })
    } finally {
      Blockly.Events.enable()
    }
    const typeIgnores = (tree.fields.type_ignores as PythonNode[]) ?? []
    const origins = bindPythonVisualOrigins(
      pythonWorkspaceToVisual(ws, rootIds, typeIgnores, example.codecs),
      tree,
      example.codecs,
    )
    const lines = indexPythonSourceLines(source)
    const { notes } = organizePythonWorkspace(ws, example.codecs, {
      context,
      movable: (block) => {
        const node = origins.get(block.id)
        return !node || !!pythonStatementLines(document, node, lines)
      },
    })
    const roots = orderPythonWorkspaceRoots(ws, origins, rootIds)
    const result = await preparePythonVisualTransaction({
      document,
      projection: pythonWorkspaceToVisual(ws, roots, typeIgnores, example.codecs, origins),
      codecs: example.codecs,
      nextIdentity: identity(path, 2),
      current: () => ({ identity: document.identity, source }),
      analysis,
    })
    return {
      source: result.parsed.source,
      notes: notes.map((note) => pythonAreaNoteText(note).replace(/\n/g, ' ')),
      moved: statementPositions(document, result.parsed),
    }
  } finally {
    ws.dispose()
  }
}

if (import.meta.main) {
  const changed: string[] = []
  let outside = 0
  // Pygame-ce: um exemplo por arquivo `.py` do jogo (`--game pong` pega todos os do Pong).
  if (!onlyFamily || onlyFamily === 'pygame')
    for (const game of PYGAME_GAMES)
      if (!onlyGame || onlyGame === game.key) examples.push(...(await pygameExamples(game.key)))
  for (const example of examples) {
    if (onlyFamily && example.family !== onlyFamily) continue
    const gameKey = example.family === 'pygame' ? example.key.split('/')[0] : example.key
    if (onlyGame && gameKey !== onlyGame) continue
    // A galeria do Pygame-ce empacota o texto com LF.
    const source = (await readFile(example.path, 'utf8')).replaceAll('\r\n', '\n')
    const {
      source: organized,
      notes,
      moved,
    } = await organizeExampleSource(source, example.path, example)
    // As edições de qualificação apontam a linha de topo pela posição: vão junto (passo 4).
    const fixtures = FIXTURE_DIRECTORIES[example.family]
    if (fixtures && organized !== source && !check) {
      const fixturePath = resolve(
        import.meta.dirname,
        'fixtures',
        fixtures,
        `${example.key}.edits.json`,
      )
      const edits = JSON.parse(await readFile(fixturePath, 'utf8')) as {
        path: { body: number }
      }[]
      const remapped = edits.map((edit) => ({
        ...edit,
        path: { ...edit.path, body: moved[edit.path.body]! },
      }))
      // O caminho novo cai no mesmo bloco, com o mesmo valor de antes.
      const organizedDocument = await analysis.parse(identity(example.path, 3), organized)
      const projection = pythonASTToVisual(organizedDocument.tree!, {
        codecs: example.codecs,
        officialModules: new Set(['math', 'random', ...example.modules]),
      })
      for (const edit of remapped as unknown as VisualExampleEdit[]) {
        let node: PythonVisualNode | undefined = projection.body[edit.path.body]
        for (const step of edit.path.inputs ?? [])
          node =
            node?.kind === 'block'
              ? node.inputs.find((input) => input.name === step.name)?.nodes[step.index]
              : undefined
        const field =
          node?.kind === 'block' ? node.fields.find((item) => item.name === edit.field) : undefined
        assert.ok(
          node?.kind === 'block' && node.codecId === edit.codecId && field?.value === edit.before,
          `${example.key}: a edição "${edit.label}" não acha o bloco depois de organizar`,
        )
      }
      const target = out ? resolve(out, fixturePath.slice(studio.length + 1)) : fixturePath
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, `${JSON.stringify(remapped, null, 2)}\n`)
    }
    outside += notes.length
    const status = organized === source ? 'igual' : check ? 'MUDARIA' : 'organizado'
    console.log(
      `${example.family}/${example.key}: ${status}${notes.length ? `, ${notes.length} fora da área` : ''}`,
    )
    for (const note of notes) console.log(`    ${note}`)
    if (organized === source) continue
    changed.push(`${example.family}/${example.key}`)
    if (check) continue
    if (!out) await writeFile(example.path, organized)
    else {
      const target = resolve(out, example.path.slice(studio.length + 1))
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, organized)
    }
  }
  console.log(
    `\n${changed.length} ${check ? 'mudariam' : 'organizados'}; ${outside} linhas fora da área delas.`,
  )
  if (check && changed.length) process.exit(1)
}

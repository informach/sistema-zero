/**
 * Every Python file of every Pygame-ce gallery game must open in Blocks: no opaque node, and
 * blocks → code gives back the same program. Writes the block ids each game needs.
 *
 * bun scripts/python/pygame-block-coverage.ts [game…] [--check]
 * Parsing uses the Studio's own analyzer on a desktop CPython (PYTHON env var, default `py -3.14`).
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { canonicalJson } from '@sistemazero/core/creations'
import { formatGeneratedSource } from '../../../../scripts/format-generated-source'
import { PYGAME_GAMES } from '../../src/examples/python/pygameGames.manifest'
import { PYTHON_PROGRAMMING_CODECS } from '../../src/python/blocks/catalog'
import { pythonSemanticTree } from '../../src/python/blocks/nodes'
import {
  type PythonVisualNode,
  pythonASTToVisual,
  pythonVisualToAST,
} from '../../src/python/blocks/projection'
import { pythonProjectModules } from '../../src/python/blocks/projectModules'
import {
  attachPythonResolverOptions,
  pythonResolverOptionsOf,
} from '../../src/python/blocks/resolverOptions'
import { PYTHON_PYGAME_CODECS } from '../../src/python/extensions/pygame/catalog'
import type { PythonNode } from '../../src/python/language/types'
import { pythonOfficialModulesFor } from '../../src/python/officialModules'
import { PYGAME_EXTENSION } from '../../src/runtime/python/pygame/contract'

const studio = join(import.meta.dirname, '../..')
const root = join(studio, 'src/examples/python/pygame')
const [python, ...pythonArgs] = (process.env.PYTHON ?? 'py -3.14').split(' ')
const codecs = attachPythonResolverOptions(
  [...PYTHON_PYGAME_CODECS, ...PYTHON_PROGRAMMING_CODECS],
  {},
)
const chosen = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))
const coverage: Record<string, { sourceSha256: string; blockIds: string[] }> = {}

/** Every file of the game: directories and data files shape the module paths, as in the editor. */
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

// Named games may be checked before they enter the manifest (while being ported).
for (const game of chosen.length ? chosen : PYGAME_GAMES.map(({ key }) => key)) {
  const used = new Set<string>()
  const digest = createHash('sha256')
  let failed = false
  const folder = join(root, game)
  const paths = (await projectFiles(folder)).map((file) =>
    relative(folder, file).replaceAll('\\', '/'),
  )
  // Every module is parsed first: `from settings import *` is understood from settings.py
  // itself, by the same pure function the editor uses.
  const trees = new Map<string, PythonNode>()
  for (const path of paths.filter((path) => path.endsWith('.py'))) {
    const parsed = spawnSync(
      python!,
      [...pythonArgs, join(import.meta.dirname, 'pygame-source-ast.py'), game, path],
      {
        encoding: 'utf8',
        maxBuffer: 256 * 1024 * 1024,
      },
    )
    if (parsed.status !== 0) throw new Error(parsed.stderr || parsed.stdout)
    trees.set(path, JSON.parse(parsed.stdout) as PythonNode)
  }
  // The editor's own rule for a Pygame-ce project: a module the game ships shadows the official one.
  const officialModules = pythonOfficialModulesFor({
    paths,
    entrypoint: 'main.py',
    extensionIds: [PYGAME_EXTENSION.id],
  })
  const projectModules = pythonProjectModules({
    paths,
    trees,
    entrypoint: 'main.py',
    starExports: pythonResolverOptionsOf(codecs).starExports,
  })
  for (const [path, tree] of trees) {
    // The same text the gallery packs (scripts/generate-pygame-games.ts normalizes line ends).
    const source = (await readFile(join(folder, path), 'utf8')).replaceAll('\r\n', '\n')
    digest.update(`${path}\0${source}\0`)
    const projection = pythonASTToVisual(tree, {
      codecs,
      officialModules,
      projectModules,
    })
    const opaque: string[] = []
    function visit(nodes: PythonVisualNode[]) {
      for (const item of nodes) {
        if (item.kind === 'source')
          opaque.push(
            item.node.range
              ? source.slice(item.node.range.start, item.node.range.end)
              : item.node.kind,
          )
        else {
          used.add(item.codecId)
          for (const input of item.inputs) visit(input.nodes)
        }
      }
    }
    visit(projection.body)
    const same =
      canonicalJson(pythonSemanticTree(pythonVisualToAST(projection, codecs))) ===
      canonicalJson(pythonSemanticTree(tree))
    if (opaque.length || !same) {
      failed = true
      console.log(JSON.stringify({ game, file: path, same, opaque: opaque.slice(0, 30) }, null, 2))
    }
  }
  if (failed) process.exitCode = 1
  coverage[game] = { sourceSha256: digest.digest('hex'), blockIds: [...used].sort() }
  console.log(
    `${game}: ${failed ? 'NÃO abre em Blocos' : 'abre em Blocos'} (${used.size} tipos de bloco)`,
  )
}

if (!process.exitCode && !chosen.length) {
  const output = join(studio, 'src/examples/python/pygameGames.blocks.generated.ts')
  const contents = await formatGeneratedSource(
    `// Gerado por scripts/python/pygame-block-coverage.ts. Não edite este arquivo.\nexport const PYGAME_GAME_BLOCKS: Readonly<Record<string, { sourceSha256: string; blockIds: readonly string[] }>> = ${JSON.stringify(coverage, null, 2)}\n`,
    output,
    studio,
  )
  if (process.argv.includes('--check')) {
    if ((await readFile(output, 'utf8').catch(() => '')) !== contents)
      throw new Error('Metadados de blocos Pygame-ce desatualizados.')
  } else await writeFile(output, contents)
}

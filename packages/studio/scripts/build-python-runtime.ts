import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { canonicalJson } from '@sistemazero/core/creations'
import { StudioPythonDistributionSchema } from '@sistemazero/core/studio/python-runtime-distribution'
import { TURTLE_MODULE_FILES } from '../src/runtime/python/turtle/contract'
import vendor from '../src/runtime/python/vendor-manifest.json'
import { PYODIDE_VERSION, PYTHON_VERSION } from '../src/runtime/python/versions'
import { derivePythonBootLoaders } from './python/derive-boot-loaders'
import {
  createPythonHTTPRepresentations,
  PYTHON_HTTP_COMPRESSION_RECIPE,
} from './python/http-representations'
import { preparePythonStandardLibrary } from './python/prepare-stdlib'

const root = resolve(import.meta.dirname, '../../..')
const digest = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex')

/** Produces immutable worker artifacts; qualification/catalog activation is a separate gate. */
export async function buildPythonRuntimeDistribution(
  options: {
    vendorDirectory?: string
    outputDirectory?: string
    /** Build-time qualification input only; never a project or HTTP supplied URL. */
    standardLibrary?: { path: string; sha256: string; recipe: string }
  } = {},
) {
  if (vendor.pythonVersion !== PYTHON_VERSION || vendor.pyodideVersion !== PYODIDE_VERSION)
    throw new Error('As versões do compilador e da distribuição Python não correspondem.')
  const vendorDirectory = resolve(
    options.vendorDirectory ?? `${root}/.cache/studio-python-runtime/vendor`,
  )
  const outputDirectory = resolve(
    options.outputDirectory ?? `${root}/.cache/studio-python-runtime/distributions`,
  )
  await mkdir(vendorDirectory, { recursive: true })
  const contents = new Map<string, Uint8Array>()
  for (const file of vendor.files) {
    const target = resolve(vendorDirectory, file.path)
    let bytes: Uint8Array
    try {
      bytes = new Uint8Array(await readFile(target))
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
        throw error
      const response = await fetch(file.url, {
        redirect: 'error',
        signal: AbortSignal.timeout(60_000),
      })
      if (!response.ok) throw new Error(`Falha ao obter ${file.path}: HTTP ${response.status}`)
      bytes = new Uint8Array(await response.arrayBuffer())
    }
    if (bytes.byteLength !== file.bytes || digest(bytes) !== file.sha256)
      throw new Error(`Integridade inválida do artefato ${file.path}.`)
    contents.set(file.path, bytes)
    // Save only verified vendor bytes; a corrupt cache is an error, not a repin.
    await writeFile(target, bytes)
  }
  for (const [entry, output] of [
    ['worker', 'worker'],
    ['frame', 'frame'],
    ['bootResourceReader', 'boot-reader'],
    ['standalone', 'standalone'],
    ['inspectStandalone', 'inspect'],
    ['playtestStandalone', 'playtest'],
    ['turtle/renderer', 'turtle-renderer'],
    ['turtle/graphicsProtocol', 'turtle-protocol'],
    ['../../python/language/worker', 'analysis-worker'],
    ['../../python/language/frame', 'analysis-frame'],
  ]) {
    const build = await Bun.build({
      entrypoints: [resolve(root, `packages/studio/src/runtime/python/${entry}.ts`)],
      target: 'browser',
      format: 'esm',
      splitting: false,
      minify: true,
      loader: { '.py': 'text' },
    })
    if (!build.success || build.outputs.length !== 1)
      throw new AggregateError(build.logs, `Falha ao compilar ${entry} Python.`)
    contents.set(`${output}.mjs`, new Uint8Array(await build.outputs[0]!.arrayBuffer()))
  }
  const bootReader = contents.get('boot-reader.mjs')
  if (!bootReader) throw new Error('Leitor privado de boot Python ausente.')
  const bootLoaders = await derivePythonBootLoaders({
    inputs: contents,
    reader: bootReader,
    temporaryRoot: outputDirectory,
  })
  for (const [name, bytes] of bootLoaders.files) contents.set(name, bytes)
  contents.set(
    'boot-loader-derivation.json',
    new TextEncoder().encode(canonicalJson(bootLoaders.provenance)),
  )
  for (const filename of TURTLE_MODULE_FILES)
    contents.set(
      `turtle/${filename}`,
      new Uint8Array(
        await readFile(resolve(root, `packages/studio/src/runtime/python/turtle/${filename}`)),
      ),
    )
  contents.set(
    'LICENSE-tk.txt',
    new Uint8Array(
      await readFile(resolve(root, 'packages/studio/scripts/turtle/vendor/LICENSE-tk.txt')),
    ),
  )
  const standardLibrary = options.standardLibrary
    ? { ...options.standardLibrary }
    : await preparePythonStandardLibrary({
        vendorDirectory,
        cacheDirectory: resolve(vendorDirectory, '../prepared-stdlib'),
      })
  {
    const bytes = new Uint8Array(await readFile(standardLibrary.path))
    if (digest(bytes) !== standardLibrary.sha256)
      throw new Error('Integridade inválida da biblioteca padrão preparada.')
    contents.set('python_stdlib.zip', bytes)
  }
  contents.set(
    'frame.html',
    new TextEncoder().encode(
      '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Execução Python</title><script type="module" src="./frame.mjs"></script></html>',
    ),
  )
  contents.set(
    'analysis.html',
    new TextEncoder().encode(
      '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Análise Python</title><script type="module" src="./analysis-frame.mjs"></script></html>',
    ),
  )
  contents.set(
    'SOURCES.txt',
    new TextEncoder().encode(
      [
        `Pyodide ${vendor.pyodideVersion}: https://github.com/pyodide/pyodide/tree/${vendor.pyodideVersion}`,
        `CPython ${vendor.pythonVersion}: https://github.com/python/cpython/tree/v${vendor.pythonVersion}`,
        'Turtle browser adaptation: licensed CPython 3.14.2 geometry/animation with a Sistema Zero Canvas backend. Recipe: packages/studio/scripts/turtle/derive.py. Tk 8.6.15 color table; see LICENSE-tk.txt. This is not the original Tkinter module.',
        `Standard library packaging recipe: ${standardLibrary.recipe}; output SHA-256: ${standardLibrary.sha256}; input source archive remains pinned in vendor-manifest.json. Sources are preserved.`,
        'Pyodide loader modules use scoped lexical fetch injection, not a global fetch replacement. Recipe/tool/input/output hashes: boot-loader-derivation.json. Original vendor inputs remain pinned in vendor-manifest.json. Other vendor artifacts are unchanged.',
        'HTTP gzip representations are additional immutable transport artifacts, not replacements for logical files. Recipe: http-compression-recipe.json and packages/studio/scripts/python/http-representations.ts. Input/output relationships: distribution.httpRepresentations; hashes: distribution.files. Decoded content is verified before upload.',
        '',
      ].join('\n'),
    ),
  )
  contents.set(
    'http-compression-recipe.json',
    new TextEncoder().encode(canonicalJson(PYTHON_HTTP_COMPRESSION_RECIPE)),
  )
  const http = createPythonHTTPRepresentations(contents)
  for (const [path, bytes] of http.files) contents.set(path, bytes)
  const manifest = StudioPythonDistributionSchema.parse({
    version: 1,
    pyodideVersion: vendor.pyodideVersion,
    pythonVersion: vendor.pythonVersion,
    ...(http.representations.length ? { httpRepresentations: http.representations } : {}),
    files: [...contents]
      .map(([path, bytes]) => ({ path, bytes: bytes.byteLength, sha256: digest(bytes) }))
      .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)),
  })
  const hash = digest(canonicalJson(manifest))
  const directory = resolve(outputDirectory, hash)
  await mkdir(directory, { recursive: true })
  for (const [path, bytes] of contents) {
    const target = resolve(directory, path)
    await mkdir(resolve(target, '..'), { recursive: true })
    await writeFile(target, bytes)
  }
  // Manifest is the completion marker, written after all verified output files.
  await writeFile(resolve(directory, 'distribution.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  return { directory, hash, manifest }
}

if (import.meta.main) {
  const result = await buildPythonRuntimeDistribution()
  console.log(
    JSON.stringify({
      directory: result.directory,
      hash: result.hash,
      files: result.manifest.files.length,
    }),
  )
}

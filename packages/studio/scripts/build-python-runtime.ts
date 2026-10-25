import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { canonicalJson } from '@sistemazero/core/creations'
import { SZ_AUDIO_MODULE_DESCRIPTOR } from '@sistemazero/core/studio/python-provided-modules-sz-audio'
import { StudioPythonDistributionSchema } from '@sistemazero/core/studio/python-runtime-distribution'
import { PYTHON_PROJECT_MISSION_FEATURE } from '@sistemazero/core/studio/python-runtime-features'
import { PGZERO_MODULE_FILES } from '../src/runtime/python/pgzero/contract'
import { PYGAME_MODULE_FILES } from '../src/runtime/python/pygame/contract'
import { RAYLIB_MODULE_FILES } from '../src/runtime/python/raylib/contract'
import { TURTLE_MODULE_FILES, TURTLE_RUNTIME_FEATURES } from '../src/runtime/python/turtle/contract'
import vendor from '../src/runtime/python/vendor-manifest.json'
import { PYODIDE_VERSION, PYTHON_VERSION } from '../src/runtime/python/versions'
import { APPROVED_EVAL_RECIPE, applyApprovedEval, approvedEvalSha256 } from './python/approved-eval'
import { checkPythonAudioMetadata } from './python/audio-metadata'
import { derivePythonBootLoaders } from './python/derive-boot-loaders'
import {
  createPythonHTTPRepresentations,
  PYTHON_HTTP_COMPRESSION_RECIPE,
} from './python/http-representations'
import { preparePythonStandardLibrary } from './python/prepare-stdlib'
import { buildPythonProvidedModuleArtifacts } from './python/provided-modules'

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
  await checkPythonAudioMetadata()
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
    ['pgzero/renderer', 'pgzero-renderer'],
    ['pgzero/protocol', 'pgzero-protocol'],
    ['raylib/renderer', 'raylib-renderer'],
    ['raylib/protocol', 'raylib-protocol'],
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
    transforms: {
      'pyodide.asm.mjs': {
        recipe: APPROVED_EVAL_RECIPE,
        sha256: approvedEvalSha256(),
        apply: (source) => applyApprovedEval(source),
      },
    },
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
  for (const filename of PGZERO_MODULE_FILES)
    contents.set(
      `pgzero/${filename}`,
      new Uint8Array(
        await readFile(resolve(root, `packages/studio/src/runtime/python/pgzero/py/${filename}`)),
      ),
    )
  for (const filename of RAYLIB_MODULE_FILES)
    contents.set(
      `raylib/${filename}`,
      new Uint8Array(
        await readFile(resolve(root, `packages/studio/src/runtime/python/raylib/py/${filename}`)),
      ),
    )
  for (const license of ['LICENSE-raylib.txt', 'LICENSE-raylib-python-cffi.txt'])
    contents.set(
      license,
      new Uint8Array(
        await readFile(resolve(root, `packages/studio/src/runtime/python/raylib/${license}`)),
      ),
    )
  for (const filename of PYGAME_MODULE_FILES)
    contents.set(
      `pygame/${filename}`,
      new Uint8Array(
        await readFile(resolve(root, `packages/studio/src/runtime/python/pygame/py/${filename}`)),
      ),
    )
  for (const license of ['LICENSE-pgzero.txt', 'LICENSE-freefont.txt'])
    contents.set(
      license,
      new Uint8Array(
        await readFile(resolve(root, `packages/studio/src/runtime/python/pgzero/${license}`)),
      ),
    )
  // The pygame fonts are the platform's OFL fonts; their licences ship beside them.
  for (const [font, license] of [
    ['bungee', 'OFL-bungee.txt'],
    ['press-start-2p', 'OFL-pressstart2p.txt'],
    ['nunito', 'OFL-nunito.txt'],
    ['fredoka', 'OFL-fredoka.txt'],
  ] as const)
    contents.set(
      `LICENSE-font-${font}.txt`,
      new Uint8Array(
        await readFile(resolve(root, `packages/studio/src/official-extensions/fonts/${license}`)),
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
        'Pygame Zero browser adaptation: pgzero 1.2.1 (LGPL-3.0, see LICENSE-pgzero.txt) with a Sistema Zero canvas backend and pygame-ce 2.5.8 behaviour. File-by-file origin: packages/studio/src/runtime/python/pgzero/PROVENANCE.md. Default font freesansbold.ttf: GNU FreeFont, see LICENSE-freefont.txt. This is not pygame.',
        'Raylib browser adaptation: a Sistema Zero Python module (pyray, raylib) following raylib-python-cffi 6.0.1.0 (EPL-2.0 or GPL-2.0 with Classpath exception, see LICENSE-raylib-python-cffi.txt) and raylib 6.0 (zlib, see LICENSE-raylib.txt): names, structs, constants, default font data and drawing/maths algorithms ported from raylib, drawn by a WebGL2 renderer. Provenance: packages/studio/src/runtime/python/raylib/PROVENANCE.md. This is not the raylib C library.',
        'pygame-ce 2.5.7 (LGPL-2.1, see LICENSE-pygame-ce.txt): the unmodified Pyodide 314.0.7 wheel pygame_ce-2.5.7-cp314-cp314-pyemscripten_2026_0_wasm32.whl, source https://github.com/pygame-community/pygame-ce/tree/2.5.7. The Sistema Zero host bridge (packages/studio/src/runtime/python/pygame/py/_szpygame) replaces only display flip, input state, clocks and the mixer, and uses the bundled pgzero frame transport; desktop exports use native pygame-ce 2.5.7.',
        `Portable audio ${SZ_AUDIO_MODULE_DESCRIPTOR.importName} ${SZ_AUDIO_MODULE_DESCRIPTOR.version} is a separate Sistema Zero module, not part of the Python standard library or Turtle API. Browser requests use the captured session media service; desktop source exports declare their own native package dependencies. Source: packages/studio/src/runtime/python/audio.`,
        `Standard library packaging recipe: ${standardLibrary.recipe}; output SHA-256: ${standardLibrary.sha256}; input source archive remains pinned in vendor-manifest.json. Sources are preserved.`,
        'Pyodide loader modules use scoped lexical fetch injection, not a global fetch replacement. pyodide.asm.mjs also compiles the pinned SDL EM_ASM strings of the pygame-ce side module (packages/studio/src/runtime/python/pygame/approved-js-snippets.json, recipe scripts/python/approved-eval.ts) so its dynamic linker needs no eval; other strings are refused. Recipe/tool/input/output hashes: boot-loader-derivation.json. Original vendor inputs remain pinned in vendor-manifest.json. Other vendor artifacts are unchanged.',
        'HTTP gzip representations are additional immutable transport artifacts, not replacements for logical files. Recipe: http-compression-recipe.json and packages/studio/scripts/python/http-representations.ts. Input/output relationships: distribution.httpRepresentations; hashes: distribution.files. Decoded content is verified before upload.',
        '',
      ].join('\n'),
    ),
  )
  contents.set(
    'http-compression-recipe.json',
    new TextEncoder().encode(canonicalJson(PYTHON_HTTP_COMPRESSION_RECIPE)),
  )
  const provided = await buildPythonProvidedModuleArtifacts(contents)
  for (const [path, bytes] of provided.files) contents.set(path, bytes)
  const http = createPythonHTTPRepresentations(contents)
  for (const [path, bytes] of http.files) contents.set(path, bytes)
  const manifest = StudioPythonDistributionSchema.parse({
    version: 1,
    pyodideVersion: vendor.pyodideVersion,
    pythonVersion: vendor.pythonVersion,
    providedModules: provided.modules,
    features: [...TURTLE_RUNTIME_FEATURES, PYTHON_PROJECT_MISSION_FEATURE],
    previewHostAudioVersion: 1,
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

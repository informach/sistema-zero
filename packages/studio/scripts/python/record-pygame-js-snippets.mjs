// Records the JavaScript the emscripten dynamic linker evaluates while pygame-ce loads, and pins it
// in src/runtime/python/pygame/approved-js-snippets.json (`--check` compares instead of writing).
//
// pygame-ce's Pyodide wheel is one side module with SDL linked in. SDL's EM_ASM/EM_JS code lives
// in it as strings that the linker turns into functions with `eval`, which the worker's CSP
// forbids. The distribution compiles exactly these strings into pyodide.asm.mjs instead
// (scripts/python/approved-eval.ts); any other string still fails.
//
// Run with Node 24 from packages/studio after the vendor cache exists
// (`bun scripts/build-python-runtime.ts` downloads and verifies it).
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const studio = resolve(import.meta.dirname, '../..')
const vendor = resolve(studio, '../../.cache/studio-python-runtime/vendor')
const target = resolve(studio, 'src/runtime/python/pygame/approved-js-snippets.json')
const { PYGAME_CE_WHEEL } = await import(
  pathToFileURL(resolve(studio, 'src/runtime/python/pygame/contract.ts')).href
).catch(() => ({ PYGAME_CE_WHEEL: JSON.parse(readFileSync(target, 'utf8')).wheel }))
const sites = ['ASM_CONSTS[start]=eval(func)', 'moduleExports[name]=eval(func)']

const work = mkdtempSync(join(tmpdir(), 'sz-pygame-snippets-'))
try {
  for (const file of ['pyodide.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'])
    copyFileSync(join(vendor, file), join(work, file))
  let asm = readFileSync(join(vendor, 'pyodide.asm.mjs'), 'utf8')
  for (const site of sites) {
    if (asm.split(site).length !== 2) throw new Error(`Ponto de eval inesperado: ${site}`)
    // A comma expression keeps `eval` direct (same scope) while recording the string.
    asm = asm.replace(site, site.replace('eval(func)', '(globalThis.__szRecord(func),eval(func))'))
  }
  writeFileSync(join(work, 'pyodide.asm.mjs'), asm)
  const recorded = []
  globalThis.__szRecord = (code) => {
    if (!recorded.includes(code)) recorded.push(code)
  }
  // The same inert page objects the worker gives SDL (src/runtime/python/pygame/sdlScreen.ts).
  globalThis.screen = { width: 1920, height: 1080 }
  globalThis.document = {
    querySelector: () => null,
    addEventListener() {},
    removeEventListener() {},
  }
  const context = {
    createImageData: (width, height) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    }),
    putImageData() {},
  }
  const canvas = {
    id: 'canvas',
    width: 0,
    height: 0,
    style: {},
    getContext: () => context,
    addEventListener() {},
    removeEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }),
  }
  const { loadPyodide } = await import(pathToFileURL(join(work, 'pyodide.mjs')).href)
  const runtime = await loadPyodide({ indexURL: `${work}/` })
  runtime.canvas.setCanvas2D(canvas)
  const wheel = new Uint8Array(readFileSync(join(vendor, PYGAME_CE_WHEEL.file)))
  runtime.unpackArchive(wheel.buffer, 'wheel', { extractDir: '/sz-pygame' })
  // The linker compiles every string of the module when it loads; importing records them all.
  // (SDL's own image cursor would create a DOM canvas: _szpygame never calls it in the worker.)
  await runtime.runPythonAsync(`
import importlib, pkgutil, sys
sys.path.insert(0, '/sz-pygame')
import pygame
for info in pkgutil.walk_packages(pygame.__path__, 'pygame.'):
    if not info.name.startswith(('pygame.tests', 'pygame.examples', 'pygame.docs', 'pygame.__')):
        try:
            importlib.import_module(info.name)
        except ImportError:
            pass  # numpy, cv2 and portmidi are not part of the browser build
pygame.init()
screen = pygame.display.set_mode((64, 48))
pygame.display.flip()
pygame.quit()
`)
  const pinned = {
    wheel: { file: PYGAME_CE_WHEEL.file, sha256: PYGAME_CE_WHEEL.sha256 },
    snippets: recorded,
  }
  const text = `${JSON.stringify(pinned, null, 2)}\n`
  if (process.argv.includes('--check')) {
    if (readFileSync(target, 'utf8') !== text) {
      console.error('approved-js-snippets.json está desatualizado: rode o script sem --check.')
      process.exit(1)
    }
  } else writeFileSync(target, text)
  console.log(JSON.stringify({ snippets: recorded.length, target }))
} finally {
  rmSync(work, { recursive: true, force: true })
}
process.exit(0)

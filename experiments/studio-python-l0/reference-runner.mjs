import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { runOwnedProcess } from './reference-process.mjs'

const root = import.meta.dirname
const engine = process.argv[2] ?? 'chrome'
const scenario = process.argv[3] ?? 'baseline'
assert.ok(['chrome', 'edge'].includes(engine), 'Use chrome ou edge')
assert.ok(['baseline', 'video'].includes(scenario), 'Use baseline ou video')
assert.equal(process.platform, 'win32', 'Este pacote requer Windows x64')
assert.equal(process.arch, 'x64', 'Este pacote requer Windows x64')
const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json'), 'utf8'))
for (const file of manifest.files) {
  assert.ok(
    typeof file.path === 'string' &&
      !file.path.includes('..') &&
      !/[\\:]/.test(file.path) &&
      !file.path.startsWith('/'),
  )
  const data = await readFile(resolve(root, file.path))
  assert.equal(data.length, file.bytes, `Tamanho alterado: ${file.path}`)
  assert.equal(
    createHash('sha256').update(data).digest('hex'),
    file.sha256,
    `Hash alterado: ${file.path}`,
  )
}
console.log(`Pacote verificado. Navegador: ${engine}. Cenario: ${scenario}.`)
console.log('Mantenha a janela de teste visivel. O teste usa um perfil temporario sem suas contas.')
const directory = resolve(root, '.cache/studio-python-l0')
await mkdir(directory, { recursive: true })
await writeFile(resolve(directory, 'kit-manifest.json'), JSON.stringify(manifest, null, 2))
const env = {
  ...process.env,
  PATH: `${resolve(root, 'bin')};${process.env.PATH ?? ''}`,
  L0_ENGINE: engine,
  L0_MODE: 'blob-classic',
  L0_PROTECTED_WORKERS: '1',
  L0_ISOLATE: '0',
  L0_SCENARIO: scenario,
  L0_HEADED: '1',
}
let failed = false
for (const script of ['probe.ts', 'reference.ts']) {
  const result = await runOwnedProcess(
    process.execPath,
    [script],
    {
      cwd: resolve(root, 'experiments/studio-python-l0'),
      env,
      stdio: 'inherit',
    },
    600000,
  )
  await writeFile(
    resolve(directory, `runner-${Date.now()}-${script}.json`),
    JSON.stringify({ script, engine, scenario, ...result }, null, 2),
  )
  if (result.code !== 0 || result.timedOut || result.cleanupFailure) {
    failed = true
    console.error(`Etapa interrompida: ${script}. O relatorio foi preservado.`, result)
    break
  }
}
console.log('Resultados em .cache/studio-python-l0. Nenhum resultado foi enviado pela internet.')
if (failed) process.exitCode = 1

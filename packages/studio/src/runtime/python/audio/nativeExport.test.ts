import { expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { buildPythonAudioNativeBundle } from './nativeExport'

test('native audio package declares its build, dependencies and every shipped source byte', async () => {
  const bundle = await buildPythonAudioNativeBundle({
    files: ['src/main.py'],
    directories: ['src'],
  })
  expect(Object.keys(bundle.files)).toHaveLength(10)
  const root = '.sistemazero/python-audio'
  for (const path of ['__init__.py', '_desktop.py', '_mixer.py', '_wav.py']) {
    const source = await readFile(new URL(`./sz_audio/${path}`, import.meta.url), 'utf8')
    expect(bundle.files[`${root}/sz_audio/${path}`]).toBe(source.replaceAll('\r\n', '\n'))
  }
  expect(bundle.files[`${root}/install.txt`]).toBe(`./${root}\n`)
  const descriptor = JSON.parse(bundle.files[`${root}/sz_audio/_module.json`]!)
  expect(descriptor.version).toBe(bundle.manifest.version)
  expect(descriptor.native.distribution).toBe(bundle.manifest.package)
  expect(descriptor.native.dependencies).toEqual(bundle.manifest.dependencies)
  const config = bundle.files[`${root}/pyproject.toml`]!
  expect(config).toContain('build-backend = "setuptools.build_meta"')
  expect(config).toContain('packages = ["sz_audio"]')
  expect(config).toContain('sz_audio = ["_module.json", "__init__.pyi", "py.typed"]')
  expect(bundle.files[`${root}/sz_audio/__init__.pyi`]).toContain(
    'def play(path: str, *, loop: bool = False, volume: float = 1.0) -> int:',
  )
  expect(bundle.files[`${root}/sz_audio/py.typed`]).toBe('')
  expect(bundle.manifest.referencePath).toBe(`${root}/REFERENCIA.txt`)
  expect(bundle.files[bundle.manifest.referencePath]).toContain(
    'play não bloqueia nem mantém o processo Python aberto',
  )
  for (const [name, version] of Object.entries(bundle.manifest.dependencies)) {
    expect(config).toContain(`${name}==${version}`)
  }
  for (const entry of bundle.manifest.files) {
    const source = bundle.files[entry.path]!
    expect(entry.bytes).toBe(new TextEncoder().encode(source).byteLength)
    expect(entry.sha256).toBe(await sha256Hex(source))
  }
  expect(bundle.manifest.filesSha256).toBe(await sha256Hex(canonicalJson(bundle.manifest.files)))
  expect(bundle.manifest.desktopExecution).toBe('not-observed')
  expect(Object.keys(bundle.files).some((path) => path.endsWith('/turtle.py'))).toBe(false)
})

test('native audio allocation preserves authored files, case variants and empty namespaces', async () => {
  const input = {
    files: [
      '.sistemazero',
      '.SISTEMAZERO-2/PYTHON-AUDIO/author.txt',
      'sz_audio.py',
      'requirements.txt',
    ],
    directories: ['.sistemazero-3/python-audio'],
  }
  const before = JSON.stringify(input)
  const bundle = await buildPythonAudioNativeBundle(input)
  expect(
    Object.keys(bundle.files).every((path) => path.startsWith('.sistemazero-4/python-audio/')),
  ).toBe(true)
  expect(bundle.manifest.requirementsPath).toBe('.sistemazero-4/python-audio/install.txt')
  expect(JSON.stringify(input)).toBe(before)
  expect(await buildPythonAudioNativeBundle(input)).toEqual(bundle)
})

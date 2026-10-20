import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { readPythonAudioWav } from '../runtime/python/audio/wav'
import { PYTHON_EXAMPLE_SUMMARIES } from './pythonCatalog'

const qualifiedSources = {
  'main.py': '97b9d38374f14567fc177d3a81e93f1bd836f406cd0cf6cfbf85651be967b125',
  'model.py': '0b6aef8dc91d85ffb5874aa4001698673dd1da0dc76c305a871355e20d911e55',
  'timer_loop.py': '900143f1b80d0605cf692ae077de2ee39fc2869a759381b436dfbc4d385d9191',
  'view.py': '13f1902ade0e54c23ec3b9e677025541f8a96583ebc24d6c6e86e304fa976492',
  'requirements.txt': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
}

test('the original race advertises Pro and the exact Turtle extension without embedding a runtime', () => {
  expect(PYTHON_EXAMPLE_SUMMARIES).toHaveLength(2)
  const entry = PYTHON_EXAMPLE_SUMMARIES[0]!
  expect(entry).toMatchObject({
    programmingLanguage: 'python',
    key: 'python:turtle-race-original',
    name: 'Corrida das Tartarugas',
    kind: 'pro',
    extensions: [{ id: 'python-turtle', version: '1.0.0' }],
  })
  expect(entry).not.toHaveProperty('runtime')
  expect(entry).not.toHaveProperty('files')
  expect(entry).not.toHaveProperty('assets')
})

const mazeSources = {
  'main.py': '1bbe619953505b99b6677bbaab8404184c0d7336658a78dc2e90ea123705b376',
  'actors.py': '66b043c05003ea5b8043e245516f0f9e39896eaf274c35df8b934cb197bc86dd',
  'renderer.py': '12966fb9cd226965104111c9bdce72cfde2cf3651fb1d7628a578bb1950abc76',
  'mazes.py': 'f679a620a63a15d784ae571b6a167e6c2939ecdd36da2f92f74e6f904fd9ca02',
  'constants.py': '1473d887c095e92d4b6089875dd4661a11623bc883b38d912d2c7ac3c631822e',
}
const mazeSounds = {
  'opening.wav': 'e17a35c404e91ee4e811896b717c7522d8eb703bcd6aba88c9d05729f5570607',
  'collect.wav': 'af36c3ce65e7772627997df51d5705259444a1cdc072e20f676a713f97e75613',
  'collision.wav': '82e3f682fdc86728254930ecc3c2796a9bdadb9cb35e4a7a2167e4038986910c',
}

test('maze metadata requires the exact provided audio module without loading implementation data', () => {
  const entry = PYTHON_EXAMPLE_SUMMARIES.find(({ key }) => key === 'python:maze-lights')
  expect(entry).toMatchObject({
    programmingLanguage: 'python',
    name: 'Labirinto das Luzes',
    kind: 'pro',
    extensions: [{ id: 'python-turtle', version: '1.0.0' }],
    requiredProvidedModules: [{ importName: 'sz_audio', version: '1.0.0' }],
  })
  expect(entry).not.toHaveProperty('runtime')
  expect(entry).not.toHaveProperty('files')
  expect(entry).not.toHaveProperty('assets')
})

test('maze payload preserves editorial source, MIT attribution, instructions and the three original WAV byte streams', async () => {
  const entry = PYTHON_EXAMPLE_SUMMARIES.find(({ key }) => key === 'python:maze-lights')
  if (!entry) throw new Error('Missing maze example')
  const payload = await entry.load()
  expect(payload.entrypoint).toBe('main.py')
  expect(Object.keys(payload.files).sort()).toEqual(
    [...Object.keys(mazeSources), 'README.md', 'NOTICE.md', 'LICENSE', 'requirements.txt'].sort(),
  )
  for (const [path, source] of Object.entries(payload.files)) {
    const original = await readFile(new URL(`./python/maze-lights/${path}`, import.meta.url))
    expect(source).toBe(new TextDecoder().decode(original).replaceAll('\r\n', '\n'))
  }
  for (const [path, hash] of Object.entries(mazeSources))
    expect(createHash('sha256').update(payload.files[path]!).digest('hex')).toBe(hash)
  const originalLicense = await readFile(new URL('./python/maze-lights/LICENSE', import.meta.url))
  expect(createHash('sha256').update(originalLicense).digest('hex')).toBe(
    '51781f227d06b91782b2523bcf6113128ad74bfb9ffd2ef116958c2d231d9e75',
  )
  // Generated text uses LF; the upstream license file itself retains its original bytes.
  expect(createHash('sha256').update(payload.files.LICENSE!).digest('hex')).toBe(
    '6bd0be088917f9237b68ba1855d9dff9411f6cf93618b6d1a8c1405bdd02d7c6',
  )
  expect(payload.files['NOTICE.md']).toContain('TheWannabeCoder')
  expect(payload.files['NOTICE.md']).toContain('2a4eb7f5963f905b1b80ebf4f3c8eaa50da50103')
  expect(payload.files['README.md']).toContain('LEIA-ME-Sistema-Zero.txt')
  expect(payload.files['README.md']).not.toContain('.cache')
  expect(payload.files['requirements.txt']).toBe('')
  expect(payload.assets).toHaveLength(3)
  expect(new Set(payload.assets?.map(({ id }) => id)).size).toBe(3)
  expect(payload.assets?.map(({ proPath }) => proPath).sort()).toEqual(
    Object.keys(mazeSounds).sort(),
  )
  for (const [path, hash] of Object.entries(mazeSounds)) {
    const asset = payload.assets?.find(({ proPath }) => proPath === path)
    if (!asset) throw new Error(`Missing sound ${path}`)
    expect(asset.kind).toBe('audio')
    expect(asset.license?.name).toBe('MIT')
    expect(asset.license?.attribution).toContain('Sistema Zero')
    expect(asset.dataUrl.startsWith('data:audio/wav;base64,')).toBe(true)
    const bytes = Uint8Array.from(atob(asset.dataUrl.split(',')[1]!), (char) => char.charCodeAt(0))
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(hash)
    expect(bytes).toEqual(
      new Uint8Array(await readFile(new URL(`./python/maze-lights/${path}`, import.meta.url))),
    )
    expect(readPythonAudioWav(bytes)).toMatchObject({ channels: 1, sampleRate: 48000 })
    expect(bytes.subarray(44).some((value) => value !== 0)).toBe(true)
  }
})

test('the lazy payload contains exactly the five graphically qualified source bytes and no media', async () => {
  const payload = await PYTHON_EXAMPLE_SUMMARIES[0]!.load()
  expect(payload.entrypoint).toBe('main.py')
  expect(payload.assets).toEqual([])
  expect(Object.keys(payload.files).sort()).toEqual(Object.keys(qualifiedSources).sort())
  for (const [path, sha256] of Object.entries(qualifiedSources)) {
    const bytes = await readFile(new URL(`./python/turtle-race/${path}`, import.meta.url))
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(sha256)
    expect(payload.files[path]).toBe(bytes.toString('utf8'))
  }
  expect(payload.files['requirements.txt']).toBe('')
})

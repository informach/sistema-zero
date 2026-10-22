import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { canonicalJson } from '../creations/content-fingerprint'
import {
  pythonProvidedModuleArtifactPaths,
  StudioPythonProvidedModuleDescriptorSchema,
  StudioPythonProvidedModuleSchema,
  StudioPythonProvidedModulesSchema,
} from './python-provided-modules'
import {
  buildPythonProvidedModuleMetadata,
  renderPythonProvidedModuleReference,
  renderPythonProvidedModuleStub,
  verifyPythonProvidedModuleArtifacts,
} from './python-provided-modules-render'
import { SZ_AUDIO_MODULE_DESCRIPTOR as audio } from './python-provided-modules-sz-audio'

const digest = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex')
async function fixture() {
  const metadata = await buildPythonProvidedModuleMetadata(audio)
  const module = {
    descriptor: audio,
    descriptorArtifact: {
      path: metadata.descriptorFile.path,
      sha256: metadata.descriptorFile.sha256,
    },
    typingArtifact: { path: metadata.typingFile.path, sha256: metadata.typingFile.sha256 },
    browserArtifacts: [{ path: 'worker.mjs', sha256: 'a'.repeat(64) }],
  }
  const artifacts = [module.descriptorArtifact, module.typingArtifact, ...module.browserArtifacts]
  return { module, artifacts, metadata }
}

test('sz_audio is an explicit provided-module definition, separate from stdlib/extensions/approval', () => {
  expect(audio.importName).toBe('sz_audio')
  expect(audio.version).toBe('1.0.0')
  expect(audio.provider).toBe('sistema-zero')
  expect(audio.kind).toBe('portable-audio')
  expect(audio.browser.installation).toBe('runtime-bundled')
  expect(audio.native.installation).toBe('exported-package')
  expect(audio.browser.lifetime).toBe('execution-session')
  expect(audio.native.lifetime).toBe('process')
  for (const extra of [
    { approved: true },
    { extension: 'python-turtle' },
    { stdlib: true },
    { url: 'https://x.invalid' },
  ])
    expect(
      StudioPythonProvidedModuleDescriptorSchema.safeParse({ ...audio, ...extra }).success,
    ).toBe(false)
})

test('policy and native dependency projections preserve the currently qualified audio contract', () => {
  expect(audio.audio.policy).toEqual({
    version: 1,
    requestBytes: 2048,
    voices: 16,
    commandsPerSecond: 64,
    wavChunks: 256,
    fileBytes: 33554432,
    durationSeconds: 600,
    minimumSampleRate: 8000,
    maximumSampleRate: 96000,
  })
  expect(audio.audio.assetsTotalBytes).toBe(33554432)
  expect(audio.audio.channels).toEqual([1, 2])
  expect(audio.audio.encoding).toBe('PCM16')
  expect(audio.native.requiresPython).toBe('>=3.14.2,<3.15')
  expect(audio.native.dependencies).toEqual({
    setuptools: '84.2.0',
    miniaudio: '1.71',
    cffi: '2.1.1',
    pycparser: '3.11',
  })
})

test('validated metadata is detached and frozen through nested lists and records', () => {
  const raw = JSON.parse(JSON.stringify(audio))
  const parsed = StudioPythonProvidedModuleDescriptorSchema.parse(raw)
  raw.api[0].summary = 'changed'
  raw.audio.policy.voices = 99
  expect(parsed).toEqual(audio)
  for (const value of [
    parsed,
    parsed.api,
    parsed.api[0],
    parsed.browser,
    parsed.browser.notes,
    parsed.audio,
    parsed.audio.channels,
    parsed.audio.policy,
    parsed.native,
    parsed.native.dependencies,
    parsed.native.notes,
  ])
    expect(Object.isFrozen(value)).toBe(true)
})

test('provided module arrays are explicit and never supplied by a default', () => {
  expect(StudioPythonProvidedModulesSchema.parse([])).toEqual([])
  for (const value of [undefined, null, 'sz_audio', {}])
    expect(StudioPythonProvidedModulesSchema.safeParse(value).success).toBe(false)
})

test('descriptor rejects unsupported formats, over-budget data and inconsistent limits', () => {
  for (const policy of [
    { voices: 17 },
    { requestBytes: 2049 },
    { commandsPerSecond: 65 },
    { durationSeconds: 601 },
    { fileBytes: 33554433 },
    { minimumSampleRate: 96000, maximumSampleRate: 8000 },
  ])
    expect(
      StudioPythonProvidedModuleDescriptorSchema.safeParse({
        ...audio,
        audio: { ...audio.audio, policy: { ...audio.audio.policy, ...policy } },
      }).success,
    ).toBe(false)
  for (const change of [{ encoding: 'MP3' }, { channels: [1, 2, 6] }, { assetsTotalBytes: 44 }])
    expect(
      StudioPythonProvidedModuleDescriptorSchema.safeParse({
        ...audio,
        audio: { ...audio.audio, ...change },
      }).success,
    ).toBe(false)
  const huge = {
    ...audio,
    browser: { ...audio.browser, notes: Array.from({ length: 8 }, () => 'á'.repeat(1200)) },
  }
  expect(StudioPythonProvidedModuleDescriptorSchema.safeParse(huge).success).toBe(false)
})

test('API metadata rejects duplicate functions and executable/multiline declarations', () => {
  expect(
    StudioPythonProvidedModuleDescriptorSchema.safeParse({
      ...audio,
      api: [audio.api[0], audio.api[0]],
    }).success,
  ).toBe(false)
  for (const signature of [
    '() -> int\nimport os',
    '(path=__import__("os")) -> int',
    '() -> int: ...; print(1)',
    '() -> int # comment',
  ])
    expect(
      StudioPythonProvidedModuleDescriptorSchema.safeParse({
        ...audio,
        api: [{ ...audio.api[0], signature }],
      }).success,
    ).toBe(false)
  expect(() => renderPythonProvidedModuleStub({ ...audio, summary: 'first\nsecond' })).toThrow()
})

test('reference includes the actual API, native dependencies and both installation boundaries', () => {
  const reference = renderPythonProvidedModuleReference(audio)
  expect(reference).toContain(
    'sz_audio.play(path: str, *, loop: bool = False, volume: float = 1.0) -> int',
  )
  expect(reference).toContain('sz_audio.stop(handle: int | None = None) -> None')
  expect(reference).toContain('16 vozes e 64 comandos por segundo')
  expect(reference).toContain('8000–96000 Hz')
  expect(reference).toContain('miniaudio==1.71')
  expect(reference).toContain('release aprovada')
  expect(reference).toContain('subpasta')
  expect(reference).toContain('módulo separado de Turtle')
  expect(reference).toContain('não certifica a execução')
  expect(reference).toContain('sessão podem continuar abertas para o REPL')
  expect(reference).toContain('play não bloqueia nem mantém o processo Python aberto')
  expect(reference).toContain('turtle.done() ou turtle.mainloop()')
  expect(reference).toContain('Encerrar o processo encerra o áudio')
})

test('stub preserves keyword-only play, literal defaults, return types and documentation', () => {
  const stub = renderPythonProvidedModuleStub(audio)
  expect(stub).toContain(
    'def play(path: str, *, loop: bool = False, volume: float = 1.0) -> int:\n',
  )
  expect(stub).toContain('def stop(handle: int | None = None) -> None:\n')
  expect(stub).toContain('__version__: str\n__all__: list[str]\n')
  expect(stub.match(/^def /gm)).toHaveLength(2)
  expect(stub.match(/^ {4}\.\.\.$/gm)).toHaveLength(2)
  expect(stub).not.toContain('import miniaudio')
  expect(stub).not.toContain('import pyodide')
  expect(stub.endsWith('\n')).toBe(true)
  const quoted = renderPythonProvidedModuleStub({
    ...audio,
    summary: 'Texto "citado" e \\ caminho.',
  })
  expect(quoted.split('\n')[0]).toBe('"Texto \\"citado\\" e \\\\ caminho."')
})

test('metadata artifacts have deterministic canonical bytes and independently checked digests', async () => {
  const first = await buildPythonProvidedModuleMetadata(audio)
  expect(await buildPythonProvidedModuleMetadata(audio)).toEqual(first)
  expect(first.descriptorFile.path).toBe('python-modules/sz_audio/1.0.0/descriptor.json')
  expect(first.typingFile.path).toBe('python-modules/sz_audio/1.0.0/__init__.pyi')
  expect(first.descriptorFile.text).toBe(canonicalJson(audio))
  expect(first.descriptorFile.sha256).toBe(digest(first.descriptorFile.text))
  expect(first.typingFile.sha256).toBe(digest(first.typingFile.text))
  expect(() =>
    pythonProvidedModuleArtifactPaths({ importName: '../audio', version: '1.0.0' }),
  ).toThrow()
  expect(() =>
    pythonProvidedModuleArtifactPaths({ importName: 'sz_audio', version: '../1' }),
  ).toThrow()
})

test('artifact references require the exact module/version and distinct logical paths', async () => {
  const { module } = await fixture()
  expect(StudioPythonProvidedModuleSchema.safeParse(module).success).toBe(true)
  for (const change of [
    {
      descriptorArtifact: {
        ...module.descriptorArtifact,
        path: 'python-modules/other/1.0.0/descriptor.json',
      },
    },
    {
      typingArtifact: {
        ...module.typingArtifact,
        path: 'python-modules/sz_audio/2.0.0/__init__.pyi',
      },
    },
    { browserArtifacts: [] },
    { browserArtifacts: [...module.browserArtifacts, ...module.browserArtifacts] },
    { browserArtifacts: [{ path: '_http/gzip/a.mjs', sha256: 'a'.repeat(64) }] },
    { browserArtifacts: [{ path: 'https://other.invalid/a.mjs', sha256: 'a'.repeat(64) }] },
    { browserArtifacts: [{ path: 'worker.py', sha256: 'a'.repeat(64) }] },
  ])
    expect(StudioPythonProvidedModuleSchema.safeParse({ ...module, ...change }).success).toBe(false)
  expect(StudioPythonProvidedModulesSchema.safeParse([module, module]).success).toBe(false)
})

test('structural verifier rejects missing/replaced artifact references and metadata drift', async () => {
  const { module, artifacts } = await fixture()
  expect(await verifyPythonProvidedModuleArtifacts(module, artifacts)).toEqual(module)
  await expect(verifyPythonProvidedModuleArtifacts(module, artifacts.slice(0, 2))).rejects.toThrow(
    'ausente',
  )
  await expect(
    verifyPythonProvidedModuleArtifacts(module, [...artifacts, artifacts[0]]),
  ).rejects.toThrow('conflitantes')
  await expect(
    verifyPythonProvidedModuleArtifacts(
      { ...module, descriptor: { ...audio, summary: 'Changed descriptor' } },
      artifacts,
    ),
  ).rejects.toThrow('descriptor')
  const badTyping = { ...module.typingArtifact, sha256: 'b'.repeat(64) }
  await expect(
    verifyPythonProvidedModuleArtifacts({ ...module, typingArtifact: badTyping }, [
      module.descriptorArtifact,
      badTyping,
      ...module.browserArtifacts,
    ]),
  ).rejects.toThrow('tipagem')
})

test('artifact verification captures input before awaits and cannot accept a later browser substitution', async () => {
  const { module, artifacts } = await fixture()
  const pending = verifyPythonProvidedModuleArtifacts(module, artifacts)
  module.browserArtifacts[0]!.path = 'different.mjs'
  module.browserArtifacts[0]!.sha256 = 'f'.repeat(64)
  const captured = await pending
  expect(captured.browserArtifacts).toEqual([{ path: 'worker.mjs', sha256: 'a'.repeat(64) }])
  expect(Object.isFrozen(captured.browserArtifacts[0])).toBe(true)
})

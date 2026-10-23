import { describe, expect, test } from 'bun:test'
import { sha256Hex } from '@sistemazero/core/creations'
import { digestAssetBytes } from '../../core/assetBinary'
import { documentFixture } from '../../state/fixtures/projectDocuments'
import { preparePythonExecutionSnapshot, preparePythonProExecutionSnapshot } from './snapshot'

function project() {
  const value = documentFixture('python', 'pro')
  if (value.programmingLanguage !== 'python' || value.kind !== 'pro') throw new Error('fixture')
  value.assets = [
    {
      id: 'hero',
      name: 'hero',
      kind: 'image',
      dataUrl: 'data:image/gif;base64,AAEC/w==',
      proPath: 'hero.gif',
    },
  ]
  return value
}

describe('Python execution snapshot', () => {
  for (const kind of ['classic', 'pro'] as const)
    test(`recomputed lock cannot pretend to install external packages in ${kind}`, async () => {
      const value = documentFixture('python', kind)
      if (value.programmingLanguage !== 'python') throw new Error('fixture')
      value.assets = []
      delete value.coverAssetName
      for (const requirements of [
        'requests==2.0.0\n',
        '-r other.txt',
        '--index-url https://example.test',
      ]) {
        if (value.kind === 'pro')
          value.tree['requirements.txt'] = { kind: 'file', content: requirements }
        else value.files['requirements.txt'] = requirements
        value.python.dependencyLock.requirementsSha256 = await sha256Hex(requirements)
        await expect(preparePythonExecutionSnapshot(value)).rejects.toThrow('pacotes externos')
      }
      const requirements = '# Turtle é fornecido pela extensão\r\n\n'
      if (value.kind === 'pro')
        value.tree['requirements.txt'] = { kind: 'file', content: requirements }
      else value.files['requirements.txt'] = requirements
      value.python.dependencyLock.requirementsSha256 = await sha256Hex(requirements)
      expect(
        (await preparePythonExecutionSnapshot(value)).files.some(
          (file) => file.path === 'requirements.txt',
        ),
      ).toBe(true)
    })
  test('materializes exact UTF-8 source and binary paths without injected web files', async () => {
    const value = project()
    value.tree['src/main.py'] = { kind: 'file', content: '# ação 🐢\r\nimport turtle\r\n' }
    const snapshot = await preparePythonProExecutionSnapshot(value)
    expect(snapshot.configuration.extensions).toEqual([])
    expect(snapshot.configuration.python.entrypoint).toBe('src/main.py')
    expect(snapshot.files.map((file) => file.path)).toEqual([
      'hero.gif',
      'requirements.txt',
      'src/helper.py',
      'src/main.py',
    ])
    expect(snapshot.directories).toEqual(['src'])
    expect(
      new TextDecoder().decode(snapshot.files.find((file) => file.path === 'src/main.py')!.bytes),
    ).toBe(value.tree['src/main.py'].content)
    expect([...snapshot.files[0]!.bytes]).toEqual([0, 1, 2, 255])
    for (const file of snapshot.files) expect(file.sha256).toBe(await digestAssetBytes(file.bytes))
    expect(snapshot.revision).toMatch(/^[a-f0-9]{64}$/)
  })

  test('captures source and assets before awaits, independently for each generation', async () => {
    const value = project()
    const before = structuredClone(value)
    const pending = preparePythonProExecutionSnapshot(value)
    value.tree['src/main.py'] = { kind: 'file', content: 'changed' }
    value.assets = []
    const snapshot = await pending
    const independent = await preparePythonProExecutionSnapshot(before)
    expect(snapshot).toEqual(independent)
    snapshot.files[0]!.bytes.fill(99)
    expect([...independent.files[0]!.bytes]).toEqual([0, 1, 2, 255])
  })

  test('hashes execution content, independent of UI metadata or file insertion order', async () => {
    const value = project()
    const original = await preparePythonProExecutionSnapshot(value)
    value.name = 'Outro nome'
    value.updatedAt += 1
    value.tree = Object.fromEntries(Object.entries(value.tree).reverse())
    expect((await preparePythonProExecutionSnapshot(value)).revision).toBe(original.revision)
    value.installedExtensions = [{ id: 'turtle', version: '1.0.0', installedAt: 10 }]
    expect((await preparePythonProExecutionSnapshot(value)).revision).not.toBe(original.revision)
    value.installedExtensions = []
    value.tree['src/helper.py'] = { kind: 'file', content: 'n = 43' }
    expect((await preparePythonProExecutionSnapshot(value)).revision).not.toBe(original.revision)
  })

  test('refuses unsupported documents and media/source collisions before execution', async () => {
    await expect(
      preparePythonProExecutionSnapshot(documentFixture('javascript', 'pro')),
    ).rejects.toThrow()
    await expect(
      preparePythonProExecutionSnapshot(documentFixture('python', 'classic')),
    ).rejects.toThrow()
    const value = project()
    value.tree['hero.gif'] = { kind: 'file', content: 'source collision' }
    await expect(preparePythonProExecutionSnapshot(value)).rejects.toThrow('conflitantes')
  })
})

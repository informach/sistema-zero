import { expect, test } from 'bun:test'
import { StudioTutorEnvironmentSchema } from '@sistemazero/core/studio/tutor-environment'
import { createEmptyProject } from '../core/project'
import { documentFixture } from '../state/fixtures/projectDocuments'
import { buildStudioTutorEnvironment } from './tutorEnvironment'

test('legacy JavaScript assistance identifies the language without reading source or media', () => {
  const project = createEmptyProject('old-js', 'Legado')
  project.files['script.js'] = 'const SECRET = "never send this source"'
  const context = buildStudioTutorEnvironment(project)
  expect(context.programmingLanguage).toBe('javascript')
  expect(StudioTutorEnvironmentSchema.parse(context)).toEqual(context)
  expect(JSON.stringify(context)).not.toContain('SECRET')
  expect(JSON.stringify(context)).not.toContain('never send')
})

for (const kind of ['classic', 'pro'] as const)
  test(`Python ${kind} assistance describes its exact runtime and module overrides`, () => {
    const document = documentFixture('python', kind)
    if (document.programmingLanguage !== 'python') throw new Error('Expected Python fixture')
    const project = { ...document, assets: [] }
    project.installedExtensions = [{ id: 'python-turtle', version: '1.0.0', installedAt: 1 }]
    if (project.kind === 'classic') project.files['turtle.py'] = 'API_KEY = "private"'
    else project.tree['src/turtle.py'] = { kind: 'file', content: 'API_KEY = "private"' }
    const context = buildStudioTutorEnvironment(project)
    expect(context).toEqual({
      version: 1,
      programmingLanguage: 'python',
      runtime: project.runtime,
      pythonVersion: '3.14.2',
      entrypoint: project.python.entrypoint,
      extensions: [{ id: 'python-turtle', version: '1.0.0' }],
      shadowedModules: ['turtle'],
    })
    expect(StudioTutorEnvironmentSchema.parse(context)).toEqual(context)
    expect(JSON.stringify(context)).not.toContain('API_KEY')
    expect(JSON.stringify(context)).not.toContain('private')
    if (project.kind === 'classic') project.files['sz_audio.py'] = 'author = True\n'
    else project.tree['src/sz_audio.py'] = { kind: 'file', content: 'author = True\n' }
    const shadowed = buildStudioTutorEnvironment(project)
    if (shadowed.programmingLanguage !== 'python') throw new Error('Expected Python context')
    expect(shadowed.shadowedModules).toEqual(['turtle', 'sz_audio'])
    expect(StudioTutorEnvironmentSchema.parse(shadowed)).toEqual(shadowed)
    project.installedExtensions[0]!.version = '2.0.0'
    expect(context.extensions[0]?.version).toBe('1.0.0')
  })

for (const kind of ['classic', 'pro'] as const) {
  for (const entrypoint of ['main.py', 'src/main.py']) {
    const prefix = entrypoint.includes('/') ? 'src/' : ''
    for (const [relativePath, shadowed] of [
      ['sz_audio/child.py', false],
      ['sz_audio.py', true],
      ['sz_audio/__init__.py', true],
      // Author declarations affect assistance/type analysis; CPython does not execute .pyi.
      ['sz_audio.pyi', true],
      ['sz_audio/__init__.pyi', true],
    ] as const) {
      test(`provided audio assistance ${kind} ${entrypoint} distinguishes ${relativePath}`, () => {
        const document = documentFixture('python', kind)
        if (document.programmingLanguage !== 'python') throw new Error('Expected Python fixture')
        const project = { ...document, assets: [], python: { ...document.python, entrypoint } }
        const path = `${prefix}${relativePath}`
        if (project.kind === 'classic') {
          project.files[entrypoint] = 'import sz_audio\n'
          project.files[path] = 'VALUE = 1\n'
        } else {
          project.tree[entrypoint] = { kind: 'file', content: 'import sz_audio\n' }
          project.tree[path] = { kind: 'file', content: 'VALUE = 1\n' }
        }
        const context = buildStudioTutorEnvironment(project)
        if (context.programmingLanguage !== 'python') throw new Error('Expected Python context')
        expect(context.shadowedModules.includes('sz_audio')).toBe(shadowed)
      })
    }
    test(`provided audio assistance ${kind} ${entrypoint} ignores files outside the entry directory`, () => {
      const document = documentFixture('python', kind)
      if (document.programmingLanguage !== 'python') throw new Error('Expected Python fixture')
      const project = { ...document, assets: [], python: { ...document.python, entrypoint } }
      const otherPrefix = prefix === '' ? 'src/' : ''
      if (project.kind === 'classic') {
        project.files[entrypoint] = 'import sz_audio\n'
        project.files[`${otherPrefix}sz_audio.py`] = 'VALUE = 1\n'
      } else {
        project.tree[entrypoint] = { kind: 'file', content: 'import sz_audio\n' }
        project.tree[`${otherPrefix}sz_audio.py`] = { kind: 'file', content: 'VALUE = 1\n' }
      }
      const context = buildStudioTutorEnvironment(project)
      if (context.programmingLanguage !== 'python') throw new Error('Expected Python context')
      expect(context.shadowedModules).not.toContain('sz_audio')
    })
  }
}

test('provided audio refinement preserves conservative legacy stdlib namespace labels', () => {
  const document = documentFixture('python', 'classic')
  if (document.programmingLanguage !== 'python' || document.kind !== 'classic')
    throw new Error('Expected Python classic fixture')
  const project = {
    ...document,
    assets: [],
    files: {
      ...document.files,
      'turtle/child.py': '',
      'math/child.py': '',
      'random/child.py': '',
    },
  }
  const context = buildStudioTutorEnvironment(project)
  if (context.programmingLanguage !== 'python') throw new Error('Expected Python context')
  expect(context.shadowedModules).toEqual(['random', 'math', 'turtle'])
})

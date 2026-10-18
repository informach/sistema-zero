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
    project.installedExtensions[0]!.version = '2.0.0'
    expect(context.extensions[0]?.version).toBe('1.0.0')
  })

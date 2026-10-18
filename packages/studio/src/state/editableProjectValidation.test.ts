import { expect, test } from 'bun:test'
import { STUDIO_PRO_BUILD_LIMITS } from '@sistemazero/core/studio/pro-build'
import { isPythonProject } from '../core/editableProject'
import { createEmptyProject } from '../core/project'
import { prepareEditableStudioProject } from './editableProjectValidation'
import { documentFixture } from './fixtures/projectDocuments'
import { installLocalRevision, readLocalRevision } from './projectStorageRevision'

test('language dispatch preserves legacy JS and takes a detached Python snapshot before lazy imports', async () => {
  const legacy = createEmptyProject('legacy', 'Legado')
  expect(await prepareEditableStudioProject(legacy)).toEqual(legacy)
  const python = installLocalRevision(documentFixture('python', 'classic'), 'reader-dispatch')
  if (python.programmingLanguage !== 'python' || python.kind !== 'classic')
    throw new Error('fixture')
  python.assets = []
  const expected = structuredClone(python)
  const pending = prepareEditableStudioProject(python)
  python.files['main.py'] = 'modified during import'
  const read = await pending
  expect(read && isPythonProject(read)).toBe(true)
  if (!read || !isPythonProject(read) || read.kind !== 'classic') throw new Error('fixture')
  expect(read?.files).toEqual(expected.files)
  expect(readLocalRevision(read!)).toBe(readLocalRevision(python))
})

test('unknown environments, future formats and malformed Python never fall back to JS', async () => {
  const python = documentFixture('python', 'classic')
  for (const value of [
    { ...python, programmingLanguage: 'ruby' },
    { ...python, programmingLanguage: undefined },
    { ...python, formatVersion: 4 },
    { ...python, python: null },
    { ...python, files: { 'index.html': '', 'style.css': '', 'script.js': '' } },
    { ...python, formatVersion: 2 },
  ])
    await expect(prepareEditableStudioProject(value)).rejects.toThrow()
  expect(await prepareEditableStudioProject(null)).toBeNull()
})

test('legacy and v3 discriminants are inspected without invoking JSON accessors', async () => {
  for (const formatVersion of [1, 2, 3]) {
    let calls = 0
    const project = { ...createEmptyProject('getter', 'Original'), formatVersion }
    Object.defineProperty(project, 'programmingLanguage', {
      enumerable: true,
      get() {
        calls++
        project.files['script.js'] = 'changed by getter'
        return 'javascript'
      },
    })
    await expect(prepareEditableStudioProject(project)).rejects.toThrow()
    expect(calls).toBe(0)
    expect(project.files['script.js']).toBe('')
  }
})

test('a lazy adapter keeps the host limits captured when the read was requested', async () => {
  const document = documentFixture('javascript', 'pro')
  document.assets = []
  const proBuildLimits = { ...STUDIO_PRO_BUILD_LIMITS, maxFileChars: 1 }
  const pending = prepareEditableStudioProject(document, { proBuildLimits })
  proBuildLimits.maxFileChars = STUDIO_PRO_BUILD_LIMITS.maxFileChars
  await expect(pending).rejects.toThrow()
})

import { expect, test } from 'bun:test'
import type { PythonProjectDocument } from '../core/editableProject'
import {
  createPythonWorkspaceDraft,
  updatePythonWorkspaceDraft,
} from '../python/blocks/workspaceDraft'
import { documentFixture } from '../state/fixtures/projectDocuments'
import { buildStudioTutorContext } from './tutor'
import { studioTutorSourceHash } from './tutorSafety'

function fixture(kind: 'classic' | 'pro'): PythonProjectDocument {
  const document = documentFixture('python', kind)
  if (document.programmingLanguage !== 'python') throw new Error('Python fixture required')
  return { ...document, assets: [] }
}

test('Python Pro preserves its runtime, native template, textual Pyright signal and current selection', () => {
  const project = fixture('pro')
  if (project.kind !== 'pro') throw new Error('Pro fixture required')
  const path = project.python.entrypoint
  const content = 'API_KEY = "do-not-send-this"\nprint(missing)\n'
  project.tree[path] = { kind: 'file', content }
  const context = buildStudioTutorContext({
    project,
    selectedBlockId: 'from-another-language',
    lastError: 'API_KEY="private-runtime-secret"',
    draftBlockIds: ['js-draft'],
    semanticIssues: [{ message: 'JS only' }],
    proEditor: {
      projectId: project.id,
      activeFile: path,
      selection: {
        path,
        startLine: 2,
        endLine: 2,
        startColumn: 1,
        endColumn: 6,
        documentVersion: 3,
        sourceHash: studioTutorSourceHash(content),
      },
      diagnostics: [
        {
          path,
          code: 'reportUndefinedVariable',
          source: 'pyright',
          line: 2,
          message: 'missing não definido',
          sourceHash: studioTutorSourceHash(content),
        },
        {
          path,
          code: 'old-diagnostic',
          source: 'pyright',
          line: 1,
          message: 'old',
          sourceHash: studioTutorSourceHash('old source'),
        },
      ],
    },
  })
  expect(context.environment?.programmingLanguage).toBe('python')
  expect(context.pro?.templateId).toBe('python-blank')
  expect(context.pro?.selection?.documentVersion).toBe(3)
  expect(context.pro?.diagnostics?.map((item) => item.code)).toEqual(['reportUndefinedVariable'])
  expect(context.code?.find((file) => file.path === path)?.content).toContain('print(missing)')
  expect(JSON.stringify(context)).not.toContain('do-not-send-this')
  expect(JSON.stringify(context)).not.toContain('private-runtime-secret')
  expect(context.blocks).toEqual([])
  expect(context.selectedBlockId).toBeNull()
  expect(context.behavior).toBeUndefined()
  expect(context.draftBlockIds).toBeUndefined()
  expect(context.semanticIssues).toBeUndefined()
  expect(context.python).toBeUndefined()
})

test('Classic Python keeps saved source distinct from a pending visual buffer and ignores stale caches', () => {
  const project = fixture('classic')
  if (project.kind !== 'classic') throw new Error('Classic fixture required')
  project.files['helper.py'] = 'password = "private-password"\nprint(42)\n'
  const workspace = {
    blocks: {
      blocks: [
        {
          id: 'print',
          type: 'sz_py_print',
          inputs: { VALUE: { block: { id: 'n', type: 'sz_py_number' } } },
        },
      ],
    },
  }
  project.blocksState = updatePythonWorkspaceDraft(
    project,
    'helper.py',
    createPythonWorkspaceDraft(project, 'helper.py', workspace, ['print']),
  )
  const input = {
    project,
    selectedBlockId: 'print',
    lastError: null,
    draftBlockIds: ['js-draft'],
    semanticIssues: [{ message: 'JS only' }],
  }
  const pending = buildStudioTutorContext(input)
  expect(pending.python?.activeFile).toBe('helper.py')
  expect(pending.python?.workspace).toBe('pending')
  expect(pending.blocks.map((block) => [block.id, block.parentId])).toEqual([
    ['print', undefined],
    ['n', 'print'],
  ])
  expect(pending.python?.source[0]?.content).toContain('print(42)')
  expect(JSON.stringify(pending)).not.toContain('private-password')
  expect(pending.code).toBeUndefined()
  expect(pending.behavior).toBeUndefined()
  expect(pending.draftBlockIds).toBeUndefined()
  expect(pending.semanticIssues).toBeUndefined()
  project.files['helper.py'] = 'print("new source")'
  const stale = buildStudioTutorContext(input)
  expect(stale.python?.activeFile).toBe('main.py')
  expect(stale.python?.workspace).toBe('unavailable')
  expect(stale.blocks).toEqual([])
  expect(JSON.stringify(stale)).not.toContain('private-password')
})

test('on-demand Classic capture describes the active live workspace only for its exact file source', () => {
  const project = fixture('classic')
  if (project.kind !== 'classic') throw new Error('Classic fixture required')
  project.files['helper.py'] = 'print(99)\n'
  const editor = {
    projectId: project.id,
    path: 'helper.py',
    sourceHash: studioTutorSourceHash(project.files['helper.py']),
    synchronization: 'ready' as const,
    workspace: { blocks: { blocks: [{ id: 'live-print', type: 'sz_py_print' }] } },
  }
  const input = { project, selectedBlockId: 'live-print', lastError: null, classicEditor: editor }
  const context = buildStudioTutorContext(input)
  expect(context.python?.activeFile).toBe('helper.py')
  expect(context.python?.workspace).toBe('ready')
  expect(context.blocks.map((block) => block.id)).toEqual(['live-print'])
  expect(context.python?.source[0]?.content).toContain('print(99)')
  for (const classicEditor of [
    { ...editor, projectId: 'other' },
    { ...editor, sourceHash: studioTutorSourceHash('old source') },
    { ...editor, path: '../outside.py' },
    { ...editor, path: 'secrets.py' },
  ]) {
    const stale = buildStudioTutorContext({ ...input, classicEditor })
    expect(stale.python?.activeFile).toBe('main.py')
    expect(stale.blocks).toEqual([])
  }
  const loading = buildStudioTutorContext({
    ...input,
    classicEditor: { ...editor, workspace: undefined, synchronization: 'unavailable' },
  })
  expect(loading.python?.workspace).toBe('unavailable')
  expect(loading.blocks).toEqual([])
})

test('a saved sensitive Python workspace never bypasses whole-file privacy filtering', () => {
  const project = fixture('classic')
  if (project.kind !== 'classic') throw new Error('Classic fixture required')
  project.files['secrets.py'] = 'values = ["family-private-value-123"]'
  const draft = createPythonWorkspaceDraft(
    project,
    'secrets.py',
    { blocks: { blocks: [{ id: 'private-block', type: 'sz_py_assign' }] } },
    ['private-block'],
  )
  project.blocksState = updatePythonWorkspaceDraft(project, draft.path, draft)
  const context = buildStudioTutorContext({
    project,
    selectedBlockId: 'private-block',
    lastError: null,
  })
  expect(context.python?.activeFile).toBe('main.py')
  expect(context.blocks).toEqual([])
  expect(JSON.stringify(context)).not.toContain('family-private-value-123')
})

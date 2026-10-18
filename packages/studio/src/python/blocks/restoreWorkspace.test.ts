import { expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import type { PythonParsedDocument } from '../language/types'
import { pythonVisualToWorkspace } from './blockly'
import { expression, integer, moduleNode } from './nodes'
import { pythonASTToVisual } from './projection'
import { preparePythonWorkspaceRestore } from './restoreWorkspace'
import type { PythonWorkspaceDraft } from './workspaceDraft'

test('settled cache must match authoritative Python, while pending text stays recoverable', () => {
  const workspace = new Blockly.Workspace()
  try {
    const tree = moduleNode([expression(integer('1'))])
    const rootIds = pythonVisualToWorkspace(pythonASTToVisual(tree), workspace)
    const document: PythonParsedDocument = {
      version: 1,
      language: 'python',
      source: '1\n',
      tree,
      diagnostics: [],
      tokens: [],
      identity: {
        projectId: 'project',
        instanceId: 'editor',
        path: 'main.py',
        revision: 'a'.repeat(64),
        generation: 1,
      },
    }
    const draft: PythonWorkspaceDraft = {
      kind: 'python-workspace-draft',
      version: 1,
      path: 'main.py',
      baseSource: '1\n',
      generation: 'gesture',
      pending: false,
      rootIds,
      workspace: Blockly.serialization.workspaces.save(workspace),
    }
    expect(preparePythonWorkspaceRestore(draft, document).rootIds).toEqual(rootIds)
    expect(() => preparePythonWorkspaceRestore({ ...draft, baseSource: '2\n' }, document)).toThrow(
      'código atual',
    )
    const number = workspace.getAllBlocks(false).find((block) => block.type === 'sz_py_integer')!
    number.setFieldValue('12a', 'NUMBER')
    draft.workspace = Blockly.serialization.workspaces.save(workspace)
    expect(() => preparePythonWorkspaceRestore(draft, document)).toThrow('restaurar')
    expect(preparePythonWorkspaceRestore({ ...draft, pending: true }, document).state).toEqual(
      draft.workspace,
    )
    expect(() =>
      preparePythonWorkspaceRestore({ ...draft, pending: true, rootIds: ['missing'] }, document),
    ).toThrow('restaurar')
    expect(document.source).toBe('1\n')
  } finally {
    workspace.dispose()
  }
})

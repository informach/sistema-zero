import { afterEach, expect, test } from 'bun:test'
import type { StudioProBuilderAdapter } from '@sistemazero/core/studio/pro-builder'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { createEmptyProject } from '../../core/project'
import type { ProjectTree } from '../../core/proProject'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { useProjectStore } from '../../state/projectStore'
import { StudioTutorProvider, useStudioTutor } from '../../studio/tutor'
import { studioTutorSourceHash } from '../../studio/tutorSafety'
import ProBuilderPanel from './ProBuilderPanel'

const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1QAAAAASUVORK5CYII='

afterEach(() => {
  cleanup()
  useProjectStore.setState({ project: null })
})

async function fixture(language: 'python' | 'javascript', assetPath?: string, diagnostic = false) {
  const project =
    language === 'javascript'
      ? {
          ...createEmptyProject('js-control', 'Control'),
          kind: 'pro' as const,
          mode: 'code' as const,
          tree: { 'main.ts': { kind: 'file' as const, content: 'export const n = 1' } },
          proMeta: { templateId: 'vanilla-vite', devScript: 'dev' },
        }
      : (await pythonEnvironmentFixture('pro')).project
  if (project.kind !== 'pro') throw new Error('Expected Pro')
  if (assetPath)
    project.assets = [
      {
        id: 'sprite',
        name: 'sprite',
        kind: 'image',
        source: 'upload',
        dataUrl: PNG,
        proPath: assetPath,
      },
    ]
  useProjectStore.setState({ project, editingAccess: 'author' })
  let captured: Parameters<StudioProBuilderAdapter['create']>[0] | undefined
  const adapter: StudioProBuilderAdapter = {
    create: async (input) => {
      captured = input
      throw new Error('QA_DISPATCHED')
    },
    latest: async () => null,
    cancel: async () => null,
  }
  const tree: ProjectTree = project.tree
  const path = language === 'python' ? 'main.py' : 'main.ts',
    node = tree[path]
  if (node?.kind !== 'file') throw new Error('Missing source fixture')
  const source = node.content
  function Capture() {
    const tutor = useStudioTutor()
    tutor.proCapture.current = () => ({
      projectId: project.id,
      activeFile: path,
      diagnostics: diagnostic
        ? [
            {
              path,
              code: language === 'python' ? 'reportGeneralTypeIssues' : 2322,
              line: 1,
              message: 'QA observed editor diagnostic',
              sourceHash: studioTutorSourceHash(source),
            },
          ]
        : [],
    })
    return <ProBuilderPanel adapter={adapter} projectId={project.id} />
  }
  const ui = render(
    <StudioTutorProvider value={null}>
      <Capture />
    </StudioTutorProvider>,
  )
  fireEvent.change(ui.getByLabelText('O que vamos construir?'), {
    target: { value: 'Adicionar pontuação' },
  })
  await waitFor(() =>
    expect(
      (ui.getByRole('button', { name: 'Preparar proposta' }) as HTMLButtonElement).disabled,
    ).toBe(false),
  )
  fireEvent.click(ui.getByRole('button', { name: 'Preparar proposta' }))
  await waitFor(() => expect(ui.queryByRole('alert')).not.toBeNull())
  expect(ui.getByRole('alert').textContent).toBe('QA_DISPATCHED')
  expect(captured).toBeDefined()
  expect(useProjectStore.getState().project).toBe(project)
  return { captured: captured!, project, path, source }
}

test.each([
  undefined,
  'assets/sprite.png',
  'dist/sprite.png',
])('Python builder panel admits its portable revision and material %s', async (path) => {
  const f = await fixture('python', path)
  expect(f.captured.base.version).toBe(2)
  if (path) expect(Object.keys(f.captured.binaries)).toEqual([path])
})

test('JavaScript builder keeps its existing envelope', async () => {
  const f = await fixture('javascript')
  expect(f.captured.base.version ?? 1).toBe(1)
})

test.each([
  'python',
  'javascript',
] as const)('builder diagnostic provenance remains %s', async (language) => {
  const f = await fixture(language, undefined, true)
  expect(f.captured.request?.baseline).toEqual({
    revisionHash: f.captured.base.hash,
    source: language === 'python' ? 'pyright' : 'typescript',
    diagnostics: [
      {
        path: f.path,
        line: 1,
        message: 'QA observed editor diagnostic',
        sourceHash: studioTutorSourceHash(f.source),
      },
    ],
  })
})

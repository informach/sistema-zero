import { expect, mock, test } from 'bun:test'
import { act, fireEvent, render } from '@testing-library/react'
import { type ReactNode, useState } from 'react'
import type { PythonBlocklyEditorProps } from '../../../components/blocks/PythonBlocklyEditor'
import type { PythonSourceEditorProps } from '../../../components/code/PythonSourceEditor'
import { loadPythonAuthoring } from '../../../python/blocks/authoring'
import { PYTHON_PROGRAMMING_CODECS } from '../../../python/blocks/catalog'
import {
  createPythonWorkspaceDraft,
  updatePythonWorkspaceDraft,
} from '../../../python/blocks/workspaceDraft'
import { PYTHON_TURTLE_CODECS } from '../../../python/extensions/turtle/catalog'
import { createStudioRuntimeAuthority } from '../../../runtime/authority'
import { TURTLE_EXTENSION } from '../../../runtime/python/turtle/contract'
import { pythonEnvironmentFixture } from '../../../state/fixtures/pythonEnvironment'
import { StudioStoresContext } from '../../../state/storesContext'
import { createStudioStores } from '../../../state/studioStores'
import { StudioRuntimeEnvironmentProvider } from '../../../studio/runtime-environment'

// The native Next/Monaco gate covers the real engines. Isolate their UI boundary here to
// reproduce reconciliation without loading an interpreter or borrowing another suite's mocks.
mock.module('react-resizable-panels', () => ({
  PanelGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Panel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PanelResizeHandle: () => <div />,
}))
mock.module('../../../components/blocks/PythonBlocklyEditor', () => ({
  PythonBlocklyEditor: ({ palette }: PythonBlocklyEditorProps) => (
    <div
      data-testid="qualified-blocks"
      data-blocks={palette.entries.map((entry) => entry.id).join(',')}
    />
  ),
}))
mock.module('../../../components/preview/PythonEditorPreview', () => ({
  PythonEditorPreview: () => <div data-testid="preview-boundary" />,
}))
mock.module('../../../components/code/PythonSourceEditor', () => ({
  PythonSourceEditor: ({ activeFile, onActiveFileChange }: PythonSourceEditorProps) => {
    const [value, setValue] = useState('buffer local ainda aberto')
    return (
      <>
        <output aria-label="Arquivo fonte atual">{activeFile}</output>
        <button type="button" onClick={() => onActiveFileChange?.('README.txt')}>
          Abrir README
        </button>
        <button type="button" onClick={() => onActiveFileChange?.('config.json')}>
          Abrir configuração
        </button>
        <textarea
          aria-label="Fonte da instância"
          value={value}
          onChange={(event) => setValue(event.currentTarget.value)}
        />
      </>
    )
  },
}))
const { PythonClassicMode } = await import('../PythonClassicMode')

test('lease withdrawal/renewal preserves the open source while removing the old block authority', async () => {
  const fixture = await pythonEnvironmentFixture('classic')
  const stores = createStudioStores({ persistence: 'none' })
  stores.project.setState({ project: fixture.project })
  stores.ui.setState({ showPreview: false })
  const approval = {
    runtime: fixture.project.runtime,
    blockIds: PYTHON_PROGRAMMING_CODECS.map((codec) => codec.id),
  }
  const first = { ...fixture.environment, pythonAuthoring: [approval] }
  const restricted = { ...fixture.environment, pythonAuthoring: [{ ...approval, blockIds: [] }] }
  const unavailable = { ...fixture.environment, pythonAuthoring: [] }
  const content = (environment: typeof fixture.environment | null) => (
    <StudioStoresContext.Provider value={stores}>
      <StudioRuntimeEnvironmentProvider value={environment}>
        <PythonClassicMode mode="bridge" />
      </StudioRuntimeEnvironmentProvider>
    </StudioStoresContext.Provider>
  )
  const view = render(content(first))
  const blocks = await view.findByTestId('qualified-blocks')
  expect(blocks.getAttribute('data-blocks')).not.toBe('')
  const source = await view.findByRole('textbox', { name: 'Fonte da instância' })
  if (!(source instanceof HTMLTextAreaElement)) throw new Error('Expected the source editor input')
  fireEvent.change(source, { target: { value: 'minha edição antes de renovar' } })
  source.setSelectionRange(4, 10)
  await act(async () => view.rerender(content(null)))
  expect(view.queryByTestId('qualified-blocks')).toBeNull()
  expect(source.isConnected).toBe(true)
  expect(view.getByRole('textbox', { name: 'Fonte da instância' })).toBe(source)
  expect(source.value).toBe('minha edição antes de renovar')
  expect([source.selectionStart, source.selectionEnd]).toEqual([4, 10])
  await act(async () => view.rerender(content(restricted)))
  expect((await view.findByTestId('qualified-blocks')).getAttribute('data-blocks')).toBe('')
  expect(view.getByRole('textbox', { name: 'Fonte da instância' })).toBe(source)
  await act(async () => view.rerender(content(unavailable)))
  await view.findByText('Os blocos Python deste projeto ainda não estão disponíveis neste espaço.')
  expect(view.queryByTestId('qualified-blocks')).toBeNull()
  expect(view.getByRole('textbox', { name: 'Fonte da instância' })).toBe(source)
  expect(source.value).toBe('minha edição antes de renovar')
  expect(stores.project.getState().project?.id).toBe(fixture.project.id)
})

test('blocks mode keeps its file recovery without mounting a hidden source editor when qualified', async () => {
  const fixture = await pythonEnvironmentFixture('classic')
  const stores = createStudioStores({ persistence: 'none' })
  stores.project.setState({ project: fixture.project })
  stores.ui.setState({ showPreview: false })
  const qualified = {
    ...fixture.environment,
    pythonAuthoring: [
      {
        runtime: fixture.project.runtime,
        blockIds: PYTHON_PROGRAMMING_CODECS.map((codec) => codec.id),
      },
    ],
  }
  const content = (environment: typeof fixture.environment | null) => (
    <StudioStoresContext.Provider value={stores}>
      <StudioRuntimeEnvironmentProvider value={environment}>
        <PythonClassicMode mode="blocks" />
      </StudioRuntimeEnvironmentProvider>
    </StudioStoresContext.Provider>
  )
  const view = render(content(null))
  expect(await view.findByRole('textbox', { name: 'Fonte da instância' })).toBeTruthy()
  expect(view.queryByTestId('qualified-blocks')).toBeNull()
  await act(async () => view.rerender(content(qualified)))
  expect(await view.findByTestId('qualified-blocks')).toBeTruthy()
  expect(view.queryByRole('textbox', { name: 'Fonte da instância' })).toBeNull()
  await act(async () => view.rerender(content(null)))
  expect(await view.findByRole('textbox', { name: 'Fonte da instância' })).toBeTruthy()
  expect(view.queryByTestId('qualified-blocks')).toBeNull()
})

test('switching project identity still retires the previous source buffer', async () => {
  const fixture = await pythonEnvironmentFixture('classic')
  const stores = createStudioStores({ persistence: 'none' })
  stores.project.setState({ project: fixture.project })
  stores.ui.setState({ showPreview: false })
  const qualified = {
    ...fixture.environment,
    pythonAuthoring: [
      {
        runtime: fixture.project.runtime,
        blockIds: PYTHON_PROGRAMMING_CODECS.map((codec) => codec.id),
      },
    ],
  }
  const view = render(
    <StudioStoresContext.Provider value={stores}>
      <StudioRuntimeEnvironmentProvider value={qualified}>
        <PythonClassicMode mode="bridge" />
      </StudioRuntimeEnvironmentProvider>
    </StudioStoresContext.Provider>,
  )
  const source = await view.findByRole('textbox', { name: 'Fonte da instância' })
  fireEvent.change(source, { target: { value: 'intenção do projeto A' } })
  await act(async () =>
    stores.project.setState({ project: { ...fixture.project, id: 'project-B' } }),
  )
  const next = await view.findByRole('textbox', { name: 'Fonte da instância' })
  if (!(next instanceof HTMLTextAreaElement)) throw new Error('Expected the new source input')
  expect(next).not.toBe(source)
  expect(source.isConnected).toBe(false)
  expect(next.value).toBe('buffer local ainda aberto')
  expect(stores.project.getState().project?.id).toBe('project-B')
})

test('blocks source recovery opens non-Python files while qualified blocks stay on Python files', async () => {
  const fixture = await pythonEnvironmentFixture('classic')
  if (fixture.project.kind !== 'classic') throw new Error('Expected the classic recovery fixture')
  fixture.project.files['README.txt'] = 'Ajuda do projeto'
  fixture.project.files['config.json'] = '{"lives":3}'
  const stores = createStudioStores({ persistence: 'none' })
  stores.project.setState({ project: fixture.project })
  stores.ui.setState({ showPreview: false })
  const qualified = {
    ...fixture.environment,
    pythonAuthoring: [
      {
        runtime: fixture.project.runtime,
        blockIds: PYTHON_PROGRAMMING_CODECS.map((codec) => codec.id),
      },
    ],
  }
  const content = (environment: typeof fixture.environment | null) => (
    <StudioStoresContext.Provider value={stores}>
      <StudioRuntimeEnvironmentProvider value={environment}>
        <PythonClassicMode mode="blocks" />
      </StudioRuntimeEnvironmentProvider>
    </StudioStoresContext.Provider>
  )
  const view = render(content(null))
  await view.findByRole('textbox', { name: 'Fonte da instância' })
  fireEvent.click(view.getByRole('button', { name: 'Abrir README' }))
  expect(view.getByLabelText('Arquivo fonte atual').textContent).toBe('README.txt')
  fireEvent.click(view.getByRole('button', { name: 'Abrir configuração' }))
  expect(view.getByLabelText('Arquivo fonte atual').textContent).toBe('config.json')
  await act(async () => view.rerender(content(qualified)))
  await view.findByTestId('qualified-blocks')
  expect(view.queryByRole('textbox', { name: 'Fonte da instância' })).toBeNull()
  expect(view.getByRole('combobox', { name: 'Arquivo Python' }).textContent).not.toContain(
    'README.txt',
  )
  expect(view.getByRole('combobox', { name: 'Arquivo Python' }).textContent).not.toContain(
    'config.json',
  )
})

test('same environment refreshes curation and grants without replacing the source, draft or visual instance', async () => {
  const fixture = await pythonEnvironmentFixture('classic')
  if (fixture.project.kind !== 'classic') throw new Error('Expected a classic fixture')
  const draft = createPythonWorkspaceDraft(
    fixture.project,
    'main.py',
    { blocks: { blocks: [] } },
    [],
  )
  const project = {
    ...fixture.project,
    blocksState: updatePythonWorkspaceDraft(fixture.project, 'main.py', draft),
    installedExtensions: [{ ...TURTLE_EXTENSION, installedAt: 1 }],
  }
  const stores = createStudioStores({ persistence: 'none' })
  stores.project.setState({ project })
  stores.ui.setState({ showPreview: false })
  const initial = {
    available: true,
    pythonAuthoring: [
      {
        runtime: project.runtime,
        blockIds: [...PYTHON_PROGRAMMING_CODECS, ...PYTHON_TURTLE_CODECS].map((item) => item.id),
      },
    ],
    capabilities: ['edit' as const],
    grantedExtensionIds: [TURTLE_EXTENSION.id],
    curation: { pythonLevel: 3 as const },
    releaseStatus: 'active' as const,
  }
  const current = createStudioRuntimeAuthority(initial)
  const environment = {
    ...fixture.environment,
    pythonAuthoring: initial.pythonAuthoring,
    authority: current.authority,
  }
  const loaded = await loadPythonAuthoring(project, environment)
  const view = render(
    <StudioStoresContext.Provider value={stores}>
      <StudioRuntimeEnvironmentProvider value={environment}>
        <PythonClassicMode mode="bridge" />
      </StudioRuntimeEnvironmentProvider>
    </StudioStoresContext.Provider>,
  )
  const blocks = await view.findByTestId('qualified-blocks')
  const source = await view.findByRole('textbox', { name: 'Fonte da instância' })
  if (!(source instanceof HTMLTextAreaElement)) throw new Error('Expected a source buffer')
  fireEvent.change(source, { target: { value: 'buffer ainda não salvo' } })
  expect(blocks.getAttribute('data-blocks')).toContain('sz_py_turtle_module_forward')
  expect(blocks.getAttribute('data-blocks')).toContain('sz_py_integer')
  const stored = stores.project.getState().project
  await act(async () =>
    current.update({ ...initial, curation: { pythonLevel: 1, allowBlocks: ['sz_py_pass'] } }),
  )
  expect(blocks.getAttribute('data-blocks')).toBe('sz_py_pass')
  expect(view.getByTestId('qualified-blocks')).toBe(blocks)
  await act(async () => current.update({ ...initial, grantedExtensionIds: [] }))
  expect(blocks.getAttribute('data-blocks')).toContain('sz_py_integer')
  expect(blocks.getAttribute('data-blocks')).not.toContain('sz_py_turtle_')
  await act(async () =>
    current.update({
      ...initial,
      grantedExtensionIds: [],
      curation: { pythonLevel: 3, allowBlocks: ['sz_py_turtle_module_forward'] },
    }),
  )
  expect(blocks.getAttribute('data-blocks')).toBe('')
  expect(view.getByTestId('qualified-blocks')).toBe(blocks)
  // Codecs remain loaded for saved installed blocks; only the offer changes.
  expect(loaded.codecs.some((codec) => codec.id === 'sz_py_turtle_module_forward')).toBe(true)
  expect(stores.project.getState().project).toBe(stored)
  expect(project.installedExtensions).toEqual([{ ...TURTLE_EXTENSION, installedAt: 1 }])
  await act(async () =>
    current.update({
      ...initial,
      pythonAuthoring: [{ runtime: project.runtime, blockIds: ['sz_py_pass'] }],
    }),
  )
  expect(blocks.getAttribute('data-blocks')).toBe('sz_py_pass')
  await act(async () => current.update({ ...initial, available: false }))
  expect(blocks.getAttribute('data-blocks')).toBe('')
  expect(view.getByTestId('qualified-blocks')).toBe(blocks)
  expect(view.getByRole('textbox', { name: 'Fonte da instância' })).toBe(source)
  expect(source.value).toBe('buffer ainda não salvo')
  expect(stores.project.getState().project).toBe(stored)
})

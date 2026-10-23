import { expect, it, spyOn } from 'bun:test'
import { act, fireEvent, render } from '@testing-library/react'
import { isPythonProject } from '../../core/editableProject'
import { buildProAssetBundle } from '../../core/proAssets'
import { createEmptyProject, type ProjectAsset } from '../../core/project'
import { buildPythonAssetBundle } from '../../core/pythonAssets'
import { pythonProAssetExample } from '../../python/proExamples'
import { TURTLE_EXTENSION } from '../../runtime/python/turtle/contract'
import { documentFixture } from '../../state/fixtures/projectDocuments'
import { refinePythonProjectDocument } from '../../state/pythonProjectValidation'
import { StudioStoresContext } from '../../state/storesContext'
import { createStudioStores } from '../../state/studioStores'
import * as materializer from './editorAssetEntries'
import { editorAssetEntries } from './editorAssetEntries'
import { ProAssetPaths } from './ProAssetPaths'

it('ignores a late Python materialization after JS → Python → JS with the same project ID and assets', async () => {
  const assets: ProjectAsset[] = [
    {
      id: 'shared',
      name: 'nave',
      kind: 'image',
      source: 'upload',
      dataUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
    },
  ]
  const js = { ...createEmptyProject('same-owner', 'Jogo'), kind: 'pro' as const, assets }
  const python = {
    ...(await refinePythonProjectDocument({ ...documentFixture('python', 'pro'), assets })),
    id: js.id,
    assets,
  }
  const jsPath = (await buildProAssetBundle(assets)).manifest.assets[0]!.url
  const pythonPath = (await buildPythonAssetBundle(assets)).manifest.assets[0]!.path
  const stores = createStudioStores({ persistence: 'none' })
  stores.project.setState({ project: js })
  const queries: string[] = []
  const view = render(
    <StudioStoresContext.Provider value={stores}>
      <ProAssetPaths assets={assets} expanded onFindUses={(query) => queries.push(query)} />
    </StudioStoresContext.Provider>,
  )
  await view.findByText(jsPath)
  const entered = Promise.withResolvers<void>(),
    gate = Promise.withResolvers<void>()
  const actual = materializer.editorAssetEntries
  let intercept = true
  // Delay delivery only: paths, hashes and binary materialization still come from production.
  const delayed = spyOn(materializer, 'editorAssetEntries').mockImplementation(async (...args) => {
    const entries = await actual(...args)
    if (args[1] === 'python' && intercept) {
      intercept = false
      entered.resolve()
      await gate.promise
    }
    return entries
  })
  try {
    await act(async () => stores.project.setState({ project: python }))
    await entered.promise
    expect(view.queryByText(jsPath)).toBeNull()
    await act(async () => stores.project.setState({ project: js }))
    await view.findByText(jsPath)
    await act(async () => gate.resolve())
    expect(view.queryByText(pythonPath)).toBeNull()
    fireEvent.click(view.getByRole('button', { name: 'Buscar caminho no código' }))
    expect(queries.at(-1)).toBe(jsPath)
    await act(async () => stores.project.setState({ project: python }))
    await view.findByText(pythonPath)
    fireEvent.click(view.getByRole('button', { name: 'Buscar caminho no código' }))
    expect(queries.at(-1)).toBe(pythonPath)
    expect(view.queryByText(/public\//)).toBeNull()
  } finally {
    gate.resolve()
    delayed.mockRestore()
    view.unmount()
  }
})

it('filters canonical materials, opens only requested previews and sends literal usage queries', async () => {
  const assets: ProjectAsset[] = [
    {
      id: 'star',
      name: 'estrela',
      kind: 'image',
      source: 'upload',
      dataUrl:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZwoAAAAASUVORK5CYII=',
    },
  ]
  const queries: string[] = []
  const view = render(
    <ProAssetPaths assets={assets} expanded onFindUses={(query) => queries.push(query)} />,
  )
  await view.findByText('estrela')
  expect(view.queryByRole('img')).toBeNull()
  expect(view.queryByRole('button', { name: 'Copiar exemplo' })).toBeNull()
  fireEvent.click(view.getByRole('button', { name: 'Prévia de estrela' }))
  expect(view.getByRole('img').getAttribute('src')).toBe(assets[0]!.dataUrl)
  fireEvent.click(view.getByRole('button', { name: 'Buscar caminho no código' }))
  fireEvent.click(view.getByRole('button', { name: 'Buscar ID no código' }))
  expect(queries[0]).toMatch(/^studio-assets\/[a-f0-9]+\.png$/)
  expect(queries[1]).toBe('star')
  fireEvent.change(view.getByRole('searchbox'), { target: { value: 'missing' } })
  expect(view.queryByRole('img')).toBeNull()
  expect(view.getByText('Nenhum material encontrado.')).toBeDefined()
})

it('shows exactly the Python runtime paths, including a root GIF, and preserves extension ownership', async () => {
  for (const proPath of [undefined, 'nave.gif']) {
    const asset: ProjectAsset = {
      id: 'ship',
      name: 'nave',
      kind: 'image',
      source: 'upload',
      ...(proPath ? { proPath } : {}),
      dataUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    }
    const input = documentFixture('python', 'pro')
    input.assets = [asset]
    const project = await refinePythonProjectDocument(input)
    if (!isPythonProject(project)) throw new Error('Python fixture')
    const stores = createStudioStores({ persistence: 'none' })
    stores.project.getState().hydrateProject(project)
    const queries: string[] = []
    const view = render(
      <StudioStoresContext.Provider value={stores}>
        <ProAssetPaths
          assets={project.assets ?? []}
          path="src/main.py"
          expanded
          onFindUses={(query) => queries.push(query)}
        />
      </StudioStoresContext.Provider>,
    )
    await view.findByText('nave')
    expect(view.queryByRole('alert')).toBeNull()
    expect(view.queryByText(/public\//)).toBeNull()
    fireEvent.click(view.getByRole('button', { name: 'Buscar caminho no código' }))
    const bundle = await buildPythonAssetBundle(project.assets)
    expect(queries).toEqual([bundle.manifest.assets[0]!.path])
    const entries = await editorAssetEntries(project.assets ?? [], 'python', {
      files: [],
      directories: [],
    })
    expect(pythonProAssetExample(entries[0]!, 'main.py', project)).toBeNull()
    const installed = { ...project, installedExtensions: [{ ...TURTLE_EXTENSION, installedAt: 1 }] }
    expect(pythonProAssetExample(entries[0]!, 'main.py', installed)?.code).toContain(
      `caminho = ${JSON.stringify(queries[0])}`,
    )
    expect(pythonProAssetExample(entries[0]!, 'main.js', installed)).toBeNull()
    await act(async () => stores.project.getState().setPythonFile('src/main.py', 'print(2)'))
    expect(view.queryByText('Lendo materiais…')).toBeNull()
    expect(view.getByText('nave')).toBeDefined()
    view.unmount()
  }
})

it('refuses a material path colliding with a Python source rather than offering a broken path', async () => {
  const asset: ProjectAsset = {
    id: 'x',
    name: 'x',
    kind: 'image',
    source: 'upload',
    proPath: 'nave.gif',
    dataUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  }
  await expect(
    editorAssetEntries([asset], 'python', { files: ['nave.gif'], directories: [] }),
  ).rejects.toThrow('colide')
})

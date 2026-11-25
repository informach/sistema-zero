import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import { createEmptyProject } from '#core'
import {
  getPersonalAsset,
  getPersonalAssetsNamespace,
  setPersonalAssetsNamespace,
} from '../../asset-library/personal'
import {
  PINTA_REGIONAL_PERSONAL_CAPTURE,
  savePersonalRegionalMap,
} from '../../asset-library/personalRegional'
import { useProjectStore } from '../../state/projectStore'
import { regionalSceneMaterial } from '../../testing/pintaRegionalMaterialFixture'
import { AssetsPanel } from './AssetsPanel'

const previousIdb = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
const previousNamespace = getPersonalAssetsNamespace()
beforeAll(() => {
  Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory(), configurable: true })
})
afterEach(() => {
  cleanup()
  useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  setPersonalAssetsNamespace(previousNamespace)
})
afterAll(() => {
  if (previousIdb) Object.defineProperty(globalThis, 'indexedDB', previousIdb)
  else Reflect.deleteProperty(globalThis, 'indexedDB')
})

test('a confirmação exclui a revisão mostrada e preserva uma revisão criada em outra aba', async () => {
  const namespace = `panel-regional-${crypto.randomUUID()}`
  const asset = await regionalSceneMaterial()
  const input = {
    id: asset.regional.sourceId,
    name: asset.name,
    dataUrl: asset.dataUrl,
    width: asset.width,
    height: asset.height,
  }
  const options = { namespace, capability: PINTA_REGIONAL_PERSONAL_CAPTURE } as const
  const first = await savePersonalRegionalMap(input, { ...options, expectedRevision: null })
  if (!first.ok) throw new Error(first.error)
  setPersonalAssetsNamespace(namespace)
  useProjectStore.setState({
    project: createEmptyProject(crypto.randomUUID(), 'Meu jogo'),
    isDirty: false,
  })
  render(<AssetsPanel open onClose={() => {}} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Excluir' }))
  await screen.findByRole('dialog', { name: 'Excluir dos seus desenhos?' })
  const second = await savePersonalRegionalMap(input, {
    ...options,
    expectedRevision: first.revision,
  })
  if (!second.ok) throw new Error(second.error)
  fireEvent.focus(window)
  const confirmation = await screen.findByRole('dialog', { name: 'Excluir dos seus desenhos?' })
  fireEvent.click(within(confirmation).getByRole('button', { name: 'Excluir' }))
  await waitFor(() =>
    expect(screen.queryByRole('dialog', { name: 'Excluir dos seus desenhos?' }) === null).toBe(
      true,
    ),
  )
  expect((await getPersonalAsset(input.id, { namespace }))?.updatedAt).toBe(second.updatedAt)
  fireEvent.click(await screen.findByRole('button', { name: 'Excluir' }))
  const current = await screen.findByRole('dialog', { name: 'Excluir dos seus desenhos?' })
  fireEvent.click(within(current).getByRole('button', { name: 'Excluir' }))
  await waitFor(async () => expect(await getPersonalAsset(input.id, { namespace })).toBeNull())
})

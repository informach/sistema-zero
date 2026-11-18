import { expect, it } from 'bun:test'
import 'fake-indexeddb/auto'
import { act, renderHook } from '@testing-library/react'
import { createEmptyProject } from '#core'
import { captureProjectStorageScope, setProjectStorageNamespace } from './projectStorageRuntime'
import { createLocalPersistenceAdapter, useProjectStore } from './projectStore'
import { useStudioPersistence } from './studioStores'

it('standalone persistence follows the active profile lifetime without crossing its database', async () => {
  const previousNamespace = captureProjectStorageScope().namespace
  const firstNamespace = `run-first-${crypto.randomUUID()}`
  const secondNamespace = `run-second-${crypto.randomUUID()}`
  const projectId = crypto.randomUUID()
  try {
    setProjectStorageNamespace(firstNamespace)
    useProjectStore.setState({ project: createEmptyProject(projectId, 'Perfil A'), isDirty: true })
    const { result, rerender, unmount } = renderHook(useStudioPersistence)
    const firstService = result.current
    await act(async () => firstService.save())
    rerender()
    expect(result.current).toBe(firstService)

    setProjectStorageNamespace(secondNamespace)
    useProjectStore.setState({ project: createEmptyProject(projectId, 'Perfil B'), isDirty: true })
    rerender()
    expect(result.current).not.toBe(firstService)
    await act(async () => result.current.save())
    expect(
      (await createLocalPersistenceAdapter({ namespace: firstNamespace }).load(projectId))?.name,
    ).toBe('Perfil A')
    expect(
      (await createLocalPersistenceAdapter({ namespace: secondNamespace }).load(projectId))?.name,
    ).toBe('Perfil B')
    const secondService = result.current
    setProjectStorageNamespace(firstNamespace)
    rerender()
    expect(result.current).not.toBe(firstService)
    expect(result.current).not.toBe(secondService)
    unmount()
  } finally {
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
    setProjectStorageNamespace(previousNamespace)
  }
})

it('trocar de perfil com projeto não salvo grava no perfil antigo e nunca no novo', async () => {
  const previousNamespace = captureProjectStorageScope().namespace
  const firstNamespace = `leak-first-${crypto.randomUUID()}`
  const secondNamespace = `leak-second-${crypto.randomUUID()}`
  const projectId = crypto.randomUUID()
  try {
    setProjectStorageNamespace(firstNamespace)
    useProjectStore.setState({ project: createEmptyProject(projectId, 'Perfil A'), isDirty: true })
    const { result, rerender, unmount } = renderHook(useStudioPersistence)
    // Sem rerender e sem trocar o projeto à mão: é o caso que vazava.
    setProjectStorageNamespace(secondNamespace)
    rerender()
    await act(async () => result.current.save())
    await act(async () => Bun.sleep(20))
    expect(
      (await createLocalPersistenceAdapter({ namespace: firstNamespace }).load(projectId))?.name,
    ).toBe('Perfil A')
    expect(
      await createLocalPersistenceAdapter({ namespace: secondNamespace }).load(projectId),
    ).toBeNull()
    unmount()
  } finally {
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
    setProjectStorageNamespace(previousNamespace)
  }
})

/**
 * Mapas projetados usam os mesmos cartões e ações da oficina, sem galeria paralela.
 */
import { afterEach, beforeEach, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { pintaWorkshopAssetToJson } from '../../export/workshopDocument'
import { clearIdbMock } from '../../testing/idbMock'
import { nativeNineGallery } from '../../testing/nativeNineFixtures'

const { PintaApp } = await import('../PintaApp')
const { setPintaStorageNamespace } = await import('../../state/persistence')
const { createWorkshopPintaPersistence } = await import('../../state/workshopPersistence')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})
afterEach(cleanup)

async function gallery(maps: 'one' | 'two' | 'none') {
  const namespace = `galeria-projetada-${maps}`
  setPintaStorageNamespace(namespace)
  const { sheet, hex, iso } = await nativeNineGallery()
  const persistence = createWorkshopPintaPersistence({ namespace })
  await persistence.persistAssets(
    maps === 'none' ? [sheet] : maps === 'one' ? [sheet, iso] : [sheet, hex, iso],
  )
  render(<PintaApp persistence={persistence} />)
  await waitFor(() => expect(screen.getByRole('button', { name: /Abrir chao/ })).toBeTruthy())
}

test('um mapa projetado aparece no catálogo comum com as ações de autoria', async () => {
  await gallery('one')
  expect(await screen.findByRole('button', { name: /Abrir praca/ })).toBeTruthy()
  expect(screen.getByRole('button', { name: /Renomear praca/ })).toBeTruthy()
  expect(screen.getByRole('button', { name: /Duplicar praca/ })).toBeTruthy()
  expect(screen.queryByRole('alert')).toBeNull()
})

test('as duas projeções aparecem ao lado dos outros desenhos', async () => {
  await gallery('two')
  expect(await screen.findByRole('button', { name: /Abrir colmeia/ })).toBeTruthy()
  expect(screen.getByRole('button', { name: /Abrir praca/ })).toBeTruthy()
  expect(screen.queryByRole('alert')).toBeNull()
})

test('sem mapa projetado, a galeria não mostra aviso', async () => {
  await gallery('none')
  expect(screen.queryByRole('alert')).toBeNull()
})

test('um leitor preparado sem gravador 9 abre o mesmo mapa para leitura e não oferece uma edição que não pode guardar', async () => {
  const namespace = 'galeria-leitor-antes-gravador'
  setPintaStorageNamespace(namespace)
  const { sheet, iso } = await nativeNineGallery()
  const source = createWorkshopPintaPersistence({ namespace })
  await source.persistAssets([sheet, iso])
  const original = pintaWorkshopAssetToJson((await source.loadAssetById(iso.id))!)
  const reader = createWorkshopPintaPersistence({ namespace, nativeCeiling: 8 })
  render(<PintaApp persistence={reader} />)
  fireEvent.click(await screen.findByRole('button', { name: /Abrir praca/ }))
  await screen.findByText(
    'Este mapa está disponível para leitura nesta versão do Pinta. Você pode explorar e baixar o original.',
  )
  expect(screen.getByRole('button', { name: 'Pincel' }).hasAttribute('disabled')).toBe(true)
  expect(screen.queryByRole('button', { name: 'Criar autorregras' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
  await screen.findByRole('button', { name: /Abrir praca/ })
  expect(pintaWorkshopAssetToJson((await reader.loadAssetById(iso.id))!)).toBe(original)
})

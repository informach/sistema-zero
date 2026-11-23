/**
 * Mapa projetado guardado na oficina: esta versão ainda não o abre. A galeria avisa no mesmo
 * formato do aviso de desenho mais novo, sem cartão e sem ação nova; o resto continua igual.
 */
import { afterEach, beforeEach, expect, test } from 'bun:test'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../core/copy'
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

test('um mapa projetado: aviso com o nome, sem cartão nem botão de atualizar', async () => {
  await gallery('one')
  const aviso = await screen.findByRole('alert')
  expect(aviso.textContent).toBe(
    'O mapa "praca" ainda não abre nesta versão do Pinta. Ele continua guardado.',
  )
  expect(screen.queryByRole('button', { name: /Abrir praca/ })).toBeNull()
  expect(screen.queryByRole('button', { name: COPY.gallery.newerFormatReload })).toBeNull()
})

test('dois mapas projetados: a contagem aparece na frase', async () => {
  await gallery('two')
  expect((await screen.findByRole('alert')).textContent).toBe(
    '2 mapas ainda não abrem nesta versão do Pinta. Eles continuam guardados.',
  )
})

test('sem mapa projetado, a galeria não mostra aviso', async () => {
  await gallery('none')
  expect(screen.queryByRole('alert')).toBeNull()
})

import { afterEach, expect, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../core/copy'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { createMemoryPersistence } from '../state/memoryPersistence'
import { setMoldaGenerationStoreFactory } from '../state/persistence'
import { createScenePersistence } from '../state/scenePersistence'
import { DOCUMENT_KEY_PREFIX } from '../state/storageKeys'
import { makeModel, makeTexture } from '../testing/fixtures'
import { nativeDatabase } from '../testing/nativeDatabase'
import { MoldaApp } from './MoldaApp'

afterEach(() => setMoldaGenerationStoreFactory(null))

/**
 * A oficina abre com trabalho assíncrono próprio (leitura do registro, aviso de
 * armazenamento). Desmontar no meio disso derruba avisos de `act` que são do teste,
 * não do componente: aqui o estado assenta DENTRO do act antes de a montagem acabar.
 */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

async function withGeneration() {
  const db = await nativeDatabase()
  setMoldaGenerationStoreFactory(() => db.store)
  const persistence = createScenePersistence(db.store)
  const scene = migrateLegacyModel({ ...makeModel(), name: 'nave' }).document
  await persistence.save(scene, null)
  return { db, scene }
}

test('com a oficina seguinte ligada, a galeria mostra as duas gerações numa lista só', async () => {
  const { db, scene } = await withGeneration()
  const legacy = { ...makeModel(), id: 'antigo', name: 'carro', updatedAt: 1 }
  const view = render(
    <MoldaApp persistence={createMemoryPersistence([legacy])} adapter={{ sceneWorkshop: true }} />,
  )
  try {
    const card = await screen.findByRole('button', { name: COPY.a11y.assetCard('nave', 'Modelo') })
    expect(
      screen.getByRole('button', { name: COPY.a11y.assetCard('carro', 'Modelo') }) !== null,
    ).toBe(true)
    // Abrir a criação da geração seguinte monta a OFICINA, não o editor antigo.
    fireEvent.click(card)
    await waitFor(() => expect(screen.queryByText(COPY.scene.development) !== null).toBe(true))
    await settle()
    expect(screen.queryByRole('heading', { name: COPY.gallery.title })).toBe(null)
    expect(scene.formatVersion).toBe(2)
  } finally {
    view.unmount()
    db.close()
  }
})

test('sem a oficina seguinte, a criação da geração nova não aparece e o app segue igual', async () => {
  const db = await nativeDatabase()
  const persistence = createScenePersistence(db.store)
  await persistence.save(migrateLegacyModel({ ...makeModel(), name: 'nave' }).document, null)
  // Sem a capacidade o app nem pede o banco da geração seguinte.
  setMoldaGenerationStoreFactory(() => {
    throw new Error('a oficina seguinte não deveria ser aberta')
  })
  const legacy = { ...makeModel(), id: 'antigo', name: 'carro' }
  const view = render(<MoldaApp persistence={createMemoryPersistence([legacy])} />)
  try {
    await screen.findByRole('button', { name: COPY.a11y.assetCard('carro', 'Modelo') })
    expect(screen.queryByRole('button', { name: COPY.a11y.assetCard('nave', 'Modelo') })).toBe(null)
  } finally {
    view.unmount()
    db.close()
  }
})

test('abrir um modelo antigo com a oficina ligada promove a criação e abre na oficina', async () => {
  const { db } = await withGeneration()
  const legacy = { ...makeModel(), id: 'antigo', name: 'carro', updatedAt: 1 }
  // O app real tem UM banco: a galeria v1 e a oficina seguinte leem o mesmo registro.
  await db.seed(`${DOCUMENT_KEY_PREFIX}${legacy.id}`, { ...legacy, formatVersion: 1 })
  const view = render(
    <MoldaApp persistence={createMemoryPersistence([legacy])} adapter={{ sceneWorkshop: true }} />,
  )
  try {
    const card = await screen.findByRole('button', { name: COPY.a11y.assetCard('carro', 'Modelo') })
    fireEvent.click(card)
    await waitFor(() => expect(screen.queryByText(COPY.scene.development) !== null).toBe(true))
    await settle()
    // Promover é gravar o formato novo: o registro antigo sai e o da cena entra.
    const promoted = await createScenePersistence(db.store).read(legacy.id)
    expect(promoted.status).toBe('active')
    expect(promoted.status === 'active' && promoted.document.formatVersion).toBe(2)
    expect(await db.read(`${DOCUMENT_KEY_PREFIX}${legacy.id}`)).toBeUndefined()
  } finally {
    view.unmount()
    db.close()
  }
})

test('textura e céu continuam nos editores deles, mesmo com a oficina ligada', async () => {
  const { db } = await withGeneration()
  const texture = { ...makeTexture(), id: 'folha', name: 'pele', updatedAt: 5 }
  const view = render(
    <MoldaApp persistence={createMemoryPersistence([texture])} adapter={{ sceneWorkshop: true }} />,
  )
  try {
    const card = await screen.findByRole('button', { name: COPY.a11y.assetCard('pele', 'Textura') })
    fireEvent.click(card)
    await waitFor(() =>
      expect(screen.queryByRole('heading', { level: 1 })?.textContent).toBe('pele'),
    )
    await settle()
    expect(screen.queryByText(COPY.scene.development)).toBe(null)
  } finally {
    view.unmount()
    db.close()
  }
})

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

test('sem a capacidade, o modelo antigo NÃO é promovido: abre no editor de sempre', async () => {
  const { db } = await withGeneration()
  const legacy = { ...makeModel(), id: 'antigo', name: 'carro', updatedAt: 1 }
  await db.seed(`${DOCUMENT_KEY_PREFIX}${legacy.id}`, { ...legacy, formatVersion: 1 })
  const view = render(<MoldaApp persistence={createMemoryPersistence([legacy])} />)
  try {
    const card = await screen.findByRole('button', { name: COPY.a11y.assetCard('carro', 'Modelo') })
    fireEvent.click(card)
    await waitFor(() =>
      expect(screen.queryByRole('heading', { level: 1 })?.textContent).toBe('carro'),
    )
    await settle()
    expect(screen.queryByText(COPY.scene.development)).toBe(null)
    // Nada foi promovido: o registro v1 continua no lugar dele.
    expect(await db.read(`${DOCUMENT_KEY_PREFIX}${legacy.id}`)).toBeTruthy()
  } finally {
    view.unmount()
    db.close()
  }
})

test('desligar a capacidade NÃO esconde o que já foi promovido: continua listado e abrindo', async () => {
  const { db } = await withGeneration()
  // Sem `sceneWorkshop`: quem já está na geração seguinte precisa continuar alcançável,
  // senão voltar atrás deixaria o trabalho da criança preso num editor que não o lê.
  const view = render(<MoldaApp persistence={createMemoryPersistence([])} />)
  try {
    const card = await screen.findByRole('button', { name: COPY.a11y.assetCard('nave', 'Modelo') })
    fireEvent.click(card)
    await waitFor(() => expect(screen.queryByText(COPY.scene.development) !== null).toBe(true))
    await settle()
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

test('o pacote "Baixar tudo" diz quantas criações da oficina nova ficaram de fora', async () => {
  const { db } = await withGeneration()
  const legacy = { ...makeModel(), id: 'antigo', name: 'carro', updatedAt: 1 }
  const view = render(
    <MoldaApp persistence={createMemoryPersistence([legacy])} adapter={{ sceneWorkshop: true }} />,
  )
  try {
    await screen.findByRole('button', { name: COPY.a11y.assetCard('nave', 'Modelo') })
    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.downloadAll }))
    // Uma cópia de segurança que a criança acha completa e não é seria pior do que avisar.
    await waitFor(
      () => expect(screen.queryByText(COPY.gallery.downloadSkippedScene(1)) !== null).toBe(true),
      { timeout: 5000 },
    )
    expect(screen.queryByText(COPY.gallery.downloadReady)).toBe(null)
    await settle()
  } finally {
    view.unmount()
    db.close()
  }
})

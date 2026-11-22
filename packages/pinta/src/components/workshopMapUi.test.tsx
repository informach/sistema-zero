import { expect, test } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '../testing/idbMock'
import { COPY } from '../core/copy'
import { setPintaStorageNamespace } from '../state/persistence'
import { createWorkshopPintaPersistence } from '../state/workshopPersistence'
import { automapFixture } from '../testing/automapFixture'
import { isPintaAuthoredMap } from '../tiles/automapping/model'
import { prepareMapRegions } from '../tiles/regionMap'
import { PintaApp } from './PintaApp'

test('a oficina abre mapa regional com regras pelo cartão, salva, desfaz e reabre a revisão', async () => {
  const { map, sheet, book } = await automapFixture()
  const prepared = prepareMapRegions(map)
  if (!prepared.ok) throw Error(prepared.reason)
  const namespace = 'oficina-abertura-regional'
  setPintaStorageNamespace(namespace)
  const local = createWorkshopPintaPersistence({ namespace })
  await local.persistAssets([sheet, { ...prepared.map, schema: 9, automapping: book }])
  const app = render(<PintaApp persistence={local} />)
  try {
    fireEvent.click(await screen.findByRole('button', { name: /Abrir mapa/i }))
    const seed = await screen.findByRole('spinbutton', { name: COPY.automap.seed })
    expect((seed as HTMLInputElement).value).toBe(String(book.seed))
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: COPY.automap.input }) as HTMLButtonElement).disabled,
      ).toBe(false),
    )
    fireEvent.change(seed, { target: { value: '127' } })
    fireEvent.blur(seed)
    expect(
      (screen.getByRole('button', { name: COPY.editor.undo }) as HTMLButtonElement).disabled,
    ).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() =>
      expect(
        (screen.getByRole('spinbutton', { name: COPY.automap.seed }) as HTMLInputElement).value,
      ).toBe(String(book.seed)),
    )
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.redo }))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.back }))
    await screen.findByRole('button', { name: /Abrir mapa/i })
    const saved = await local.loadAssetById(map.id)
    expect(saved && isPintaAuthoredMap(saved) && saved.automapping.seed).toBe(127)
    fireEvent.click(screen.getByRole('button', { name: /Abrir mapa/i }))
    expect(
      ((await screen.findByRole('spinbutton', { name: COPY.automap.seed })) as HTMLInputElement)
        .value,
    ).toBe('127')
  } finally {
    app.unmount()
    setPintaStorageNamespace('')
  }
})

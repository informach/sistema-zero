import { expect, spyOn, test } from 'bun:test'
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
    const reroll = await screen.findByRole('button', { name: COPY.automap.seed })
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: COPY.automap.input }) as HTMLButtonElement).disabled,
      ).toBe(false),
    )
    // O sorteio dá outra semente, nunca a mesma: 0.5 da escala de 31 bits.
    const random = spyOn(Math, 'random').mockReturnValue(0.5)
    const rolled = Math.floor(0.5 * 0x7ffffffe)
    const expected = rolled >= book.seed ? rolled + 1 : rolled
    try {
      fireEvent.click(reroll)
    } finally {
      random.mockRestore()
    }
    expect(expected).not.toBe(book.seed)
    expect(
      (screen.getByRole('button', { name: COPY.editor.undo }) as HTMLButtonElement).disabled,
    ).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    // O desfazer devolveu a semente de antes: o sorteio virou a única jogada para refazer.
    expect(
      (screen.getByRole('button', { name: COPY.editor.redo }) as HTMLButtonElement).disabled,
    ).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.redo }))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.back }))
    await screen.findByRole('button', { name: /Abrir mapa/i })
    const saved = await local.loadAssetById(map.id)
    expect(saved && isPintaAuthoredMap(saved) && saved.automapping.seed).toBe(expected)
    fireEvent.click(screen.getByRole('button', { name: /Abrir mapa/i }))
    expect(await screen.findByRole('button', { name: COPY.automap.seed })).toBeTruthy()
  } finally {
    app.unmount()
    setPintaStorageNamespace('')
  }
})

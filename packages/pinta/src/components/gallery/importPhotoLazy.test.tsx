/**
 * "Trazer uma foto" pela GALERIA: o diálogo de importar é um pedaço separado do bundle
 * (`lazy`) — enquanto carrega, a galeria mostra um aviso (nunca tela morta), e depois o
 * diálogo abre com a foto decodificada. O happy-dom não decodifica imagens, então este teste
 * substitui o módulo na fronteira; a implementação real do decoder tem sua suíte própria.
 */
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { clearIdbMock } from '../../testing/idbMock'

mock.module('../../import/decodeImage', () => ({
  IMPORT_ACCEPT: 'image/png,image/jpeg,image/webp',
  MAX_IMAGE_FILE_BYTES: 20 * 1024 * 1024,
  decodeImageFile: async () => ({
    data: new Uint8ClampedArray(4 * 4 * 4).map((_, i) => (i % 4 === 0 || i % 4 === 3 ? 255 : 0)),
    width: 4,
    height: 4,
  }),
}))

const { PintaApp } = await import('../PintaApp')
const { setPintaStorageNamespace } = await import('../../state/persistence')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

afterEach(async () => {
  cleanup()
  await new Promise((resolve) => setTimeout(resolve, 30))
})

describe('Trazer uma foto (galeria → diálogo lazy)', () => {
  it('escolher um arquivo abre o diálogo de importar (carregado sob demanda), sem tela morta no meio', async () => {
    const { container } = render(<PintaApp />)
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: new RegExp(COPY.gallery.importImage) }),
      ).toBeTruthy()
    })
    const input = container.querySelector('input[type="file"][accept*="image/png"]')
    expect(input).toBeTruthy()
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'foto.png', { type: 'image/png' })
    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } })
    // Ou o aviso de "abrindo" (enquanto o pedaço carrega) ou já o diálogo — nunca nada.
    await waitFor(() => {
      expect(
        screen.queryByText(COPY.importImage.loading) ?? screen.queryByText(COPY.importImage.title),
      ).toBeTruthy()
    })
    // E o diálogo chega.
    await waitFor(
      () => {
        expect(screen.getByText(COPY.importImage.title)).toBeTruthy()
      },
      { timeout: 5000 },
    )
    expect(screen.queryByText(COPY.importImage.loading)).toBeNull()
  })
})

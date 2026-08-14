/**
 * Mudar o tamanho do desenho DENTRO do editor (08/2026).
 *
 * Antes, perceber no meio que 32x32 era pouco custava apagar e recomeçar. Aqui o
 * caminho é: botão com o tamanho de agora → formulário (o MESMO do assistente) →
 * um commit desfazível.
 */
import { beforeEach, describe, expect, it } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { clearIdbMock } from '../../testing/idbMock'

const { PintaApp } = await import('../PintaApp')
const { setPintaStorageNamespace } = await import('../../state/persistence')
const { createGalleryStore } = await import('../../state/galleryStore')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

async function abrir(criar: (loja: ReturnType<typeof createGalleryStore>) => Promise<unknown>) {
  const seed = createGalleryStore()
  await criar(seed)
  render(<PintaApp />)
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /Abrir / })).toBeTruthy()
  })
  fireEvent.click(screen.getByRole('button', { name: /Abrir / }))
}

function abrirDialogo(largura: number, altura: number): void {
  fireEvent.click(screen.getByRole('button', { name: COPY.editor.resize.button(largura, altura) }))
}

function preencher(largura: string, altura: string): void {
  fireEvent.change(screen.getByLabelText(COPY.newAsset.customSize.width), {
    target: { value: largura },
  })
  fireEvent.change(screen.getByLabelText(COPY.newAsset.customSize.height), {
    target: { value: altura },
  })
}

describe('mudar o tamanho no editor', () => {
  it('⭐ o personagem cresce e o botão passa a mostrar o tamanho novo', async () => {
    await abrir((loja) =>
      loja.getState().create({ kind: 'pixel-sprite', name: 'nave', frameSize: 32 }),
    )
    await waitFor(() => {
      expect(screen.getByRole('button', { name: COPY.editor.resize.button(32, 32) })).toBeTruthy()
    })

    abrirDialogo(32, 32)
    preencher('128', '32')
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.resize.apply }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: COPY.editor.resize.button(128, 32) })).toBeTruthy()
    })

    // ⚠️ O autosave é DEBOUNCED e o selo "Salvo" já estava na tela desde a criação:
    // esperar por ele NÃO prova nada. Quem diz a verdade é o disco, relido até
    // refletir a edição.
    const doDisco = async () => {
      const conferir = createGalleryStore()
      await conferir.getState().load()
      return conferir.getState().assets.find((a) => a.name === 'nave')
    }
    await waitFor(
      async () => {
        const salvo = await doDisco()
        expect(salvo?.kind === 'pixel-sprite' && salvo.frameWidth).toBe(128)
      },
      { timeout: 5000 },
    )

    // O desenho continua inteiro: se a travessia deixasse um quadro para trás, o
    // sanitize o descartaria e ele sumiria no próximo load.
    const asset = await doDisco()
    expect(asset?.kind).toBe('pixel-sprite')
    if (asset?.kind === 'pixel-sprite') {
      expect([asset.frameWidth, asset.frameHeight]).toEqual([128, 32])
      for (const anim of asset.animations) {
        for (const frame of anim.frames) {
          for (const cel of frame) expect([cel.width, cel.height]).toEqual([128, 32])
        }
      }
    }
  })

  it('avisa que DIMINUIR corta, e só então', async () => {
    await abrir((loja) =>
      loja.getState().create({ kind: 'pixel-sprite', name: 'nave', frameSize: 64 }),
    )
    await waitFor(() => {
      expect(screen.getByRole('button', { name: COPY.editor.resize.button(64, 64) })).toBeTruthy()
    })
    abrirDialogo(64, 64)

    preencher('128', '128')
    expect(screen.queryByText(COPY.editor.resize.willCut)).toBeNull()

    preencher('128', '32')
    await waitFor(() => {
      expect(screen.getByText(COPY.editor.resize.willCut)).toBeTruthy()
    })
  })

  it('o botão de aplicar fica desligado sem mudança e com número inválido', async () => {
    await abrir((loja) =>
      loja.getState().create({ kind: 'pixel-sprite', name: 'nave', frameSize: 32 }),
    )
    await waitFor(() => {
      expect(screen.getByRole('button', { name: COPY.editor.resize.button(32, 32) })).toBeTruthy()
    })
    abrirDialogo(32, 32)

    const aplicar = () =>
      screen.getByRole('button', { name: COPY.editor.resize.apply }) as HTMLButtonElement
    // Abre com o tamanho de AGORA: não há o que commitar.
    expect(aplicar().disabled).toBe(true)

    preencher('9999', '32')
    await waitFor(() => expect(aplicar().disabled).toBe(true))

    preencher('64', '32')
    await waitFor(() => expect(aplicar().disabled).toBe(false))
  })

  it('⚠️ PEÇAS não oferecem o botão: o tamanho do tile é whitelist do motor', async () => {
    await abrir((loja) => loja.getState().create({ kind: 'tileset', name: 'pecas', tileSize: 16 }))
    await waitFor(() => {
      expect(screen.getByText(COPY.tiles.tiles)).toBeTruthy()
    })
    expect(screen.queryByRole('button', { name: /^Tamanho: / })).toBeNull()
  })

  it('o mapa muda em CÉLULAS e diz isso', async () => {
    const seed = createGalleryStore()
    const pecas = await seed.getState().create({ kind: 'tileset', name: 'pecas', tileSize: 16 })
    if (!pecas) throw new Error('tileset esperado')
    await seed
      .getState()
      .create({ kind: 'tilemap', name: 'fase', tilesetId: pecas.id, cols: 4, rows: 3 })
    render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Abrir fase/ })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /Abrir fase/ }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: COPY.editor.resize.button(4, 3) })).toBeTruthy()
    })

    abrirDialogo(4, 3)
    expect(screen.getByText(COPY.editor.resize.helpCells)).toBeTruthy()
    preencher('8', '6')
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.resize.apply }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: COPY.editor.resize.button(8, 6) })).toBeTruthy()
    })
  })
})

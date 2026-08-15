/**
 * Curadoria da caixa de ferramentas NAS TRÊS CAIXAS (pixel, vetor e mapa).
 *
 * O `toolCuration.test.ts` prova as funções puras; o que se prova aqui é o encanamento: que a
 * lista do host chega às caixas de verdade, que ela esconde o que tem de esconder, e que a
 * ferramenta ATIVA nunca fica selecionada fora da tela — o estado impossível que deixaria a
 * criança desenhando sem entender por quê.
 */
import { beforeEach, describe, expect, it } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { PINTA_TOOL_PRESETS } from '../../core/toolCuration'
import { clearIdbMock } from '../../testing/idbMock'

const { PintaApp } = await import('../PintaApp')
const { setPintaStorageNamespace } = await import('../../state/persistence')
const { createGalleryStore } = await import('../../state/galleryStore')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

/** A caixa é o `role=toolbar`; consultar por ela evita casar botões de outros painéis. */
function toolbar(): HTMLElement {
  return screen.getByRole('toolbar', { name: COPY.a11y.tools })
}

function toolNames(): string[] {
  return Array.from(toolbar().querySelectorAll('button')).map(
    (b) => b.getAttribute('aria-label') ?? '',
  )
}

function hasTool(name: string): boolean {
  return toolNames().includes(name)
}

async function abrir(nome: string): Promise<void> {
  await waitFor(() => {
    expect(screen.getByRole('button', { name: new RegExp(`Abrir ${nome}`) })).toBeTruthy()
  })
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`Abrir ${nome}`) }))
  await waitFor(() => {
    expect(screen.getByRole('toolbar', { name: COPY.a11y.tools })).toBeTruthy()
  })
}

async function semearCenarioPixel(): Promise<void> {
  const seed = createGalleryStore()
  await seed.getState().create({ kind: 'pixel-background', name: 'ceu', width: 16, height: 16 })
}

async function semearCenarioVetor(): Promise<void> {
  const seed = createGalleryStore()
  await seed
    .getState()
    .create({ kind: 'vector-background', name: 'livre', width: 240, height: 180 })
}

async function semearMapa(): Promise<void> {
  const seed = createGalleryStore()
  const pecas = await seed.getState().create({ kind: 'tileset', name: 'pecas', tileSize: 16 })
  if (!pecas) throw new Error('tileset esperado')
  await seed
    .getState()
    .create({ kind: 'tilemap', name: 'fase', tilesetId: pecas.id, cols: 4, rows: 3 })
}

describe('curadoria chega à caixa do PIXEL', () => {
  it('sem curadoria a caixa vem inteira (anti-vácuo dos casos abaixo)', async () => {
    await semearCenarioPixel()
    render(<PintaApp />)
    await abrir('ceu')

    for (const nome of [COPY.tools.pencil, COPY.tools.fill, COPY.tools.rect, COPY.tools.grid]) {
      expect(hasTool(nome), nome).toBe(true)
    }
  })

  it('lista não-vazia mostra só o que ela pede — inclusive entre os alternadores', async () => {
    await semearCenarioPixel()
    render(<PintaApp adapter={{ allowTools: ['pencil', 'eraser'] }} />)
    await abrir('ceu')

    expect(hasTool(COPY.tools.pencil)).toBe(true)
    expect(hasTool(COPY.tools.eraser)).toBe(true)
    // Desenho, alternador e ação do quadro: a curadoria alcança a caixa INTEIRA.
    expect(hasTool(COPY.tools.fill)).toBe(false)
    expect(hasTool(COPY.tools.grid)).toBe(false)
    expect(hasTool(COPY.tools.rotate)).toBe(false)
  })

  it('🚨 a ferramenta ATIVA cortada cai numa permitida', async () => {
    await semearCenarioPixel()
    const view = render(<PintaApp />)
    await abrir('ceu')

    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: COPY.tools.rect }).getAttribute('aria-pressed'),
      ).toBe('true')
    })

    // O professor aperta a caixa com o Retângulo na mão.
    view.rerender(<PintaApp adapter={{ allowTools: ['pencil', 'eraser'] }} />)

    await waitFor(() => {
      expect(hasTool(COPY.tools.rect)).toBe(false)
      expect(
        screen.getByRole('button', { name: COPY.tools.pencil }).getAttribute('aria-pressed'),
      ).toBe('true')
    })
  })
})

describe('curadoria chega à caixa do VETOR', () => {
  it('o preset "essencial" deixa com que desenhar e tira o resto', async () => {
    await semearCenarioVetor()
    render(<PintaApp adapter={{ allowTools: PINTA_TOOL_PRESETS.essencial }} />)
    await abrir('livre')

    // O vetor desenha com pincel e caneta; o conta-gotas pega cor.
    expect(hasTool(COPY.vector.brush)).toBe(true)
    expect(hasTool(COPY.vector.pen)).toBe(true)
    expect(hasTool(COPY.tools.picker)).toBe(true)
    // ⚠️ "Ajustar" está no preset de propósito: é o caminho de volta de quem aproximou demais.
    expect(hasTool(COPY.editor.zoomFit)).toBe(true)

    expect(hasTool(COPY.vector.select)).toBe(false)
    expect(hasTool(COPY.vector.reshape)).toBe(false)
    expect(hasTool(COPY.vector.text)).toBe(false)
    // Numa aula o desenho é isolado da galeria pessoal.
    expect(hasTool(COPY.vector.insertAsset)).toBe(false)
  })

  it('a ativa cortada cai numa permitida (o vetor nasce na Selecionar)', async () => {
    await semearCenarioVetor()
    render(<PintaApp adapter={{ allowTools: ['brush'] }} />)
    await abrir('livre')

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: COPY.vector.brush }).getAttribute('aria-pressed'),
      ).toBe('true')
    })
    expect(hasTool(COPY.vector.select)).toBe(false)
  })
})

describe('curadoria chega à caixa do MAPA', () => {
  it('esconde o que não foi pedido, incluindo crescer o mapa e ver as colisões', async () => {
    await semearMapa()
    render(<PintaApp adapter={{ allowTools: ['pencil', 'eraser'] }} />)
    await abrir('fase')

    expect(hasTool(COPY.tools.pencil)).toBe(true)
    expect(hasTool(COPY.tools.eraser)).toBe(true)
    expect(hasTool(COPY.tools.fill)).toBe(false)
    expect(hasTool(COPY.tiles.autoExpand)).toBe(false)
    expect(hasTool(COPY.tiles.showCollision)).toBe(false)
  })
})

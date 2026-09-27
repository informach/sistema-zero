/**
 * A área da ferramenta no desenho da tela-modelo do Pinta (11/09/2026): colunas brancas de borda a
 * borda com fio de 1px (`.pin-col`), o palco claro (`.pin-stage`), a faixa azul de baixo
 * (`.pin-band`), os painéis das colunas como SEÇÕES sem moldura (o `PanelLook`), os quadrados
 * claros com o ativo azul chapado, o "+" em bolinha, a paleta com o anel e as duas cores da caixa
 * lado a lado. happy-dom não faz layout: trava-se a estrutura e as classes-receita do
 * `pinta.css`; o desenho confere-se no playground.
 */
import { beforeEach, describe, expect, it } from 'bun:test'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { COPY } from '../../core/copy'
import {
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  createVectorSpriteAsset,
  type PintaAsset,
} from '../../core/project'
import { clearIdbMock } from '../../testing/idbMock'

const { PintaApp } = await import('../PintaApp')
const { setPintaStorageNamespace } = await import('../../state/persistence')
const { createMemoryPersistence } = await import('../../state/memoryPersistence')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

async function abrir(assets: PintaAsset[], nome: string): Promise<void> {
  render(<PintaApp persistence={createMemoryPersistence(assets)} />)
  await waitFor(() => {
    expect(screen.getByRole('button', { name: new RegExp(`Abrir ${nome} \\(`) })).toBeTruthy()
  })
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`Abrir ${nome} \\(`) }))
  await waitFor(() => {
    expect(screen.getByRole('button', { name: COPY.editor.back })).toBeTruthy()
  })
}

function secao(rotulo: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(`section[aria-label="${rotulo}"]`)
  if (!found) throw new Error(`seção esperada: ${rotulo}`)
  return found
}

/** Uma seção da coluna branca: sem o cartão, com a faixa de título da seção. */
function esperarSecaoDaColuna(rotulo: string): void {
  const el = secao(rotulo)
  expect(el.classList.contains('pin-section')).toBe(true)
  expect(el.classList.contains('pin-panel')).toBe(false)
  expect(el.firstElementChild?.className).toBe('pin-section-head')
  expect(el.closest('.pin-col')?.classList.contains('pin-col--end')).toBe(true)
}

/** O quadrado de cor da caixa (o aria-label carrega o hex atual). */
function quadradoDeCor(kind: 'primary' | 'secondary'): HTMLElement {
  const prefix = kind === 'primary' ? COPY.tools.primaryColor : COPY.tools.secondaryColor
  const found = screen
    .getAllByRole('button')
    .find((b) => (b.getAttribute('aria-label') ?? '').startsWith(`${prefix}:`))
  if (!found) throw new Error(`quadrado não encontrado: ${prefix}`)
  return found
}

function comTelaEstreita(): () => void {
  const original = window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => true,
    }),
  })
  return () => Object.defineProperty(window, 'matchMedia', { configurable: true, value: original })
}

const heroi = (): PintaAsset => createPixelSpriteAsset({ name: 'heroi', frameSize: 16 })

describe('a área da ferramenta da tela-modelo (pixel)', () => {
  it('as colunas brancas, o palco claro e a faixa azul, sem cartão dentro das colunas', async () => {
    await abrir([heroi()], 'heroi')
    const caixa = screen.getByRole('toolbar', { name: COPY.a11y.tools })
    // A caixa mora na coluna branca da esquerda, sem a moldura do cartão.
    expect(caixa.className).not.toContain('pin-panel')
    expect(caixa.closest('.pin-col')?.classList.contains('pin-col--start')).toBe(true)
    // As três seções da coluna da direita são seções, não cartões.
    for (const rotulo of [COPY.animation.preview, COPY.layers.title, COPY.palette.title]) {
      esperarSecaoDaColuna(rotulo)
    }
    // O palco claro envolve a área de desenho; o papel é o fio + sombra (sem borda que ocupe lugar).
    const desenho = screen.getByRole('img', { name: COPY.a11y.drawArea })
    expect(desenho.closest('.pin-stage')).toBeTruthy()
    expect(desenho.parentElement?.className).toContain('pin-paper')
    expect(desenho.parentElement?.className).not.toContain('border-2')
    // A faixa azul de baixo, com o Spritesheet sem faixa de título própria.
    const faixa = secao(COPY.animation.spritesheet)
    expect(faixa.classList.contains('pin-section--band')).toBe(true)
    expect(faixa.parentElement?.className).toContain('pin-band')
    expect(screen.getByText(COPY.animation.animationCount(1)).className).toContain('pin-chip')
    expect(screen.getByRole('button', { name: COPY.animation.addAnimation }).className).toContain(
      'pin-bar-btn--primary',
    )
    expect(screen.getByRole('button', { name: COPY.editor.zoomIn }).parentElement?.className).toBe(
      'pin-zoom',
    )
  })

  it('a caixa: quadrados claros, o ativo azul chapado e as duas cores sem uma cobrir a outra', async () => {
    await abrir([heroi()], 'heroi')
    const lapis = screen.getByRole('button', { name: COPY.tools.pencil })
    expect(lapis.className).toContain('pin-tool-active')
    const borracha = screen.getByRole('button', { name: COPY.tools.eraser })
    expect(borracha.className).toContain('pin-icon-btn--quiet')
    expect(borracha.className).not.toContain('pin-tool-active')
    // Cada grupo é a sua grade de duas colunas (o que sobra sozinho fica no meio dela).
    expect(lapis.parentElement?.className).toContain('grid-cols-2')
    expect(screen.getByRole('button', { name: COPY.tools.grid }).parentElement).not.toBe(
      lapis.parentElement,
    )
    // As duas cores: cada uma com o alvo inteiro; antes a secundária ficava ATRÁS da principal.
    const principal = quadradoDeCor('primary')
    const secundaria = quadradoDeCor('secondary')
    expect(principal.className).toBe('pin-swatch')
    expect(principal.getAttribute('aria-pressed')).toBe('true')
    expect(secundaria.className).not.toContain('absolute')
    expect(secundaria.className).toContain('pin-swatch--small')
    // A secundária nasce sem cor: o "proibido" no lugar do xadrez.
    expect(secundaria.className).toContain('pin-swatch--none')
    expect(secundaria.querySelector('svg')).not.toBeNull()
  })

  it('a paleta: o anel na cor escolhida, o "sem cor" com o proibido e o "+" em bolinha', async () => {
    await abrir([heroi()], 'heroi')
    const semCor = screen.getByRole('button', { name: COPY.palette.transparent })
    expect(semCor.className).toBe('pin-swatch pin-swatch--none')
    expect(semCor.querySelector('svg')).not.toBeNull()
    const cor = screen.getByRole('button', { name: COPY.a11y.colorLabel(3) })
    expect(cor.className).toBe('pin-swatch')
    fireEvent.click(cor)
    await waitFor(() => {
      expect(cor.getAttribute('aria-pressed')).toBe('true')
    })
    for (const rotulo of [COPY.palette.addColor, COPY.layers.add]) {
      const mais = screen.getByRole('button', { name: rotulo })
      expect(mais.className).toBe('pin-add-btn')
      expect(mais.querySelector('.pin-add-btn__dot svg')).not.toBeNull()
    }
  })

  it('a prévia e a faixa: botões redondos, quadros com o anel e ações nos quadrados claros', async () => {
    await abrir([heroi()], 'heroi')
    for (const rotulo of [COPY.animation.reproduce, COPY.animation.edit, COPY.animation.settings]) {
      expect(screen.getByRole('button', { name: rotulo }).className).toContain('pin-round')
    }
    const quadro = screen.getByRole('button', { name: 'parado: quadro 1' })
    expect(quadro.className).toContain('pin-thumb')
    expect(quadro.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: COPY.animation.addFrame }).className).toContain(
      'pin-icon-btn--quiet',
    )
  })

  it('peças: a coluna branca só com as cores e a tira de peças na faixa azul', async () => {
    await abrir([createTilesetAsset({ name: 'pecas', tileSize: 16 })], 'pecas')
    esperarSecaoDaColuna(COPY.palette.title)
    const peca = screen.getByRole('button', { name: COPY.tiles.tileLabel(0) })
    expect(peca.className).toContain('pin-thumb')
    expect(peca.closest('.pin-band')).toBeTruthy()
    expect(screen.getByRole('button', { name: COPY.tiles.addTile }).className).toContain(
      'pin-icon-btn--quiet',
    )
  })

  it('tela estreita: os painéis seguem em cartão (a coluna branca é só do desktop)', async () => {
    const restaurar = comTelaEstreita()
    try {
      await abrir([heroi()], 'heroi')
      fireEvent.click(screen.getByRole('button', { name: COPY.animation.panel }))
      await waitFor(() => {
        expect(document.querySelector(`section[aria-label="${COPY.layers.title}"]`)).toBeTruthy()
      })
      const camadas = secao(COPY.layers.title)
      expect(camadas.classList.contains('pin-panel')).toBe(true)
      expect(camadas.classList.contains('pin-section')).toBe(false)
      expect(document.querySelector('.pin-col')).toBeNull()
    } finally {
      restaurar()
    }
  })
})

describe('a área da ferramenta da tela-modelo (vetor e mapa)', () => {
  it('vetor: a caixa sem moldura, as seções na coluna branca e o "sem cor" com o proibido', async () => {
    await abrir([createVectorSpriteAsset({ name: 'fantasma', frameSize: 32 })], 'fantasma')
    const caixa = screen.getByRole('toolbar', { name: COPY.a11y.tools })
    expect(caixa.className).not.toContain('pin-panel')
    expect(caixa.closest('.pin-col')?.classList.contains('pin-col--start')).toBe(true)
    for (const rotulo of [COPY.animation.preview, COPY.palette.title, COPY.vector.appearance]) {
      esperarSecaoDaColuna(rotulo)
    }
    const cores = secao(COPY.palette.title)
    const semCor = within(cores)
      .getAllByRole('button')
      .find((b) => (b.getAttribute('aria-label') ?? '').endsWith(`: ${COPY.vector.none}`))
    expect(semCor?.className).toContain('pin-swatch--none')
    expect(within(cores).getByRole('button', { name: COPY.palette.addColor }).className).toBe(
      'pin-add-btn',
    )
    expect(screen.getByRole('img', { name: COPY.a11y.drawArea }).closest('.pin-stage')).toBeTruthy()
  })

  it('mapa: a caixa, as peças e as camadas nas colunas brancas, e as medidas na faixa azul', async () => {
    const pecas = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    const mapa = createTilemapAsset({ name: 'fase', tilesetId: pecas.id, cols: 4, rows: 3 })
    await abrir([pecas, mapa], 'fase')
    const caixa = screen.getByRole('toolbar', { name: COPY.a11y.tools })
    expect(caixa.closest('.pin-col')?.classList.contains('pin-col--start')).toBe(true)
    expect(screen.getByRole('button', { name: COPY.tools.pencil }).className).toContain(
      'pin-tool-active',
    )
    for (const rotulo of [COPY.tiles.pickTile, COPY.tiles.layers]) esperarSecaoDaColuna(rotulo)
    expect(screen.getByRole('img', { name: COPY.tiles.mapGrid }).closest('.pin-stage')).toBeTruthy()
    expect(screen.getByText(COPY.tiles.statusSize(4, 3)).closest('.pin-band')).toBeTruthy()
    expect(screen.getByRole('button', { name: COPY.tiles.addLayer }).className).toContain(
      'pin-bar-btn--outline',
    )
  })
})

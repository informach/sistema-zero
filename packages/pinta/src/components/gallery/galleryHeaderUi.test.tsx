/**
 * A galeria no desenho das telas-modelo (11/09/2026), o MESMO da "Meus Jogos" do Estúdio: três
 * faixas que rolam juntas (creme com o cabeçalho de duas linhas, céu com a grade, lilás com o
 * cartão de fechamento). Linha 1 = título + o que a imagem tem ali (o selo, o importar "Trazer
 * foto" e o "Criar novo" em pílula primária); linha 2 = os dois trilhos de chips (Estilo, Tipo)
 * e a busca. O arquivo dos desenhos (Selecionar, Baixar tudo, Trazer de volta) mora no cartão
 * lilás. A ordem no DOM é o que o leitor de tela e o Tab percorrem. Sem o
 * `@sistemazero/ui/tool-chrome.css` (o host importa) o DOM é o mesmo.
 */
import { beforeEach, describe, expect, it } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { createPixelSpriteAsset } from '../../core/project'
import { clearIdbMock } from '../../testing/idbMock'

const { PintaApp } = await import('../PintaApp')
const { setPintaStorageNamespace } = await import('../../state/persistence')
const { createMemoryPersistence } = await import('../../state/memoryPersistence')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

const precede = (a: Element, b: Element): boolean =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

/** O cartão "Criar novo" da grade: o nome dele é o título MAIS a dica (o do cabeçalho não). */
const NEW_CARD_NAME = `${COPY.gallery.create} ${COPY.gallery.newCardHint}`

async function galeriaCom(...nomes: string[]): Promise<void> {
  const assets = nomes.map((name) => createPixelSpriteAsset({ name, frameSize: 32 }))
  render(<PintaApp persistence={createMemoryPersistence(assets)} />)
  const primeiro = nomes[0]
  await waitFor(() => {
    const pronto = primeiro
      ? screen.getByRole('button', { name: new RegExp(`Abrir ${primeiro}`) })
      : screen.getByText(COPY.gallery.empty)
    expect(pronto).toBeTruthy()
  })
}

describe('galeria: as três faixas', () => {
  it('creme com o cabeçalho, céu com a grade e lilás com o fechamento, dentro da área que rola', async () => {
    await galeriaCom('nave')
    const root = document.querySelector('[data-pin-scroll-root]')
    const bands = root?.querySelector(':scope > .sz-tool-bands')
    expect(bands).not.toBeNull()
    const faixas = Array.from(bands?.children ?? []).map((el) => el.className)
    expect(faixas).toHaveLength(3)
    expect(faixas[0]).toContain('sz-tool-band--creme')
    expect(faixas[1]).toContain('sz-tool-band--ceu')
    expect(faixas[2]).toContain('sz-tool-band--lilas')
    // O cabeçalho é a faixa creme (e não uma barra presa em cima: rola com o resto).
    const header = screen.getByRole('heading', { name: COPY.gallery.title }).closest('header')
    expect(header?.className).toContain('sz-tool-band--creme')
    expect(screen.getByRole('heading', { name: COPY.gallery.title }).className).toContain(
      'sz-tool-title',
    )
  })

  it('linha 1 como a da imagem (Trazer foto + Criar novo) e linha 2 com os filtros e a busca', async () => {
    await galeriaCom('nave')
    const header = screen.getByRole('heading', { name: COPY.gallery.title }).closest('header')
    expect(header).not.toBeNull()
    // O menu é o quadrado das telas-modelo, dentro do padding: o cabeçalho não desconta mais o
    // respiro da raiz (a aba colada na sidebar saiu em 11/09/2026).
    expect(header?.className).not.toContain('--sz-tool-inset')

    // O importar é a pílula quieta; a pílula chapada não leva a base de utilitárias do Button,
    // que venceria a receita (44px, 16px, peso 700 em vez de 40px, 15px e 800).
    const foto = screen.getByRole('button', { name: COPY.gallery.importImage })
    expect(header?.contains(foto)).toBe(true)
    expect(foto.className).toContain('sz-tool-pill--quiet')
    expect(foto.className).not.toContain('min-h-11')
    expect(foto.className).not.toContain('sz-tool-btn')
    const criar = screen.getByRole('button', { name: COPY.gallery.create })
    expect(header?.contains(criar)).toBe(true)
    expect(criar.className).toContain('sz-tool-pill--primary')
    // Os três do arquivo dos desenhos moram no cartão lilás, não no cabeçalho.
    for (const name of [COPY.gallery.select, COPY.gallery.downloadAll, COPY.gallery.restore]) {
      expect(header?.contains(screen.getByRole('button', { name }))).toBe(false)
    }

    // Linha 2, na ordem: Estilo, Tipo, busca; tudo DEPOIS do título.
    const estilo = screen.getByRole('group', { name: COPY.gallery.filterStyle })
    const tipo = screen.getByRole('group', { name: COPY.gallery.filterRole })
    const busca = screen.getByRole('searchbox', { name: COPY.gallery.search })
    expect(header?.contains(busca)).toBe(true)
    expect(precede(criar, estilo)).toBe(true)
    expect(precede(estilo, tipo)).toBe(true)
    expect(precede(tipo, busca)).toBe(true)
    expect(estilo.className).toContain('sz-tool-chips')
    expect(busca.className).toContain('sz-tool-search')
    // Os chips com ícone de linha (os emojis saíram); o "Todos" fica sem.
    const pixel = screen.getByRole('button', { name: COPY.gallery.filterAria.pixel })
    expect(pixel.querySelector('svg')).not.toBeNull()
    const todos = screen.getByRole('button', { name: COPY.gallery.filterAria.allStyles })
    expect(todos.querySelector('svg')).toBeNull()
  })

  it('o cartão "Criar novo" abre a grade, com nome próprio, e abre o mesmo "Criar novo"', async () => {
    await galeriaCom('nave', 'lua')
    const card = screen.getByRole('button', { name: NEW_CARD_NAME })
    expect(card.className).toContain('sz-tool-card--new')
    const grade = card.parentElement
    expect(grade?.className).toContain('sz-tool-grid')
    expect(grade?.firstElementChild).toBe(card)
    // Os desenhos vêm DEPOIS dele, na mesma grade.
    expect(grade?.contains(screen.getByRole('button', { name: /Abrir nave/ }))).toBe(true)

    fireEvent.click(card)
    expect(screen.getByText(COPY.newAsset.styleTitle)).toBeTruthy()
  })

  it('o cartão some com a busca (no meio de um resultado ele seria ruído) e volta ao limpar', async () => {
    await galeriaCom('nave', 'lua')
    const busca = screen.getByRole('searchbox', { name: COPY.gallery.search })
    fireEvent.change(busca, { target: { value: 'nave' } })
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: NEW_CARD_NAME })).toBeNull()
    })
    fireEvent.change(busca, { target: { value: '' } })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: NEW_CARD_NAME })).toBeTruthy()
    })
  })

  it('o cartão branco sem a borda na cor do PAPEL, com o nome em cima e a capa cinza-clara', async () => {
    await galeriaCom('nave')
    const abrir = screen.getByRole('button', { name: /Abrir nave/ })
    const card = abrir.closest('.sz-tool-card')
    expect(card).not.toBeNull()
    expect(card?.className).not.toContain('--pin-panel-border')
    expect(card?.className).not.toContain('pin-panel')
    // A capa é a caixa compartilhada das galerias (o xadrez ficou no seletor do editor).
    expect(abrir.querySelector('.sz-tool-cover')).not.toBeNull()
    expect(abrir.querySelector('.pin-checkerboard')).toBeNull()
    // O nome vem ANTES da capa, como nos cartões do Estúdio.
    expect(precede(screen.getByText('nave'), abrir)).toBe(true)
  })

  it('o cartão lilás conta os desenhos NESTE aparelho (sem a nuvem) e leva o arquivo dos desenhos', async () => {
    await galeriaCom('nave', 'lua')
    const titulo = screen.getByRole('heading', { name: COPY.gallery.savedDevice(2) })
    const faixa = titulo.closest('section')
    expect(faixa?.className).toContain('sz-tool-band--lilas')
    // Levar (tudo ou só os escolhidos) e trazer de volta, nas pílulas creme da imagem.
    const botoes = [COPY.gallery.select, COPY.gallery.downloadAll, COPY.gallery.restore].map(
      (name) => screen.getByRole('button', { name }),
    )
    for (const botao of botoes) {
      expect(faixa?.contains(botao)).toBe(true)
      expect(botao.className).toContain('sz-tool-pill--creme')
    }
    // O "Trazer de volta" aciona o campo de arquivo de backup (um só na tela, sempre montado).
    const inputs = document.querySelectorAll('input[accept*=".pinta.json"]')
    expect(inputs).toHaveLength(1)
    let clicks = 0
    const input = inputs[0] as HTMLInputElement
    input.click = () => {
      clicks += 1
    }
    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.restore }))
    expect(clicks).toBe(1)
  })

  it('a galeria vazia: o recado, o cartão "Criar novo" sozinho e o "Trazer de volta" no cartão lilás', async () => {
    await galeriaCom()
    const recado = screen.getByText(COPY.gallery.empty)
    const card = screen.getByRole('button', { name: NEW_CARD_NAME })
    expect(precede(recado, card)).toBe(true)
    // Sem desenhos não há filtros nem busca (nada para filtrar)...
    expect(screen.queryByRole('searchbox', { name: COPY.gallery.search })).toBeNull()
    // ...mas o cartão lilás fica: num aparelho novo, trazer os desenhos de volta é o 1º passo.
    const titulo = screen.getByRole('heading', { name: COPY.gallery.savedDevice(0) })
    expect(titulo.closest('section')?.className).toContain('sz-tool-band--lilas')
    expect(screen.getByRole('button', { name: COPY.gallery.restore })).toBeTruthy()
    // Nada para escolher nem para baixar.
    expect(screen.queryByRole('button', { name: COPY.gallery.select })).toBeNull()
    expect(screen.queryByRole('button', { name: COPY.gallery.downloadAll })).toBeNull()
  })
})

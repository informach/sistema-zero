/**
 * Cabeçalho de DUAS linhas da galeria (07/09/2026): linha 1 = título + os cinco botões (o
 * "Criar novo" é a pílula 3D compartilhada, os outros o secundário compartilhado); linha 2 =
 * os dois trilhos de chips (Estilo, Tipo) e a busca. A ordem no DOM é o que o leitor de tela e
 * o Tab percorrem. Sem o `@sistemazero/ui/tool-chrome.css` (o host importa) o DOM é o mesmo.
 */
import { beforeEach, describe, expect, it } from 'bun:test'
import { render, screen, waitFor } from '@testing-library/react'
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

describe('galeria: cabeçalho de duas linhas', () => {
  it('linha 1 com os cinco botões (Criar novo = pílula 3D) e linha 2 com os filtros e a busca', async () => {
    const nave = createPixelSpriteAsset({ name: 'nave', frameSize: 32 })
    render(<PintaApp persistence={createMemoryPersistence([nave])} />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Abrir nave/ })).toBeTruthy()
    })
    const header = screen.getByRole('heading', { name: COPY.gallery.title }).closest('header')
    expect(header).not.toBeNull()
    expect(header?.className).toContain('sz-tool-header')
    // O menu é o quadrado das telas-modelo, dentro do padding: o cabeçalho não desconta mais o
    // respiro da raiz (a aba colada na sidebar saiu em 11/09/2026).
    expect(header?.className).not.toContain('--sz-tool-inset')

    const secundarios = [
      COPY.gallery.restore,
      COPY.gallery.importImage,
      COPY.gallery.select,
      COPY.gallery.downloadAll,
    ].map((name) => screen.getByRole('button', { name }))
    for (const botao of secundarios) {
      expect(header?.contains(botao)).toBe(true)
      expect(botao.className).toContain('sz-tool-btn')
      expect(botao.className).not.toContain('sz-tool-btn-3d')
    }
    const criar = screen.getByRole('button', { name: new RegExp(COPY.gallery.create) })
    expect(header?.contains(criar)).toBe(true)
    expect(criar.className).toContain('sz-tool-btn-3d')

    // Linha 2, na ordem: Estilo, Tipo, busca; tudo DEPOIS do cabeçalho.
    const estilo = screen.getByRole('group', { name: COPY.gallery.filterStyle })
    const tipo = screen.getByRole('group', { name: COPY.gallery.filterRole })
    const busca = screen.getByRole('searchbox', { name: COPY.gallery.search })
    expect(precede(header as Element, estilo)).toBe(true)
    expect(precede(estilo, tipo)).toBe(true)
    expect(precede(tipo, busca)).toBe(true)
    expect(estilo.className).toContain('sz-tool-chips')
    expect(busca.className).toContain('sz-tool-search')
    // O respiro do topo encolheu (é o que o lote recupera); o resto do padding fica.
    expect(document.querySelector('[data-pin-scroll-root]')?.className).toContain('sm:pt-4')
  })

  it('a galeria vazia mostra o convite com menos respiro (py-8)', async () => {
    render(<PintaApp persistence={createMemoryPersistence([])} />)
    await waitFor(() => {
      expect(screen.getByText(COPY.gallery.empty)).toBeTruthy()
    })
    expect(screen.getByText(COPY.gallery.empty).parentElement?.className).toContain('py-8')
    // Sem desenhos não há filtros nem busca (nada para filtrar).
    expect(screen.queryByRole('searchbox', { name: COPY.gallery.search })).toBeNull()
  })
})

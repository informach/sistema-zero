/**
 * A barra do editor no desenho da tela-modelo do Pinta (11/09/2026): o ícone do papel ao lado do
 * nome, a pílula do tamanho, o "Salvo" em pílula menta (a MESMA região viva), a nuvem do host só
 * com o ícone em repouso e UMA pílula azul: o "Usar no Estúdio" quando ele aparece, senão o
 * "Baixar". happy-dom não faz layout: trava-se a estrutura, os nomes e as classes; o desenho
 * confere-se no playground.
 */
import { beforeEach, describe, expect, it } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../core/copy'
import {
  createPixelBackgroundAsset,
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  type PintaAsset,
} from '../../core/project'
import type { PintaHostAdapter, PintaHostChrome } from '../../core/types'
import { clearIdbMock } from '../../testing/idbMock'

const { PintaApp } = await import('../PintaApp')
const { PintaHostChromeProvider } = await import('../hostChrome')
const { setPintaStorageNamespace } = await import('../../state/persistence')
const { createMemoryPersistence } = await import('../../state/memoryPersistence')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

async function abrir(nome: string): Promise<HTMLElement> {
  await waitFor(() => {
    expect(screen.getByRole('button', { name: new RegExp(`Abrir ${nome} \\(`) })).toBeTruthy()
  })
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`Abrir ${nome} \\(`) }))
  await waitFor(() => {
    expect(screen.getByRole('button', { name: COPY.editor.back })).toBeTruthy()
  })
  return screen.getByRole('button', { name: COPY.editor.back }).closest('header') as HTMLElement
}

function montar(
  assets: PintaAsset[],
  adapter: PintaHostAdapter = {},
  chrome: PintaHostChrome | null = null,
) {
  const app = <PintaApp adapter={adapter} persistence={createMemoryPersistence(assets)} />
  return render(
    chrome ? <PintaHostChromeProvider value={chrome}>{app}</PintaHostChromeProvider> : app,
  )
}

describe('a barra do editor da tela-modelo', () => {
  it('o papel em ícone ao lado do nome, a pílula do tamanho e o "Salvo" menta com o visto', async () => {
    montar([createPixelSpriteAsset({ name: 'nave', frameSize: 32 })])
    const barra = await abrir('nave')
    expect(barra.className).toContain('pin-bar')

    const nome = screen.getByTitle('nave')
    expect(nome.className).toContain('pin-bar-name__text')
    // O ícone de linha do papel (personagem), decorativo, na cor do papel.
    const icone = nome.parentElement?.querySelector('svg')
    expect(icone?.getAttribute('aria-hidden')).toBe('true')
    expect(icone?.getAttribute('class')).toContain('text-pin-kind-sprite')

    const tamanho = screen.getByRole('button', { name: COPY.editor.resize.button(32, 32) })
    expect(tamanho.className).toBe('pin-bar-btn pin-bar-btn--quiet')

    // O texto mora DIRETO na região viva (é como o leitor anuncia).
    const salvo = screen.getByText(COPY.editor.saved)
    expect(salvo.getAttribute('role')).toBe('status')
    expect(salvo.className).toBe('pin-bar-seal pin-bar-seal--ok')
    expect(salvo.querySelector('svg')).not.toBeNull()

    // O voltar e os atalhos são os quadrados claros; desfazer e refazer seguem sem fundo.
    expect(screen.getByRole('button', { name: COPY.editor.back }).className).toContain('bg-pin-bg')
    expect(screen.getByRole('button', { name: COPY.shortcuts.button }).className).toContain(
      'bg-pin-bg',
    )
    expect(screen.getByRole('button', { name: COPY.editor.undo }).className).not.toContain(
      'bg-pin-bg',
    )
  })

  it('sem o "Usar no Estúdio", o "Baixar" é a pílula azul', async () => {
    montar([createPixelBackgroundAsset({ name: 'ceu', width: 8, height: 8 })])
    await abrir('ceu')
    expect(screen.getByRole('button', { name: COPY.editor.download }).className).toBe(
      'pin-bar-btn pin-bar-btn--primary',
    )
  })

  it('num desenho de um jogo do Pensa, a azul é o "Usar no Estúdio" e o "Baixar" fica branco', async () => {
    const doJogo: PintaAsset = {
      ...createPixelBackgroundAsset({ name: 'ceu-do-jogo', width: 8, height: 8 }),
      projectRef: { id: 'jogo-1', name: 'meu-jogo' },
    }
    montar([doJogo], { sendToStudio: async () => ({ ok: true }) })
    await abrir('ceu-do-jogo')
    expect(screen.getByRole('button', { name: COPY.editor.sendToStudio }).className).toBe(
      'pin-bar-btn pin-bar-btn--primary',
    )
    expect(screen.getByRole('button', { name: COPY.editor.download }).className).toBe(
      'pin-bar-btn pin-bar-btn--outline',
    )
  })

  it('no mapa, o "Jogar meu mapa" é a pílula branca ao lado da azul', async () => {
    const pecas = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    const mapa = createTilemapAsset({ name: 'fase', tilesetId: pecas.id, cols: 4, rows: 3 })
    montar([pecas, mapa], { sendGameToStudio: async () => ({ ok: true }) })
    await abrir('fase')
    expect(screen.getByRole('button', { name: COPY.tiles.playMap }).className).toBe(
      'pin-bar-btn pin-bar-btn--outline',
    )
    expect(screen.getByRole('button', { name: COPY.editor.download }).className).toBe(
      'pin-bar-btn pin-bar-btn--primary',
    )
  })

  it('a nuvem do host em repouso é só o ícone (o nome no title); com algo acontecendo, a frase curta', async () => {
    const nave = createPixelSpriteAsset({ name: 'nave', frameSize: 32 })
    const chrome = (status: PintaHostChrome['status']): PintaHostChrome => ({
      menu: null,
      status,
      back: null,
      account: null,
    })
    const { unmount } = montar(
      [nave],
      {},
      chrome({
        tone: 'ok',
        icon: 'cloud',
        label: 'Guardado na sua conta',
        text: 'Guardado na sua conta',
      }),
    )
    await abrir('nave')
    const repouso = screen.getByRole('status', { name: 'Guardado na sua conta' })
    expect(repouso.textContent).toBe('')
    expect(repouso.className).toBe('pin-bar-seal pin-bar-seal--ok pin-bar-seal--icon')
    unmount()

    montar(
      [nave],
      {},
      chrome({
        tone: 'warn',
        icon: 'offline',
        label: 'Sem internet agora',
        text: 'Sem internet agora. Vou guardar na sua conta quando voltar.',
      }),
    )
    await abrir('nave')
    const aviso = screen.getByRole('status', {
      name: 'Sem internet agora. Vou guardar na sua conta quando voltar.',
    })
    expect(aviso.textContent).toBe('Sem internet agora')
    expect(aviso.className).toContain('pin-bar-seal--warn')
  })
})

/**
 * Desenho da conta feito num Pinta mais novo que o desta página: a galeria NÃO o abre (ler seria
 * descartar o que este código não conhece e salvar por cima) e mostra o aviso com o botão de
 * atualizar a página. Sem aviso do armazenamento, nada aparece.
 */
import { beforeEach, describe, expect, it } from 'bun:test'
import { render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { createPixelSpriteAsset } from '../../core/project'
import type { PintaPersistence, PintaReadIssue } from '../../state/persistence'
import { clearIdbMock } from '../../testing/idbMock'

const { PintaApp } = await import('../PintaApp')
const { setPintaStorageNamespace } = await import('../../state/persistence')
const { createMemoryPersistence } = await import('../../state/memoryPersistence')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

function galeria(issues: PintaReadIssue[] | null) {
  const persistence: PintaPersistence = {
    ...createMemoryPersistence([createPixelSpriteAsset({ name: 'nave', frameSize: 32 })]),
    subscribe: () => () => {},
    ...(issues ? { getReadIssues: () => issues } : {}),
  }
  render(<PintaApp persistence={persistence} />)
  return waitFor(() => expect(screen.getByRole('button', { name: /Abrir nave/ })).toBeTruthy())
}

const issue = (id: string, name: string): PintaReadIssue => ({
  id,
  name,
  status: 'unsupported',
  version: 9,
})

describe('galeria: desenho de formato mais novo', () => {
  it('um desenho: aviso no singular com o botão de atualizar, e ele não vira cartão', async () => {
    await galeria([issue('m1', 'vila')])
    const aviso = await screen.findByRole('alert')
    expect(aviso.textContent).toContain(COPY.gallery.newerFormat(1))
    expect(screen.getByRole('button', { name: COPY.gallery.newerFormatReload })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Abrir vila/ })).toBeNull()
  })

  it('vários desenhos: a contagem aparece na frase', async () => {
    await galeria([issue('m1', 'vila'), issue('m2', 'floresta'), issue('m3', 'pecas')])
    expect((await screen.findByRole('alert')).textContent).toContain(COPY.gallery.newerFormat(3))
    expect(COPY.gallery.newerFormat(3)).toContain('3 desenhos')
  })

  it('sem aviso do armazenamento (ou sem o método), a galeria não mostra nada', async () => {
    await galeria([])
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('button', { name: COPY.gallery.newerFormatReload })).toBeNull()
  })
})

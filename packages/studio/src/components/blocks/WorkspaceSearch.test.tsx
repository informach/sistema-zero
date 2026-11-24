import { afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import * as Blockly from 'blockly/core'
import { useCallback, useState } from 'react'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import WorkspaceSearch from './WorkspaceSearch'

/**
 * Revisão do lote 3 (21/11/2026), achados 7 a 9 da busca "Procurar no programa": o resultado
 * acompanha o programa (não aponta bloco apagado), remontar não reabre a busca sozinha e fechar
 * devolve o foco ao botão. Workspace headless de verdade; o Blockly dispara os eventos numa tarefa
 * depois da mudança.
 */
beforeAll(() => {
  ensureBlocklyInitialized()
})
afterEach(() => cleanup())

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

function workspaceWith(codes: string[]) {
  const workspace = new Blockly.Workspace()
  Blockly.serialization.workspaces.load(
    {
      blocks: {
        languageVersion: 0,
        blocks: codes.map((code, index) => ({
          type: 'sz_adv_raw_js',
          id: `b${index}`,
          x: 0,
          y: index * 100,
          fields: { CODE: code },
        })),
      },
    },
    workspace,
  )
  return workspace
}

const campo = () => screen.getByRole('searchbox', { name: 'Procurar nos blocos do programa' })

describe('WorkspaceSearch', () => {
  it('um pedido pendente abre e é atendido; remontar sem pedido não reabre', async () => {
    const workspace = workspaceWith(['pontos = 0'])
    try {
      // Como o painel: o pedido fica pendente até a busca avisar que o atendeu.
      function Painel() {
        const [pendente, setPendente] = useState(false)
        const atendido = useCallback(() => setPendente(false), [])
        return (
          <>
            <button type="button" onClick={() => setPendente(true)}>
              atalho
            </button>
            <WorkspaceSearch
              workspace={workspace}
              onReveal={() => {}}
              openPending={pendente}
              onOpenHandled={atendido}
            />
          </>
        )
      }
      const primeiro = render(<Painel />)
      expect(screen.queryByRole('searchbox')).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'atalho' }))
      expect(document.activeElement).toBe(campo())
      primeiro.unmount()
      // Remontar (o projeto cruzou os 300 blocos de novo) não reabre nem rouba o foco.
      render(<Painel />)
      expect(screen.queryByRole('searchbox')).toBeNull()
      expect(screen.getByRole('button', { name: 'Procurar no programa' })).toBeTruthy()
    } finally {
      workspace.dispose()
    }
  })

  it('o Ctrl+F apertado antes de a busca montar vale quando ela monta', async () => {
    const workspace = workspaceWith(['pontos = 0'])
    try {
      render(
        <WorkspaceSearch
          workspace={workspace}
          onReveal={() => {}}
          openPending
          onOpenHandled={() => {}}
        />,
      )
      expect(document.activeElement).toBe(campo())
    } finally {
      workspace.dispose()
    }
  })

  it('o resultado acompanha o programa: um bloco apagado sai da lista', async () => {
    const workspace = workspaceWith(['pontos = 0', 'vidas = 3', 'pontos extra'])
    try {
      render(
        <WorkspaceSearch
          workspace={workspace}
          onReveal={() => {}}
          openPending={false}
          onOpenHandled={() => {}}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Procurar no programa' }))
      fireEvent.change(campo(), { target: { value: 'pontos' } })
      await act(tick)
      expect(screen.getByText('2 blocos')).toBeTruthy()
      act(() => {
        workspace.getBlockById('b2')?.dispose()
      })
      // O Blockly 12 entrega os eventos num requestAnimationFrame seguido de um setTimeout(0):
      // esperar só um setTimeout(0) passava por sorte de tempo (reprovou no CI Linux em 21/11).
      expect(await screen.findByText('1 bloco')).toBeTruthy()
      expect(screen.queryByText('pontos extra')).toBeNull()
    } finally {
      workspace.dispose()
    }
  })

  it('Esc fecha e devolve o foco ao botão', async () => {
    const workspace = workspaceWith(['pontos = 0'])
    try {
      render(
        <WorkspaceSearch
          workspace={workspace}
          onReveal={() => {}}
          openPending={false}
          onOpenHandled={() => {}}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Procurar no programa' }))
      expect(document.activeElement).toBe(campo())
      // Sem resultado, o campo não aponta uma lista que não existe.
      expect(campo().getAttribute('aria-controls')).toBeNull()
      fireEvent.keyDown(campo(), { key: 'Escape' })
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Procurar no programa' }),
      )
    } finally {
      workspace.dispose()
    }
  })
})

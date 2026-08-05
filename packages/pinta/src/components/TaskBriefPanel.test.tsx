import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { PintaTaskSession } from '../core/types'
import { TaskBriefPanel } from './TaskBriefPanel'

afterEach(cleanup)

function session(overrides: Partial<PintaTaskSession['progress']> = {}, requiresStudioUse = true) {
  const onProgress = mock(
    async (_input: Parameters<PintaTaskSession['onProgress']>[0]) => undefined,
  )
  const value: PintaTaskSession = {
    taskId: 'task-art',
    title: 'Desenhar a heroína',
    summary: null,
    project: { id: 'plan', name: 'Bosque' },
    cycle: { id: 'cycle', number: 1, goal: null },
    brief: {
      assetId: 'hero',
      artKind: 'sprite',
      style: 'pixel',
      palette: [{ role: 'roupa', color: '#AA33CC' }],
      appearance: 'Pequena, ágil e com capa roxa',
      animations: ['andar'],
      states: ['parada'],
      usage: 'Personagem principal',
      requiresStudioUse,
    },
    guide: {
      steps: [{ id: 'draw', text: 'Desenhar a personagem', required: true }],
      criteria: [{ id: 'readable', text: 'Silhueta legível', required: true }],
    },
    progress: {
      status: 'in_progress',
      completedStepIds: ['draw'],
      completedCriteriaIds: ['readable'],
      startedAt: '2026-08-04T12:00:00.000Z',
      completedAt: null,
      updatedAt: '2026-08-04T12:00:00.000Z',
      outputRef: { kind: 'pinta_asset', assetId: 'asset-1', ...overrides.outputRef },
      ...overrides,
    },
    onProgress,
  }
  return { value, onProgress }
}

describe('Brief do meu jogo', () => {
  test('checkboxes têm alvo de toque de pelo menos 44px', () => {
    render(<TaskBriefPanel session={session().value} />)
    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox.closest('label')?.classList.contains('min-h-11')).toBe(true)
    }
  })

  test('persiste o contexto e exige envio ao Estúdio quando o cartão pede', async () => {
    const pending = session()
    const view = render(<TaskBriefPanel session={pending.value} />)
    expect(screen.getByText(/Pequena, ágil/)).toBeTruthy()
    expect(screen.getByText('roupa')).toBeTruthy()
    expect(
      (screen.getByRole('button', { name: 'Concluir tarefa' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(screen.getByText(/Usar no Estúdio/)).toBeTruthy()

    const ready = session({
      outputRef: {
        kind: 'pinta_asset',
        assetId: 'asset-1',
        usedInStudioAt: '2026-08-04T12:00:00.000Z',
      },
    })
    view.rerender(<TaskBriefPanel session={ready.value} />)
    fireEvent.click(screen.getByRole('button', { name: 'Concluir tarefa' }))
    await waitFor(() => expect(ready.onProgress).toHaveBeenCalledWith({ status: 'completed' }))
  })

  test('explica o bloqueio quando o Estúdio exigido não foi liberado', () => {
    const blocked = session({ outputRef: { kind: 'pinta_asset', assetId: 'asset-1' } })
    blocked.value.studioUseBlockedReason = 'O Estúdio ainda não está liberado para esta conta.'
    render(<TaskBriefPanel session={blocked.value} />)
    expect(screen.getByText('O Estúdio ainda não está liberado para esta conta.')).toBeTruthy()
    expect(
      (screen.getByRole('button', { name: 'Concluir tarefa' }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  test('mantém o brief e informa falha de rede sem concluir localmente', async () => {
    const failing = session({
      outputRef: {
        kind: 'pinta_asset',
        assetId: 'asset-1',
        usedInStudioAt: '2026-08-04T12:00:00.000Z',
      },
    })
    failing.value.onProgress = mock(async () => {
      throw new Error('offline')
    })
    render(<TaskBriefPanel session={failing.value} />)
    fireEvent.click(screen.getByRole('button', { name: 'Concluir tarefa' }))
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('Confira a internet'),
    )
    expect(screen.getByText(/Pequena, ágil/)).toBeTruthy()
  })

  test('oferece recriar ou vincular quando o desenho existe só em outro aparelho', () => {
    const missing = session()
    const onRecreate = mock(() => undefined)
    const onRelink = mock(() => undefined)
    render(
      <TaskBriefPanel
        session={missing.value}
        outputMissing
        onRecreate={onRecreate}
        onRelink={onRelink}
      />,
    )

    expect(screen.getByRole('alert').textContent).toContain('não está neste aparelho')
    fireEvent.click(screen.getByRole('button', { name: 'Recriar com este brief' }))
    fireEvent.click(screen.getByRole('button', { name: 'Vincular outro desenho' }))
    expect(onRecreate).toHaveBeenCalledTimes(1)
    expect(onRelink).toHaveBeenCalledTimes(1)
    expect(
      (screen.getByRole('button', { name: 'Concluir tarefa' }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })
})

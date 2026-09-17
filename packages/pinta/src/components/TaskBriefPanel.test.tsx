import { afterEach, describe, expect, mock, test } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../core/copy'
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

describe('Voltar ao plano', () => {
  test('sem o callback do host o botão não existe', () => {
    render(<TaskBriefPanel session={session().value} />)
    expect(screen.queryByRole('button', { name: COPY.task.back })).toBeNull()
  })

  test('aparece com alvo de 44px, chama uma vez, e continua com a tarefa concluída', async () => {
    const onReturn = mock(async () => undefined)
    const view = render(<TaskBriefPanel session={session().value} onReturn={onReturn} />)
    const botao = screen.getByRole('button', { name: COPY.task.back })
    expect(botao.classList.contains('min-h-11')).toBe(true)
    // O nome acessível é o texto visível: nada de `aria-label` nem de `title`.
    expect(botao.getAttribute('aria-label')).toBeNull()
    expect(botao.getAttribute('title')).toBeNull()

    fireEvent.click(botao)
    await waitFor(() => expect(onReturn).toHaveBeenCalledTimes(1))

    // Terminar o desenho é justamente quando ela quer voltar: o botão fica.
    const concluida = session({ status: 'completed', completedAt: '2026-09-17T12:00:00.000Z' })
    view.rerender(<TaskBriefPanel session={concluida.value} onReturn={onReturn} />)
    expect(screen.queryByRole('button', { name: 'Concluir tarefa' })).toBeNull()
    expect(screen.getByRole('button', { name: COPY.task.back })).toBeTruthy()
  })

  test('o botão e o recado ficam FORA do brief que recolhe e do corpo que rola', () => {
    const view = render(
      <TaskBriefPanel session={session().value} onReturn={async () => undefined} />,
    )
    const botao = screen.getByRole('button', { name: COPY.task.back })
    const details = view.container.querySelector('details')
    expect(details).toBeTruthy()
    // Nem dentro do <details> (recolher o brief o esconderia, e o estado recolhido
    // atravessa a troca galeria↔editor) nem dentro do corpo `max-h-52 overflow-auto`
    // (no celular ele nascia abaixo da dobra do painel).
    expect(details?.contains(botao)).toBe(false)
    expect(botao.closest('.overflow-auto')).toBeNull()
    // E nada de controle interativo dentro do <summary>: o clique abriria o brief.
    expect(view.container.querySelector('summary button')).toBeNull()
    // A ordem de leitura e o Tab seguem o texto: resumo, brief, saída.
    const foco = Array.from(view.container.querySelectorAll<HTMLElement>('summary, button, input'))
    expect(foco.at(-1)).toBe(botao)
  })

  test('dois cliques seguidos guardam e navegam UMA vez só', async () => {
    let liberar: (() => void) | null = null
    const onReturn = mock(
      () =>
        new Promise<void>((resolve) => {
          liberar = () => resolve()
        }),
    )
    render(<TaskBriefPanel session={session().value} onReturn={onReturn} />)
    const botao = screen.getByRole('button', { name: COPY.task.back }) as HTMLButtonElement

    fireEvent.click(botao)
    // O rótulo NÃO muda enquanto guarda (mudaria o nome acessível no meio da ação).
    expect(botao.disabled).toBe(true)
    expect(botao.getAttribute('aria-busy')).toBe('true')
    // ⚠️⚠️ O `disabled` sai daqui de propósito: no clique duplo REAL o navegador chega ao
    // segundo clique ANTES do re-render que o aplica, e quem segura é a trava por REF.
    // Com o atributo no lugar, o teste passava mesmo sem a trava (medido no full review).
    botao.removeAttribute('disabled')
    fireEvent.click(botao)
    expect(onReturn).toHaveBeenCalledTimes(1)

    await act(async () => {
      liberar?.()
      await Bun.sleep(0)
    })
    expect(onReturn).toHaveBeenCalledTimes(1)
  })

  test('enquanto guarda anuncia numa região viva, e navegar não devolve o botão', async () => {
    let liberar: (() => void) | null = null
    const onReturn = mock(
      () =>
        new Promise<void>((resolve) => {
          liberar = () => resolve()
        }),
    )
    const view = render(<TaskBriefPanel session={session().value} onReturn={onReturn} />)
    // A região viva monta VAZIA (uma que nasce com o texto não é anunciada).
    const status = view.container.querySelector('[role="status"]')
    expect(status?.textContent).toBe('')

    fireEvent.click(screen.getByRole('button', { name: COPY.task.back }))
    await waitFor(() => expect(status?.textContent).toBe(COPY.task.backBusy))

    await act(async () => {
      liberar?.()
      await Bun.sleep(0)
    })
    // Quem navegou não volta para esta tela: o botão NÃO é reabilitado no sucesso.
    const botao = screen.getByRole('button', { name: COPY.task.back }) as HTMLButtonElement
    expect(botao.disabled).toBe(true)
    expect(botao.getAttribute('aria-busy')).toBe('true')
  })

  test('falha ao guardar mostra o recado desta tela, nunca a mensagem do erro', async () => {
    // O caso COMUM: o `flush` do editor rejeita com `COPY.editor.saveError`, que é o
    // rótulo de três palavras do selo da barra.
    const onReturn = mock(async () => {
      throw new Error(COPY.editor.saveError)
    })
    render(<TaskBriefPanel session={session().value} onReturn={onReturn} />)
    fireEvent.click(screen.getByRole('button', { name: COPY.task.back }))

    const alerta = await waitFor(() => screen.getByRole('alert'))
    expect(alerta.textContent).toBe(COPY.task.backError)
    expect(alerta.textContent).not.toContain(COPY.editor.saveError)
    // Nada de "internet": esta gravação é local.
    expect(alerta.textContent).not.toContain('internet')
    // E o recado não sai em letra miúda: o piso da casa para criança é 12px.
    expect(alerta.tagName).toBe('P')
    expect(alerta.className).toContain('text-sm')

    const botao = screen.getByRole('button', { name: COPY.task.back }) as HTMLButtonElement
    expect(botao.disabled).toBe(false)
    expect(botao.getAttribute('aria-busy')).toBe('false')
    // O brief continua na tela: falhar não tira a criança de onde ela estava.
    expect(screen.getByText(/Pequena, ágil/)).toBeTruthy()
  })

  test('erro do HOST também vira a frase desta tela', async () => {
    const onReturn = mock(async () => {
      throw new Error('Falha de mentira do playground.')
    })
    render(<TaskBriefPanel session={session().value} onReturn={onReturn} />)
    fireEvent.click(screen.getByRole('button', { name: COPY.task.back }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(COPY.task.backError))
  })
})

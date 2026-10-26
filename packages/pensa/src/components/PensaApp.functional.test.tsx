import { describe, expect, mock, test } from 'bun:test'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { PensaHostAdapter, PensaTransport } from '../core/types'
import { PensaApp } from './PensaApp'
import { handoffFixture, MISSION_ID, PROJECT_ID, projectFixture } from './pensa.fixture'

function host(request: PensaTransport['request']): PensaHostAdapter {
  return {
    transport: { request },
    mode: 'kids',
    viewerId: 'fixture',
    onOpenGame: mock(),
    onOpenMission: mock(),
  }
}

describe('Pensa funcional', () => {
  test('o botão de retomar solicita uma nova tentativa do trabalho que falhou', async () => {
    const view = projectFixture()
    view.operation = {
      id: '10000000-0000-4000-8000-000000000088',
      projectId: PROJECT_ID,
      draftId: null,
      kind: 'planning',
      step: 'outline',
      status: 'failed',
      calls: 1,
      error: 'A conexão caiu. Sua proposta está guardada.',
      createdAt: view.project.createdAt,
      updatedAt: view.project.updatedAt,
    }
    let sent: unknown
    const adapter = host(async <T,>(path: string, init?: { body?: unknown }) => {
      if (path.startsWith('/projects?')) return [] as T
      if (path.endsWith('/work')) sent = init?.body
      return view as T
    })
    render(<PensaApp adapter={adapter} initialProjectId={PROJECT_ID} />)
    expect(
      await screen.findByRole('heading', { name: 'Deu um tropeço. A sua ideia está guardada.' }),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^Tentar de novo$/ }))
    await waitFor(() => expect(sent).toMatchObject({ retry: true }))
  })
  // Incidente de 26/10/2026: a rodada já tinha gastado as duas tentativas e o "Tentar de novo"
  // seguia na tela, recusado na hora a cada clique.
  test('a falha sem tentativas restantes não oferece o botão que nunca funciona', async () => {
    const view = projectFixture()
    view.operation = {
      id: '10000000-0000-4000-8000-000000000088',
      projectId: PROJECT_ID,
      draftId: null,
      kind: 'planning',
      step: 'understanding',
      status: 'failed',
      calls: 5,
      error: 'Esta parte atingiu o limite de tentativas. Sua ideia está guardada.',
      retryable: false,
      createdAt: view.project.createdAt,
      updatedAt: view.project.updatedAt,
    }
    const adapter = host(
      async <T,>(path: string) => (path.startsWith('/projects?') ? [] : view) as T,
    )
    render(<PensaApp adapter={adapter} initialProjectId={PROJECT_ID} />)
    expect(
      await screen.findByRole('heading', { name: 'Deu um tropeço. A sua ideia está guardada.' }),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Tentar de novo$/ })).toBeNull()
    expect(
      screen.getByText(
        'Essa parte já usou as tentativas que tinha. Me conte de outro jeito e eu continuo.',
      ),
    ).toBeTruthy()
    expect(screen.getByLabelText('Mensagem para o Zappy')).toBeTruthy()
  })
  test('o plano inteiro pode ser consultado antes de liberar a execução das próximas missões', async () => {
    const adapter = host(
      async <T,>(path: string) => (path.startsWith('/projects?') ? [] : projectFixture()) as T,
    )
    render(<PensaApp adapter={adapter} initialProjectId={PROJECT_ID} />)
    fireEvent.click(await screen.findByRole('button', { name: /^Missão 2, / }))
    const dialog = await screen.findByRole('dialog', { name: 'Prepare os seis pares de cartas' })
    expect(dialog.textContent).toContain('Cada animal aparece em duas cartas.')
    expect(dialog.textContent).toContain('Há doze cartas e seis pares de animais.')
    expect(dialog.textContent).toContain('Faça primeiro a missão anterior.')
    const run = within(dialog).getByRole('button', { name: 'Continuar no Estúdio' })
    expect(run.hasAttribute('disabled')).toBe(true)
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Fechar' })[0]!)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
  test('a ajuda trazida de uma oficina preserva a missão escolhida', async () => {
    let sent: unknown
    const adapter = host(async <T,>(path: string, init?: { body?: unknown }) => {
      if (path.startsWith('/projects?')) return [] as T
      if (path.endsWith('/messages')) sent = init?.body
      return projectFixture() as T
    })
    render(
      <PensaApp
        adapter={adapter}
        initialProjectId={PROJECT_ID}
        initialHelpMissionId={MISSION_ID}
      />,
    )
    fireEvent.change(await screen.findByLabelText('Sua dúvida'), {
      target: { value: 'Não entendi o resultado desta missão.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    await waitFor(() => expect(sent).toMatchObject({ kind: 'help', missionId: MISSION_ID }))
  })
  test('abrir a home não cria projeto; o primeiro envio preserva a ideia e a idempotência após falha', async () => {
    const calls: { path: string; body?: unknown }[] = []
    let fail = true
    const adapter = host(async <T,>(path: string, init?: { body?: unknown }) => {
      calls.push({ path, body: init?.body })
      if (path.startsWith('/projects?')) return [] as T
      if (path === '/projects') {
        if (fail) throw new Error('Sem rede agora')
        return projectFixture() as T
      }
      return projectFixture() as T
    })
    render(<PensaApp adapter={adapter} />)
    // Sem nenhum jogo, o Pensa já abre na nova ideia.
    fireEvent.change(await screen.findByLabelText('Sua ideia'), {
      target: { value: 'Quero um jogo com doze cartas.' },
    })
    expect(calls.some((call) => call.path === '/projects')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Organizar meu jogo' }))
    await screen.findByRole('alert')
    expect((screen.getByLabelText('Sua ideia') as HTMLTextAreaElement).value).toBe(
      'Quero um jogo com doze cartas.',
    )
    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Organizar meu jogo' }))
    await screen.findByRole('heading', { name: 'Memória dos animais', level: 1 })
    const attempts = calls.filter((call) => call.path === '/projects')
    expect(attempts).toHaveLength(2)
    expect(attempts[1]?.body).toEqual(attempts[0]?.body)
  })
  test('mostra resultado e conferência da preparação e abre o mesmo jogo por uma missão canônica', async () => {
    const calls: string[] = []
    const adapter = host(async <T,>(path: string) => {
      calls.push(path)
      if (path.startsWith('/projects?')) return [] as T
      if (path.includes('/handoff')) return handoffFixture() as T
      return projectFixture() as T
    })
    render(<PensaApp adapter={adapter} initialProjectId={PROJECT_ID} />)
    await screen.findByRole('heading', { name: 'Prepare o Estúdio para seu jogo' })
    expect(screen.getByText('Recomendo Jogo 2D Avançado para as cartas deste jogo.')).toBeTruthy()
    expect(screen.getByText('Jogo 2D Avançado está instalada.')).toBeTruthy()
    expect(screen.queryByText(/Próximo passo|Passo 1 de/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Continuar no Estúdio' }))
    await waitFor(() =>
      expect(adapter.onOpenMission).toHaveBeenCalledWith({
        missionId: MISSION_ID,
        destination: 'studio',
        studioProjectId: handoffFixture().studioProjectId,
        studioAuthoring: 'blocks',
      }),
    )
    expect(calls.some((path) => /v2|cycles|stages/.test(path))).toBe(false)
  })
  test('a próxima ação do servidor pode pedir reconferência de uma missão já concluída', async () => {
    const view = projectFixture()
    view.nextAction = {
      type: 'mission',
      missionId: MISSION_ID,
      destination: 'studio',
      mode: 'reconfirm',
    }
    view.progress[0]!.status = 'completed'
    view.progress[0]!.validity = 'needs_review'
    view.availability[0]!.mode = 'reconfirm'
    const adapter = host(
      async <T,>(path: string) => (path.startsWith('/projects?') ? [] : view) as T,
    )
    render(<PensaApp adapter={adapter} initialProjectId={PROJECT_ID} />)
    expect(await screen.findByText(/Vamos conferir de novo/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Conferir no Estúdio' })).toBeTruthy()
  })
})

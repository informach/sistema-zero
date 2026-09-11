import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type {
  PensaCycleView,
  PensaHostAdapter,
  PensaProjectDetailView,
  PensaStage,
  PensaStageView,
  PensaTaskDestination,
  PensaTaskView,
} from '../core/types'
import { PensaApp } from './PensaApp'

afterEach(cleanup)

/**
 * A tela do plano no desenho das telas-modelo (11/09/2026): creme com o cabeçalho, o mapa ZERO e o
 * aviso de "revendo"; céu com a etapa; lilás com o "Plano aprovado!" (só quando as quatro etapas
 * estão vencidas), que conta os cartões por oficina e leva até a lista. happy-dom não faz layout: o
 * que se trava é a estrutura, o texto e o foco; o desenho confere-se no playground.
 */
function cycleAt(stage: PensaStage): PensaCycleView {
  const done = ['z', 'e', 'r', 'o'].slice(
    0,
    stage === 'done' ? 4 : ['z', 'e', 'r', 'o'].indexOf(stage),
  )
  const at = (s: string) => (done.includes(s) ? '2026-08-04T10:00:00.000Z' : null)
  return {
    id: 'cycle-1',
    number: 2,
    goal: null,
    stage,
    zCompletedAt: at('z'),
    eCompletedAt: at('e'),
    rCompletedAt: at('r'),
    oCompletedAt: at('o'),
  }
}

function task(id: string, position: number, destination: PensaTaskDestination): PensaTaskView {
  return {
    id,
    title: `Cartão ${id}`,
    summary: 'Um cartão pequeno e claro.',
    destination,
    category: destination === 'studio' ? 'gameplay' : 'art',
    estimatedMinutes: 20,
    position,
    dependencies: [],
    guide: { steps: [], criteria: [] },
    context:
      destination === 'studio'
        ? {
            kind: 'studio',
            dimension: '2d',
            visualAssetIds: [],
            blockIds: [],
            blocks: [],
            mechanicDocumentIds: [],
            extensionIds: [],
          }
        : {
            kind: 'pinta',
            assetId: `${id}-asset`,
            artKind: 'sprite',
            style: 'pixel',
            palette: [],
            appearance: 'Colorido.',
            animations: [],
            states: [],
            usage: 'No jogo.',
            requiresStudioUse: false,
          },
    progress: {
      status: 'planned',
      completedStepIds: [],
      completedCriteriaIds: [],
      outputRef: null,
      startedAt: null,
      completedAt: null,
      updatedAt: null,
    },
    revision: 1,
    supersedesTaskId: null,
  }
}

const TASKS = [task('a', 0, 'studio'), task('b', 1, 'pinta'), task('c', 2, 'studio')]

function stageView(stage: PensaStage, extra: Partial<PensaStageView> = {}): PensaStageView {
  return {
    stage,
    conversation: { messages: [], summary: null, messageCount: 0 },
    state: {},
    artifacts: [],
    tasks: [],
    nextTaskId: null,
    ...extra,
  }
}

function adapterFor(stage: PensaStage): PensaHostAdapter {
  const cycle = cycleAt(stage)
  const detail: PensaProjectDetailView = {
    id: 'plan-1',
    name: 'Runo',
    status: 'active',
    createdAt: '2026-08-04T09:00:00.000Z',
    updatedAt: '2026-08-04T10:30:00.000Z',
    cycles: [cycle],
    currentCycle: cycle,
    artifactsIndex: [],
  }
  const views: Record<string, PensaStageView> = {
    z: stageView('z', {
      conversation: {
        messages: [
          { role: 'user', content: 'Um jogo de corrida.', at: '2026-08-04T09:01:00.000Z' },
        ],
        summary: null,
        messageCount: 1,
      },
    }),
    r: stageView('r', { tasks: TASKS }),
    done: stageView('done', { tasks: TASKS, nextTaskId: 'a' }),
  }
  const request = mock(async (path: string) => {
    if (path === '/projects/plan-1') return { project: detail }
    const match = /^\/cycles\/cycle-1\/stages\/(.+)$/.exec(path)
    if (match?.[1] && views[match[1]]) return views[match[1]]
    throw new Error(`Unexpected request: ${path}`)
  })
  return {
    mode: 'kids',
    capabilities: { pintaOwned: true, studioOwned: true, moldaOwned: true },
    onOpenTask: () => undefined,
    transport: {
      request: request as PensaHostAdapter['transport']['request'],
      streamChat: () => () => {},
    },
  }
}

async function openPlan(stage: PensaStage) {
  render(<PensaApp adapter={adapterFor(stage)} initialProjectId="plan-1" />)
  await waitFor(() => screen.getByRole('heading', { name: 'Runo', level: 1 }))
  const bands = Array.from(document.querySelector('.pensa-plan.sz-tool-bands')?.children ?? [])
  return bands as HTMLElement[]
}

describe('a tela do plano nas faixas', () => {
  test('creme com o cabeçalho das galerias: [menu][voltar], "VERSÃO N", o nome e a pílula do andamento', async () => {
    const [creme] = await openPlan('done')
    expect(creme?.className).toBe('sz-tool-band sz-tool-band--creme')
    const header = within(creme as HTMLElement)
    expect(header.getByRole('heading', { name: 'Runo', level: 1 }).className).toContain(
      'sz-tool-title',
    )
    expect(header.getByText('VERSÃO 2').className).toContain('sz-tool-kicker')
    // O "voltar" é o MESMO quadrado das galerias (a receita compartilhada).
    expect(header.getByRole('button', { name: 'Voltar aos meus planos' }).className).toBe(
      'sz-tool-icon-btn',
    )
    // Aprovado = a pílula menta; o mapa ZERO mora na mesma faixa.
    expect(header.getByText('Plano aprovado').className).toContain('sz-tool-status--ok')
    expect(header.getByRole('navigation', { name: 'Mapa da metodologia ZERO' })).toBeTruthy()
  })

  test('planejando: a pílula neutra e SEM a faixa lilás do aprovado', async () => {
    const bands = await openPlan('r')
    const pilula = screen.getByText('Planejando')
    expect(pilula.className).toContain('sz-tool-status')
    expect(pilula.className).not.toContain('sz-tool-status--ok')
    expect(bands.map((band) => band.className)).toEqual([
      'sz-tool-band sz-tool-band--creme',
      'sz-tool-band sz-tool-band--ceu',
    ])
    // A etapa atual: o ladrilho azul com a letra e o h2 da régua.
    const titulo = screen.getByRole('heading', { name: 'Roteirizar a Criação', level: 2 })
    expect(titulo.className).toContain('sz-tool-section-title')
    expect(bands[1]?.contains(titulo)).toBe(true)
  })

  test('o aviso de "revendo" fecha a faixa creme (mesmo role, texto e botão), a etapa vai para a céu', async () => {
    const [creme, ceu] = await openPlan('done')
    fireEvent.click(
      screen.getByRole('button', { name: 'Rever a etapa Zerar a Bagunça (concluída)' }),
    )
    const texto = await screen.findByText('Você está revendo uma etapa que já foi concluída.')
    const aviso = texto.closest('[role="status"]') as HTMLElement
    expect(aviso).not.toBeNull()
    expect(creme?.contains(aviso)).toBe(true)
    const voltar = within(aviso).getByRole('button', { name: 'Voltar para o meu plano' })
    expect(voltar.className).toContain('sz-tool-pill--outline')
    await waitFor(() =>
      expect(
        ceu?.contains(screen.getByRole('heading', { name: 'Zerar a Bagunça', level: 2 })),
      ).toBe(true),
    )
    fireEvent.click(voltar)
    await waitFor(() => screen.getByRole('heading', { name: 'Meu plano' }))
  })

  test('aprovado: a faixa lilás conta os cartões por oficina (sem a que não tem) e leva até a lista', async () => {
    const bands = await openPlan('done')
    const lilas = bands[2]
    expect(lilas?.className).toBe('sz-tool-band sz-tool-band--lilas')
    const faixa = within(lilas as HTMLElement)
    expect(
      faixa.getByRole('heading', { name: 'Plano aprovado! Agora é só construir.' }),
    ).toBeTruthy()
    const oficinas = faixa.getAllByRole('listitem').map((item) => item.textContent)
    // Dois cartões do Estúdio e um do Pinta; o Molda, sem cartão, não aparece.
    expect(oficinas).toEqual(['Estúdio · 2 cartões', 'Pinta · 1 cartão'])

    // Com o peek aberto, o botão fecha o peek e leva o FOCO até a lista dos cartões.
    fireEvent.click(
      screen.getByRole('button', { name: 'Rever a etapa Zerar a Bagunça (concluída)' }),
    )
    await screen.findByText('Você está revendo uma etapa que já foi concluída.')
    fireEvent.click(faixa.getByRole('button', { name: 'Ver os Cartões de Criação' }))
    await waitFor(() => screen.getByRole('heading', { name: 'Meu plano' }))
    await waitFor(() => expect(document.activeElement?.className).toBe('pensa-cards-anchor'))
    expect(screen.queryByText('Você está revendo uma etapa que já foi concluída.')).toBeNull()
    // A âncora não entra na ordem do Tab (o foco é só por programa).
    expect(document.activeElement?.getAttribute('tabindex')).toBe('-1')
  })
})

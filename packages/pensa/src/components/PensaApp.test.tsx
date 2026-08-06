import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type {
  PensaHostAdapter,
  PensaProjectDetailView,
  PensaStageView,
  PensaTaskView,
} from '../core/types'
import { PensaApp } from './PensaApp'

afterEach(cleanup)

const cycle = {
  id: 'cycle-1',
  number: 1,
  goal: null,
  stage: 'done' as const,
  zCompletedAt: '2026-08-04T10:00:00.000Z',
  eCompletedAt: '2026-08-04T10:10:00.000Z',
  rCompletedAt: '2026-08-04T10:20:00.000Z',
  oCompletedAt: '2026-08-04T10:30:00.000Z',
}
const task = (
  id: string,
  position: number,
  destination: 'pinta' | 'studio',
  dependencies: string[] = [],
): PensaTaskView => ({
  id,
  title: position ? 'Programar a coleta' : 'Desenhar a estrela',
  summary: 'Um cartão pequeno e claro.',
  destination,
  category: position ? 'gameplay' : 'art',
  estimatedMinutes: 20,
  position,
  dependencies,
  guide: {
    steps: [{ id: `${id}-step`, text: 'Criar', required: true }],
    criteria: [{ id: `${id}-criterion`, text: 'Funciona', required: true }],
  },
  context:
    destination === 'pinta'
      ? {
          kind: 'pinta',
          assetId: 'star',
          artKind: 'sprite',
          style: 'pixel',
          palette: [],
          appearance: 'brilhante',
          animations: [],
          states: [],
          usage: 'coletável',
          requiresStudioUse: true,
        }
      : {
          kind: 'studio',
          dimension: '2d',
          visualAssetIds: [],
          blockIds: ['collect'],
          blocks: [
            {
              id: 'collect',
              label: 'Ao coletar',
              category: 'Jogo',
              subcategory: 'Eventos',
              area: 'events',
              extension: 'game-2d',
            },
          ],
          mechanicDocumentIds: ['game-2d'],
          extensionIds: ['game-2d'],
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
})

describe('Pensa planejador', () => {
  test('mostra ordem, dependências, próxima tarefa e abre somente a ferramenta de destino', async () => {
    const detail: PensaProjectDetailView = {
      id: 'plan-1',
      name: 'Bosque das Estrelas',
      status: 'active',
      createdAt: '2026-08-04T09:00:00.000Z',
      updatedAt: '2026-08-04T10:30:00.000Z',
      cycles: [cycle],
      currentCycle: cycle,
      artifactsIndex: [],
    }
    const tasks = [task('art-1', 0, 'pinta'), task('code-1', 1, 'studio', ['art-1'])]
    const stage: PensaStageView = {
      stage: 'done',
      conversation: { messages: [], summary: null, messageCount: 0 },
      state: {},
      artifacts: [],
      tasks,
      nextTaskId: 'art-1',
    }
    const request = mock(async (path: string) => {
      if (path === '/projects')
        return {
          projects: [
            {
              id: detail.id,
              name: detail.name,
              status: 'active',
              cycleNumber: 1,
              stage: 'done',
              createdAt: detail.createdAt,
              updatedAt: detail.updatedAt,
            },
          ],
        }
      if (path === '/projects/plan-1') return { project: detail }
      if (path === '/cycles/cycle-1/stages/done') return stage
      throw new Error(`Unexpected request: ${path}`)
    })
    const onOpenTask = mock(() => undefined)
    const adapter: PensaHostAdapter = {
      mode: 'kids',
      capabilities: { pintaOwned: true, studioOwned: false },
      onOpenTask,
      transport: {
        request: request as PensaHostAdapter['transport']['request'],
        streamChat: () => () => {},
      },
    }
    render(<PensaApp adapter={adapter} />)
    await waitFor(() => screen.getByRole('button', { name: /Bosque das Estrelas/ }))
    // Home no padrão do Pinta: título de seção simples, sem o herói antigo.
    // ⚠️ A classe é a única trava possível aqui: em jsdom a folha externa não é
    // computada, então peso/tamanho só se conferem no browser. Mas tirar a
    // classe num refactor é exatamente como o título ficou em 400 antes.
    expect(screen.getByRole('heading', { name: 'Meus projetos' }).className).toContain(
      'pensa-display',
    )
    expect(screen.queryByText('PLANEJADOR DE JOGOS')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Bosque das Estrelas/ }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Meu plano' })).toBeTruthy())
    expect(screen.getByText('PRÓXIMA')).toBeTruthy()
    expect(screen.getByText(/Depois de: Desenhar a estrela/)).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Editar cartão' })).toHaveLength(2)
    expect(
      (screen.getByRole('button', { name: 'Ferramenta não liberada' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: /Abrir no Pinta/ }))
    expect(onOpenTask).toHaveBeenCalledWith({ taskId: 'art-1', destination: 'pinta' })
    expect(document.querySelector('iframe')).toBeNull()
  })

  test('a Bíblia Visual mostra paleta com hex, regras, telas nomeadas e detalhes dos assets', async () => {
    const eCycle = {
      ...cycle,
      stage: 'e' as const,
      eCompletedAt: null,
      rCompletedAt: null,
      oCompletedAt: null,
    }
    const detail: PensaProjectDetailView = {
      id: 'plan-1',
      name: 'Bosque das Estrelas',
      status: 'active',
      createdAt: '2026-08-04T09:00:00.000Z',
      updatedAt: '2026-08-04T10:10:00.000Z',
      cycles: [eCycle],
      currentCycle: eCycle,
      artifactsIndex: [],
    }
    const stage: PensaStageView = {
      stage: 'e',
      conversation: { messages: [], summary: null, messageCount: 0 },
      state: {},
      artifacts: [
        {
          id: 'artifact-design',
          stage: 'e',
          type: 'game_design',
          version: 1,
          status: 'validated',
          createdAt: '2026-08-04T10:05:00.000Z',
          content: {
            coreLoop: ['andar', 'coletar'],
            scenes: [{ id: 'bosque', name: 'Bosque', purpose: 'Coletar estrelas.' }],
            screens: [{ id: 'menu', name: 'Tela de Menu', purpose: 'Começar o jogo.' }],
            camera: 'Lateral fixa.',
          },
        },
        {
          id: 'artifact-visual',
          stage: 'e',
          type: 'visual_direction',
          version: 1,
          status: 'draft',
          createdAt: '2026-08-04T10:08:00.000Z',
          content: {
            style: 'Pixel art simples.',
            camera: 'Lateral.',
            mood: 'Aventura alegre.',
            shapeLanguage: 'Formas arredondadas.',
            palette: [{ role: 'herói', color: '#22c55e' }],
            visualRules: ['Perigos sempre vermelhos'],
            screens: [
              { screenId: 'menu', description: 'Título grande e botão.' },
              { screenId: 'fase-secreta', description: 'Sem nome no game design.' },
            ],
            assets: [
              {
                id: 'hero',
                name: 'Estrela',
                kind: 'sprite',
                appearance: 'Amarela e brilhante.',
                animations: ['girar'],
                states: ['feliz'],
                usage: 'Coletável principal.',
              },
            ],
          },
        },
      ],
      tasks: [],
      nextTaskId: null,
    }
    const request = mock(async (path: string) => {
      if (path === '/projects')
        return {
          projects: [
            {
              id: detail.id,
              name: detail.name,
              status: 'active',
              cycleNumber: 1,
              stage: 'e',
              createdAt: detail.createdAt,
              updatedAt: detail.updatedAt,
            },
          ],
        }
      if (path === '/projects/plan-1') return { project: detail }
      if (path === '/cycles/cycle-1/stages/e') return stage
      throw new Error(`Unexpected request: ${path}`)
    })
    const adapter: PensaHostAdapter = {
      mode: 'kids',
      capabilities: { pintaOwned: true, studioOwned: true },
      onOpenTask: () => undefined,
      transport: {
        request: request as PensaHostAdapter['transport']['request'],
        streamChat: () => () => {},
      },
    }
    render(<PensaApp adapter={adapter} />)
    await waitFor(() => screen.getByRole('button', { name: /Bosque das Estrelas/ }))
    fireEvent.click(screen.getByRole('button', { name: /Bosque das Estrelas/ }))
    await waitFor(() => screen.getByText('Bíblia Visual'))
    // Paleta: papel e hex visíveis como TEXTO (antes o hex vivia só no title).
    expect(screen.getByText('herói')).toBeTruthy()
    expect(screen.getByText('#22C55E')).toBeTruthy()
    // Regras visuais e telas deixaram de ser descartadas na visualização.
    expect(screen.getByText('Perigos sempre vermelhos')).toBeTruthy()
    expect(screen.getByText('Título grande e botão.')).toBeTruthy()
    // O nome vem do game_design; sem correspondência cai no screenId cru.
    expect(screen.getAllByText('Tela de Menu').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('fase-secreta')).toBeTruthy()
    // Asset com tipo, aparência, uso e chips de animação/estado.
    expect(screen.getByText('Estrela')).toBeTruthy()
    expect(screen.getByText('sprite')).toBeTruthy()
    expect(screen.getByText('Amarela e brilhante.')).toBeTruthy()
    expect(screen.getByText('🎬 girar')).toBeTruthy()
    expect(screen.getByText('✨ feliz')).toBeTruthy()
    // O gate de avanço continua no card: aprovar segue disponível no rascunho.
    expect(screen.getByRole('button', { name: 'Está do meu jeito ✓' })).toBeTruthy()
  })

  test('sugestões do Zappy viram chips que preenchem o campo — a linha crua nunca aparece', async () => {
    const zCycle = {
      ...cycle,
      stage: 'z' as const,
      zCompletedAt: null,
      eCompletedAt: null,
      rCompletedAt: null,
      oCompletedAt: null,
    }
    const detail: PensaProjectDetailView = {
      id: 'plan-1',
      name: 'Bosque das Estrelas',
      status: 'active',
      createdAt: '2026-08-04T09:00:00.000Z',
      updatedAt: '2026-08-04T09:05:00.000Z',
      cycles: [zCycle],
      currentCycle: zCycle,
      artifactsIndex: [],
    }
    const stage: PensaStageView = {
      stage: 'z',
      conversation: {
        messages: [
          { role: 'user', content: 'Quero um jogo de estrelas', at: '2026-08-04T09:01:00.000Z' },
          {
            role: 'assistant',
            content:
              'Legal! Qual é o objetivo do jogo?\nSUGESTÕES: pegar todas as estrelas | fugir do robô',
            at: '2026-08-04T09:01:05.000Z',
          },
        ],
        summary: null,
        messageCount: 2,
      },
      state: {},
      artifacts: [],
      tasks: [],
      nextTaskId: null,
    }
    const request = mock(async (path: string) => {
      if (path === '/projects')
        return {
          projects: [
            {
              id: detail.id,
              name: detail.name,
              status: 'active',
              cycleNumber: 1,
              stage: 'z',
              createdAt: detail.createdAt,
              updatedAt: detail.updatedAt,
            },
          ],
        }
      if (path === '/projects/plan-1') return { project: detail }
      if (path === '/cycles/cycle-1/stages/z') return stage
      throw new Error(`Unexpected request: ${path}`)
    })
    const adapter: PensaHostAdapter = {
      mode: 'kids',
      capabilities: { pintaOwned: true, studioOwned: true },
      onOpenTask: () => undefined,
      transport: {
        request: request as PensaHostAdapter['transport']['request'],
        streamChat: () => () => {},
      },
    }
    render(<PensaApp adapter={adapter} />)
    await waitFor(() => screen.getByRole('button', { name: /Bosque das Estrelas/ }))
    fireEvent.click(screen.getByRole('button', { name: /Bosque das Estrelas/ }))
    await waitFor(() => screen.getByRole('group', { name: 'Sugestões do Zappy' }))
    // O corpo da resposta fica na bolha; a linha SUGESTÕES: some do texto.
    expect(screen.getByText(/Qual é o objetivo do jogo\?/)).toBeTruthy()
    expect(screen.queryByText(/SUGESTÕES:/)).toBeNull()
    // Clicar preenche o campo (decisão da usuária: a criança revisa e envia).
    fireEvent.click(screen.getByRole('button', { name: 'fugir do robô' }))
    expect((screen.getByLabelText('Mensagem para o Zappy') as HTMLTextAreaElement).value).toBe(
      'fugir do robô',
    )
  })

  test('rever etapa concluída abre o peek em modo leitura e o voltar restaura o agora', async () => {
    const planningCycle = { ...cycle, stage: 'r' as const, rCompletedAt: null, oCompletedAt: null }
    const detail: PensaProjectDetailView = {
      id: 'plan-1',
      name: 'Bosque das Estrelas',
      status: 'active',
      createdAt: '2026-08-04T09:00:00.000Z',
      updatedAt: '2026-08-04T10:20:00.000Z',
      cycles: [planningCycle],
      currentCycle: planningCycle,
      artifactsIndex: [],
    }
    const rStage: PensaStageView = {
      stage: 'r',
      conversation: { messages: [], summary: null, messageCount: 0 },
      state: {},
      artifacts: [],
      tasks: [task('art-1', 0, 'pinta')],
      nextTaskId: 'art-1',
    }
    const zStage: PensaStageView = {
      stage: 'z',
      conversation: {
        messages: [
          {
            role: 'assistant',
            content: 'Que ideia legal!\nSUGESTÕES: pegar estrelas | fugir do robô',
            at: '2026-08-04T09:01:00.000Z',
          },
        ],
        summary: null,
        messageCount: 1,
      },
      state: {},
      artifacts: [
        {
          id: 'artifact-idea',
          stage: 'z',
          type: 'idea',
          version: 1,
          status: 'validated',
          createdAt: '2026-08-04T09:30:00.000Z',
          content: {
            title: 'Bosque das Estrelas',
            idea: 'Coletar estrelas no bosque encantado.',
            objective: 'Pegar todas as estrelas.',
            controls: ['setas'],
            victory: 'Pegar a última estrela.',
            defeat: 'Encostar no robô três vezes.',
            dimension: '2d',
          },
        },
      ],
      tasks: [],
      nextTaskId: null,
    }
    const request = mock(async (path: string) => {
      if (path === '/projects')
        return {
          projects: [
            {
              id: detail.id,
              name: detail.name,
              status: 'active',
              cycleNumber: 1,
              stage: 'r',
              createdAt: detail.createdAt,
              updatedAt: detail.updatedAt,
            },
          ],
        }
      if (path === '/projects/plan-1') return { project: detail }
      if (path === '/cycles/cycle-1/stages/r') return rStage
      if (path === '/cycles/cycle-1/stages/z') return zStage
      throw new Error(`Unexpected request: ${path}`)
    })
    const adapter: PensaHostAdapter = {
      mode: 'kids',
      capabilities: { pintaOwned: true, studioOwned: true },
      onOpenTask: () => undefined,
      transport: {
        request: request as PensaHostAdapter['transport']['request'],
        streamChat: () => () => {},
      },
    }
    render(<PensaApp adapter={adapter} />)
    await waitFor(() => screen.getByRole('button', { name: /Bosque das Estrelas/ }))
    fireEvent.click(screen.getByRole('button', { name: /Bosque das Estrelas/ }))
    await waitFor(() => screen.getByText('Cartões de Criação'))
    fireEvent.click(
      screen.getByRole('button', { name: 'Rever a etapa Zerar a Bagunça (concluída)' }),
    )
    await waitFor(() => screen.getByText('Você está revendo uma etapa que já foi concluída.'))
    // Conteúdo da etapa vencida em LEITURA: carta + conversa, sem ações.
    await waitFor(() => screen.getByText('Coletar estrelas no bosque encantado.'))
    expect(screen.getByText('Que ideia legal!')).toBeTruthy()
    expect(screen.queryByText(/SUGESTÕES:/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Está do meu jeito ✓' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Voltar para a etapa atual' }))
    await waitFor(() => screen.getByText('Cartões de Criação'))
  })

  test('peek da etapa R mostra o plano sem autoria, mas mantém o abrir na ferramenta', async () => {
    const detail: PensaProjectDetailView = {
      id: 'plan-1',
      name: 'Bosque das Estrelas',
      status: 'active',
      createdAt: '2026-08-04T09:00:00.000Z',
      updatedAt: '2026-08-04T10:30:00.000Z',
      cycles: [cycle],
      currentCycle: cycle,
      artifactsIndex: [],
    }
    const doneStage: PensaStageView = {
      stage: 'done',
      conversation: { messages: [], summary: null, messageCount: 0 },
      state: {},
      artifacts: [],
      tasks: [task('art-1', 0, 'pinta')],
      nextTaskId: 'art-1',
    }
    const rStage: PensaStageView = {
      stage: 'r',
      conversation: { messages: [], summary: null, messageCount: 0 },
      state: {},
      artifacts: [],
      tasks: [task('art-1', 0, 'pinta')],
      nextTaskId: 'art-1',
    }
    const request = mock(async (path: string) => {
      if (path === '/projects')
        return {
          projects: [
            {
              id: detail.id,
              name: detail.name,
              status: 'active',
              cycleNumber: 1,
              stage: 'done',
              createdAt: detail.createdAt,
              updatedAt: detail.updatedAt,
            },
          ],
        }
      if (path === '/projects/plan-1') return { project: detail }
      if (path === '/cycles/cycle-1/stages/done') return doneStage
      if (path === '/cycles/cycle-1/stages/r') return rStage
      throw new Error(`Unexpected request: ${path}`)
    })
    const adapter: PensaHostAdapter = {
      mode: 'kids',
      capabilities: { pintaOwned: true, studioOwned: false },
      onOpenTask: () => undefined,
      transport: {
        request: request as PensaHostAdapter['transport']['request'],
        streamChat: () => () => {},
      },
    }
    render(<PensaApp adapter={adapter} />)
    await waitFor(() => screen.getByRole('button', { name: /Bosque das Estrelas/ }))
    fireEvent.click(screen.getByRole('button', { name: /Bosque das Estrelas/ }))
    await waitFor(() => screen.getByRole('heading', { name: 'Meu plano' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'Rever a etapa Roteirizar a Criação (concluída)' }),
    )
    await waitFor(() => screen.getByText('Você está revendo uma etapa que já foi concluída.'))
    await waitFor(() => screen.getByText('Desenhar a estrela'))
    // editable={false} de verdade: sem autoria, mas o deep link continua.
    expect(screen.queryByRole('button', { name: 'Editar cartão' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Apagar cartão' })).toBeNull()
    expect(screen.getByRole('button', { name: /Abrir no Pinta/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Voltar para o meu plano' }))
    await waitFor(() => screen.getByRole('heading', { name: 'Meu plano' }))
  })

  test('edita um cartão planejado por campos estruturados sem expor JSON ou referências oficiais', async () => {
    const planningCycle = { ...cycle, stage: 'r' as const, rCompletedAt: null, oCompletedAt: null }
    const detail: PensaProjectDetailView = {
      id: 'plan-1',
      name: 'Bosque das Estrelas',
      status: 'active',
      createdAt: '2026-08-04T09:00:00.000Z',
      updatedAt: '2026-08-04T10:20:00.000Z',
      cycles: [planningCycle],
      currentCycle: planningCycle,
      artifactsIndex: [],
    }
    const plannedTask = task('art-1', 0, 'pinta')
    const stage: PensaStageView = {
      stage: 'r',
      conversation: { messages: [], summary: null, messageCount: 0 },
      state: {},
      artifacts: [],
      tasks: [plannedTask],
      nextTaskId: 'art-1',
    }
    let patchBody: Record<string, unknown> | undefined
    const request = mock(
      async (path: string, options: { method?: string; body?: unknown } = {}) => {
        if (path === '/projects')
          return {
            projects: [
              {
                id: detail.id,
                name: detail.name,
                status: 'active',
                cycleNumber: 1,
                stage: 'r',
                createdAt: detail.createdAt,
                updatedAt: detail.updatedAt,
              },
            ],
          }
        if (path === '/projects/plan-1') return { project: detail }
        if (path === '/cycles/cycle-1/stages/r') return stage
        if (path === '/tasks/art-1' && options.method === 'PATCH') {
          patchBody = options.body as Record<string, unknown>
          return { task: plannedTask }
        }
        throw new Error(`Unexpected request: ${path}`)
      },
    )
    const adapter: PensaHostAdapter = {
      mode: 'kids',
      capabilities: { pintaOwned: true, studioOwned: true },
      onOpenTask: () => undefined,
      transport: {
        request: request as PensaHostAdapter['transport']['request'],
        streamChat: () => () => {},
      },
    }
    render(<PensaApp adapter={adapter} />)
    await waitFor(() => screen.getByRole('button', { name: /Bosque das Estrelas/ }))
    fireEvent.click(screen.getByRole('button', { name: /Bosque das Estrelas/ }))
    await waitFor(() => screen.getByRole('button', { name: 'Editar cartão' }))
    fireEvent.click(screen.getByRole('button', { name: 'Editar cartão' }))
    expect(screen.queryByLabelText('Definição completa do cartão')).toBeNull()
    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Desenhar estrela guia' },
    })
    fireEvent.change(screen.getByLabelText('Passos do guia: item 1'), {
      target: { value: 'Desenhar e salvar' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(patchBody?.title).toBe('Desenhar estrela guia'))
    expect((patchBody?.guide as PensaTaskView['guide']).steps[0]?.text).toBe('Desenhar e salvar')
    expect(patchBody).not.toHaveProperty('context')
    expect(patchBody).not.toHaveProperty('destination')
  })
})

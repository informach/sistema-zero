import { describe, expect, it } from 'bun:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getCopy } from '../../core/copy'
import type { PensaBuildEnv, PensaTaskView } from '../../core/types'
import { createProjectStore } from '../../state/projectStore'
import {
  createFakeTransport,
  type FakeStudioAdapter,
  makeCycle,
  makeDetail,
  makeGamification,
  makeMissionPlanArtifact,
  makeStageView,
  makeStudioAdapter,
  makeTask,
  makeTasks,
} from '../../testing/fakeTransport'
import { PensaAppProvider } from '../appContext'
import { StageRView } from './StageRView'

const STAGE_PATH = '/cycles/cycle-1/stages/r'
const GENERATE_PATH = '/cycles/cycle-1/artifacts/generate'
const ADVANCE_PATH = '/cycles/cycle-1/advance'

async function renderStage(
  adapter: FakeStudioAdapter,
  options: {
    studioProjectId?: string | null
    /** Default do makeDetail = 'embedded' (comportamento clássico). */
    buildEnv?: PensaBuildEnv | null
    onBack?: () => void
    onAdvanced?: () => void
  } = {},
) {
  const projectStore = createProjectStore(adapter.transport)
  projectStore.setState({
    activeProjectId: 'proj-1',
    detail: makeDetail({
      currentCycle: makeCycle({ stage: 'r' }),
      studioProjectId: options.studioProjectId ?? null,
      ...(options.buildEnv !== undefined ? { buildEnv: options.buildEnv } : {}),
    }),
  })
  render(
    <PensaAppProvider value={{ adapter, copy: getCopy('kids'), store: projectStore }}>
      <StageRView
        onBack={options.onBack ?? (() => {})}
        onAdvanced={options.onAdvanced ?? (() => {})}
      />
    </PensaAppProvider>,
  )
  // Drena (dentro de act) o loadStage disparado pelo effect de montagem.
  await act(async () => {})
  return { projectStore }
}

function respondWith(
  tasks: PensaTaskView[],
  extra: (path: string, init?: { method?: string; body?: unknown }) => unknown = () => {
    throw new Error('rota inesperada')
  },
) {
  return (path: string, init?: { method?: string; body?: unknown }) => {
    if (path === STAGE_PATH) return makeStageView({ stage: 'r' })
    if (path === GENERATE_PATH && init?.method === 'POST') return { tasks }
    return extra(path, init)
  }
}

/** Gera as missões pelo hero (caminho de UI) e espera o quadro abrir. */
async function generateBoard(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: /Criar as missões/ }))
  await waitFor(() => {
    expect(screen.getByText('Missões')).toBeTruthy()
  })
}

describe('StageRView', () => {
  it('sem plano: hero "Criar as missões"; gerar abre o quadro', async () => {
    const transport = createFakeTransport(respondWith(makeTasks()))
    await renderStage(makeStudioAdapter(transport))

    expect(screen.getByText('Bora construir de verdade?')).toBeTruthy()
    expect(screen.getByText('Rodar as Missões')).toBeTruthy()

    await generateBoard()

    const generate = transport.calls.find((call) => call.path === GENERATE_PATH)
    expect(generate?.body).toEqual({ type: 'mission_plan', projectId: 'proj-1' })
    expect(screen.getByText('Fazer o Dino pular')).toBeTruthy()
  })

  it('reload com plano salvo: "Recriar as missões" + aviso de que o quadro recomeça', async () => {
    const transport = createFakeTransport((path, init) => {
      if (path === STAGE_PATH) {
        return makeStageView({ stage: 'r', artifacts: [makeMissionPlanArtifact()] })
      }
      if (path === GENERATE_PATH && init?.method === 'POST') return { tasks: makeTasks() }
      throw new Error(`rota inesperada: ${path}`)
    })
    await renderStage(makeStudioAdapter(transport))

    expect(screen.getByText('Suas missões estão guardadas!')).toBeTruthy()
    expect(
      screen.getByText(
        'Para abrir o quadro de novo, o Zappy recria as missões do zero. O progresso do quadro recomeça, tá bem?',
      ),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Recriar as missões' }))
    await waitFor(() => {
      expect(screen.getByText('Missões')).toBeTruthy()
    })
  })

  it('todas prontas: CTA avança r→o com toast de XP (aria-live) antes do onAdvanced', async () => {
    const doneTasks = [
      makeTask({ column: 'done' }),
      makeTask({ id: 'task-2', title: 'Chuva de meteoros', column: 'done', position: 1 }),
    ]
    const transport = createFakeTransport(
      respondWith(doneTasks, (path, init) => {
        if (path === ADVANCE_PATH && init?.method === 'POST') {
          return {
            cycle: makeCycle({ stage: 'o' }),
            gamification: makeGamification({ xpAwarded: 15 }),
          }
        }
        throw new Error(`rota inesperada: ${path}`)
      }),
    )
    let advanced = 0
    await renderStage(makeStudioAdapter(transport), {
      onAdvanced: () => {
        advanced += 1
      },
    })
    await generateBoard()

    fireEvent.click(screen.getByRole('button', { name: 'Missões prontas! Hora do lançamento' }))

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeTruthy()
    })
    expect(screen.getByRole('status').textContent).toContain('+15 XP')
    const advance = transport.calls.find((call) => call.path === ADVANCE_PATH)
    expect(advance?.body).toEqual({ from: 'r' })
    // O toast fica um instante na tela e então volta ao mapa.
    expect(advanced).toBe(0)
    await waitFor(
      () => {
        expect(advanced).toBe(1)
      },
      { timeout: 3000 },
    )
  })

  it('missão aberta SEM renderStudio: painel normal; "Consegui!" exige os checks', async () => {
    const transport = createFakeTransport(
      respondWith(makeTasks(), (path, init) => {
        if (path === '/tasks/task-1' && init?.method === 'PATCH') {
          return { task: makeTask({ column: 'done', position: 0 }) }
        }
        throw new Error(`rota inesperada: ${path}`)
      }),
    )
    // Sem renderStudio/createStudioProject: degrade para painel + Abrir o Estúdio.
    const adapter = makeStudioAdapter(transport, { withRender: false, withCreate: false })
    await renderStage(adapter)
    await generateBoard()

    fireEvent.click(screen.getByRole('button', { name: 'Ver a missão: Fazer o Dino pular' }))

    // Painel normal (sem split): nada de estúdio embarcado.
    expect(screen.queryByTestId('studio-embed')).toBeNull()
    expect(screen.getByText('Ficou pronto quando...')).toBeTruthy()
    expect(screen.getByText('Passo a passo')).toBeTruthy()
    expect(screen.getByText('Blocos que ajudam')).toBeTruthy()

    // "Consegui!" só habilita com TODOS os checks.
    const finish = screen.getByRole('button', { name: /Consegui!/ }) as HTMLButtonElement
    expect(finish.disabled).toBe(true)
    for (const checkbox of screen.getAllByRole('checkbox')) {
      fireEvent.click(checkbox)
    }
    expect((screen.getByRole('button', { name: /Consegui!/ }) as HTMLButtonElement).disabled).toBe(
      false,
    )

    // "Abrir o Estúdio" usa o onOpenStudio do host com o seed do projeto.
    fireEvent.click(screen.getByRole('button', { name: /Abrir o Estúdio/ }))
    expect(adapter.openStudioCalls).toEqual([
      { pensaProjectId: 'proj-1', studioProjectId: null, name: 'Aventura do Dino' },
    ])

    // Concluir move o card para Prontas e volta ao quadro.
    fireEvent.click(screen.getByRole('button', { name: /Consegui!/ }))
    await waitFor(() => {
      expect(screen.getByText('Missões')).toBeTruthy()
    })
    const patch = transport.calls.find((call) => call.method === 'PATCH')
    expect(patch?.path).toBe('/tasks/task-1')
    expect(patch?.body).toEqual({ column: 'done', position: 0 })
  })

  it('Modo Missão (split): com renderStudio + projeto semeado, o Estúdio abre ao lado', async () => {
    const transport = createFakeTransport(respondWith(makeTasks()))
    const adapter = makeStudioAdapter(transport, { studioProjectId: 'studio-7' })
    await renderStage(adapter, { studioProjectId: 'studio-7' })
    await generateBoard()

    fireEvent.click(screen.getByRole('button', { name: 'Ver a missão: Fazer o Dino pular' }))

    // Overlay split: estúdio embarcado + gaveta da missão + voltar.
    expect(screen.getByTestId('studio-embed').textContent).toBe('estúdio:studio-7')
    // renderStudio recebe os DOIS args (studioProjectId + pensaProjectId).
    expect(screen.getByTestId('studio-embed').getAttribute('data-studio-project')).toBe('studio-7')
    expect(screen.getByTestId('studio-embed').getAttribute('data-pensa-project')).toBe('proj-1')
    expect(screen.getByText('Ficou pronto quando...')).toBeTruthy()
    // Já semeado: não cria projeto novo no Estúdio.
    expect(adapter.createdStudioNames).toHaveLength(0)

    // A gaveta colapsa e volta.
    fireEvent.click(screen.getByRole('button', { name: 'Esconder a missão' }))
    expect(screen.queryByText('Ficou pronto quando...')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar a missão' }))
    expect(screen.getByText('Ficou pronto quando...')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Voltar às missões' }))
    expect(screen.queryByTestId('studio-embed')).toBeNull()
    expect(screen.getByText('Missões')).toBeTruthy()
  })

  it('semeadura LAZY na 1ª abertura: cria no Estúdio, PATCHa o projeto e liga o split', async () => {
    const transport = createFakeTransport(
      respondWith(makeTasks(), (path, init) => {
        if (path === '/projects/proj-1' && init?.method === 'PATCH') {
          return { project: makeDetail({ studioProjectId: 'studio-1' }) }
        }
        throw new Error(`rota inesperada: ${path}`)
      }),
    )
    const adapter = makeStudioAdapter(transport)
    await renderStage(adapter, { studioProjectId: null })
    await generateBoard()

    fireEvent.click(screen.getByRole('button', { name: 'Ver a missão: Fazer o Dino pular' }))

    // Enquanto semeia, painel normal; quando o detail absorve o id, split.
    await waitFor(() => {
      expect(screen.getByTestId('studio-embed').textContent).toBe('estúdio:studio-1')
    })
    expect(adapter.createdStudioNames).toEqual(['Aventura do Dino'])
    const patch = transport.calls.find((call) => call.method === 'PATCH')
    expect(patch?.path).toBe('/projects/proj-1')
    expect(patch?.body).toEqual({ studioProjectId: 'studio-1' })
  })
})

describe('StageRView: onde construir (buildEnv)', () => {
  it('buildEnv null: chooser aparece ANTES do hero; escolher PATCHa e segue o fluxo', async () => {
    const transport = createFakeTransport(
      respondWith(makeTasks(), (path, init) => {
        if (path === '/projects/proj-1' && init?.method === 'PATCH') {
          return {
            project: makeDetail({
              currentCycle: makeCycle({ stage: 'r' }),
              buildEnv: 'embedded',
            }),
          }
        }
        throw new Error(`rota inesperada: ${path}`)
      }),
    )
    await renderStage(makeStudioAdapter(transport), { buildEnv: null })

    // Chooser primeiro: nada do hero de criar missões ainda.
    expect(screen.getByText('Onde você vai construir?')).toBeTruthy()
    expect(screen.queryByText('Bora construir de verdade?')).toBeNull()
    expect(screen.getByText('Recomendado')).toBeTruthy()
    // Primeira escolha: sem "Deixa como está" (não tem para onde voltar).
    expect(screen.queryByRole('button', { name: 'Deixa como está' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Aqui, junto da missão/ }))
    // Drena (dentro de act) o PATCH + absorb do detalhe (tudo microtask).
    await act(async () => {})

    expect(screen.queryByText('Onde você vai construir?')).toBeNull()
    const patch = transport.calls.find((call) => call.method === 'PATCH')
    expect(patch?.path).toBe('/projects/proj-1')
    expect(patch?.body).toEqual({ buildEnv: 'embedded' })
    // O fluxo segue: hero de criar missões + chip discreto da escolha.
    expect(screen.getByText('Bora construir de verdade?')).toBeTruthy()
    expect(screen.getByText('Construindo aqui')).toBeTruthy()
  })

  it('"Trocar" reabre o chooser sem perder o quadro; "Deixa como está" mantém tudo', async () => {
    const transport = createFakeTransport(
      respondWith(makeTasks(), (path, init) => {
        if (path === '/projects/proj-1' && init?.method === 'PATCH') {
          return {
            project: makeDetail({ currentCycle: makeCycle({ stage: 'r' }), buildEnv: 'studio' }),
          }
        }
        throw new Error(`rota inesperada: ${path}`)
      }),
    )
    await renderStage(makeStudioAdapter(transport), { buildEnv: 'embedded' })
    await generateBoard()

    // Reabre e desiste: nada muda, nenhum PATCH.
    fireEvent.click(screen.getByRole('button', { name: 'Trocar' }))
    expect(screen.getByText('Onde você vai construir?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Deixa como está' }))
    expect(screen.queryByText('Onde você vai construir?')).toBeNull()
    expect(screen.getByText('Construindo aqui')).toBeTruthy()
    expect(transport.calls.filter((call) => call.method === 'PATCH')).toHaveLength(0)

    // Reabre e troca para o Estúdio Completo: PATCH + quadro preservado.
    fireEvent.click(screen.getByRole('button', { name: 'Trocar' }))
    fireEvent.click(screen.getByRole('button', { name: /No Estúdio Completo/ }))
    await act(async () => {})

    expect(screen.getByText('Construindo no Estúdio')).toBeTruthy()
    const patch = transport.calls.find((call) => call.method === 'PATCH')
    expect(patch?.body).toEqual({ buildEnv: 'studio' })
    // O quadro vivo continua lá (trocar não perde nada).
    expect(screen.getByText('Fazer o Dino pular')).toBeTruthy()
  })

  it('env studio: semeia igual, mas a missão abre SEMPRE como painel com "Abrir o Estúdio" em destaque', async () => {
    const transport = createFakeTransport(
      respondWith(makeTasks(), (path, init) => {
        if (path === '/projects/proj-1' && init?.method === 'PATCH') {
          return {
            project: makeDetail({
              currentCycle: makeCycle({ stage: 'r' }),
              studioProjectId: 'studio-1',
              buildEnv: 'studio',
            }),
          }
        }
        throw new Error(`rota inesperada: ${path}`)
      }),
    )
    const adapter = makeStudioAdapter(transport)
    await renderStage(adapter, { buildEnv: 'studio' })
    await generateBoard()

    fireEvent.click(screen.getByRole('button', { name: 'Ver a missão: Fazer o Dino pular' }))
    // Drena (dentro de act) a semeadura + PATCH + absorb do detalhe.
    await act(async () => {})

    // A semeadura roda igual (createStudioProject + PATCH studioProjectId).
    expect(adapter.createdStudioNames).toEqual(['Aventura do Dino'])
    const seedPatch = transport.calls.find(
      (call) => call.method === 'PATCH' && call.path === '/projects/proj-1',
    )
    expect(seedPatch?.body).toEqual({ studioProjectId: 'studio-1' })

    // Mesmo semeado + renderStudio disponível: NUNCA split, sempre painel.
    expect(screen.queryByTestId('studio-embed')).toBeNull()
    expect(screen.getByText('Ficou pronto quando...')).toBeTruthy()

    // "Abrir o Estúdio" em destaque leva ao Estúdio Completo via onOpenStudio.
    fireEvent.click(screen.getByRole('button', { name: /Abrir o Estúdio/ }))
    expect(adapter.openStudioCalls).toHaveLength(1)
    expect(adapter.openStudioCalls[0]?.pensaProjectId).toBe('proj-1')
  })

  it('env external: SEM semeadura, sem "Abrir o Estúdio"; entra a orientação gentil', async () => {
    const transport = createFakeTransport(respondWith(makeTasks()))
    const adapter = makeStudioAdapter(transport)
    await renderStage(adapter, { buildEnv: 'external' })
    await generateBoard()

    fireEvent.click(screen.getByRole('button', { name: 'Ver a missão: Fazer o Dino pular' }))
    await act(async () => {})

    // Nada de Estúdio: sem semeadura (createStudioProject NÃO chamado), sem
    // PATCH de studioProjectId, sem split e sem botão "Abrir o Estúdio".
    expect(adapter.createdStudioNames).toHaveLength(0)
    expect(transport.calls.filter((call) => call.method === 'PATCH')).toHaveLength(0)
    expect(screen.queryByTestId('studio-embed')).toBeNull()
    expect(screen.queryByRole('button', { name: /Abrir o Estúdio/ })).toBeNull()

    // No lugar, a linha gentil de orientação.
    expect(screen.getByText(/Siga os passos no seu computador e volte pra marcar/)).toBeTruthy()
    expect(screen.getByText('Passo a passo')).toBeTruthy()
  })
})

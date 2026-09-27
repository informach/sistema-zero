import { afterEach, describe, expect, mock, test } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type {
  PensaCycleView,
  PensaHostAdapter,
  PensaProjectDetailView,
  PensaProjectMembersView,
  PensaProjectRole,
  PensaStageView,
  PensaTeamPersonView,
} from '../core/types'
import { PensaApp } from './PensaApp'

afterEach(cleanup)

/**
 * A EQUIPE do plano (26/09/2026): o "Equipe · N" do cabeçalho abre a janela; o dono cria, copia,
 * gira e desliga o código e tira gente em dois passos; o membro vê "Este plano é de X", não tem o
 * lápis de renomear e sai da equipe em dois passos; Esc fecha e o foco volta ao botão; erro do
 * servidor fica na janela; e, com equipe, o compasso avisa "alguém mexeu no plano".
 *
 * Full review (26/09/2026): mexer na equipe grava o `updatedAt` no members, então o harness faz
 * o mesmo (`touch` no share e no tirar) para provar que o compasso NÃO acusa a própria criança;
 * o foco dos dois passos; a corrida da lista ao reabrir; e o "Atualizar" com coisa sem guardar.
 */
const cycle: PensaCycleView = {
  id: 'cycle-1',
  number: 1,
  goal: null,
  stage: 'z',
  zCompletedAt: null,
  eCompletedAt: null,
  rCompletedAt: null,
  oCompletedAt: null,
}

const EU: PensaTeamPersonView = {
  profileId: 'perfil-eu',
  firstName: 'Helena',
  photoUrl: null,
  joinedAt: null,
}
const BIA: PensaTeamPersonView = {
  profileId: 'perfil-bia',
  firstName: 'Bia',
  photoUrl: 'https://cdn.test/bia.webp',
  joinedAt: '2026-09-20T10:00:00.000Z',
}
const JOAO_1: PensaTeamPersonView = {
  profileId: 'perfil-joao-1',
  firstName: 'João',
  photoUrl: null,
  joinedAt: '2026-09-21T10:00:00.000Z',
}
const JOAO_2: PensaTeamPersonView = {
  profileId: 'perfil-joao-2',
  firstName: 'João',
  photoUrl: null,
  joinedAt: '2026-09-22T10:00:00.000Z',
}

const stageZ: PensaStageView = {
  stage: 'z',
  conversation: { messages: [], summary: null, messageCount: 0 },
  state: {},
  artifacts: [],
  tasks: [],
  nextTaskId: null,
}
/** A etapa Z com a Carta da Ideia em rascunho: dá o "Editar" e o "Está do meu jeito ✓". */
const stageZComIdeia: PensaStageView = {
  ...stageZ,
  artifacts: [
    {
      id: 'idea-1',
      stage: 'z',
      type: 'idea',
      version: 1,
      status: 'draft',
      content: { title: 'Runo', idea: 'Um gato que pula', objective: 'Chegar ao topo' },
      createdAt: '2026-08-04T10:00:00.000Z',
    },
  ],
}

function harness(options: {
  role: PensaProjectRole
  members?: PensaTeamPersonView[]
  shareCode?: string | null
  stage?: PensaStageView
  fail?: Partial<Record<'share' | 'remove' | 'leave' | 'members', string>>
  /** Pedidos ("METHOD path") que ficam PRESOS até o teste soltar com `release`. */
  defer?: string[]
}) {
  let members = [...(options.members ?? [])]
  let shareCode = options.shareCode ?? null
  let stamp = 0
  let updatedAt = '2026-08-04T10:30:00.000Z'
  // Como o members: qualquer mexida no projeto (equipe inclusive) grava o `updatedAt`.
  const touch = () => {
    stamp += 1
    updatedAt = `2026-08-04T11:00:${String(stamp).padStart(2, '0')}.000Z`
  }
  let codes = 0
  const calls: string[] = []
  const gates = new Map<string, Array<(override?: unknown) => void>>()
  const gate = (key: string): Promise<unknown> => {
    if (!options.defer?.includes(key)) return Promise.resolve(undefined)
    return new Promise((resolve) => {
      const list = gates.get(key) ?? []
      list.push(resolve)
      gates.set(key, list)
    })
  }
  /** Solta o pedido preso mais antigo desta chave; `override` troca a resposta por outra. */
  const release = (key: string, override?: unknown) => {
    const next = gates.get(key)?.shift()
    if (!next) throw new Error(`nenhum pedido preso para ${key}`)
    next(override)
  }
  const detail = (): PensaProjectDetailView => ({
    id: 'plan-1',
    name: 'Runo',
    status: 'active',
    createdAt: '2026-08-04T09:00:00.000Z',
    updatedAt,
    cycles: [cycle],
    currentCycle: cycle,
    artifactsIndex: [],
    role: options.role,
    team: { memberCount: members.length, shareEnabled: shareCode !== null },
  })
  const request = mock(async (path: string, init?: { method?: string; body?: unknown }) => {
    const method = init?.method ?? 'GET'
    const key = `${method} ${path}`
    calls.push(key)
    const override = await gate(key)
    if (override !== undefined) return override
    if (method === 'GET' && path === '/projects/plan-1') return { project: detail() }
    if (method === 'GET' && path === '/projects') return { projects: [] }
    if (method === 'GET' && path === '/cycles/cycle-1/stages/z') return options.stage ?? stageZ
    if (method === 'POST' && path === '/cycles/cycle-1/artifacts/idea/validate') {
      touch()
      return { ok: true }
    }
    if (method === 'GET' && path === '/projects/plan-1/members') {
      if (options.fail?.members) throw new Error(options.fail.members)
      const view: PensaProjectMembersView = {
        role: options.role,
        viewerProfileId: options.role === 'owner' ? EU.profileId : 'perfil-eu-membro',
        shareCode: options.role === 'owner' ? shareCode : null,
        maxMembers: 5,
        owner: options.role === 'owner' ? EU : BIA,
        members,
      }
      return view
    }
    if (path === '/projects/plan-1/share' && method === 'POST') {
      if (options.fail?.share) throw new Error(options.fail.share)
      codes += 1
      shareCode = `AAAAA${String.fromCharCode(65 + codes)}`
      touch()
      return { code: shareCode, display: `ZAP-${shareCode}` }
    }
    if (path === '/projects/plan-1/share' && method === 'DELETE') {
      shareCode = null
      touch()
      return { ok: true }
    }
    if (method === 'DELETE' && path === '/projects/plan-1/members/me') {
      if (options.fail?.leave) throw new Error(options.fail.leave)
      return { ok: true }
    }
    const member = /^\/projects\/plan-1\/members\/(.+)$/.exec(path)
    if (method === 'DELETE' && member) {
      if (options.fail?.remove) throw new Error(options.fail.remove)
      members = members.filter((person) => person.profileId !== member[1])
      touch()
      return { ok: true }
    }
    throw new Error(`Unexpected request: ${method} ${path}`)
  })
  const adapter: PensaHostAdapter = {
    mode: 'kids',
    capabilities: { pintaOwned: true, studioOwned: true, moldaOwned: true },
    onOpenTask: () => undefined,
    transport: {
      request: request as PensaHostAdapter['transport']['request'],
      streamChat: () => () => {},
    },
  }
  return { adapter, calls, touch, release }
}

async function openPlan(adapter: PensaHostAdapter, teamPollMs?: number) {
  render(<PensaApp adapter={adapter} initialProjectId="plan-1" teamPollMs={teamPollMs} />)
  await waitFor(() => screen.getByRole('heading', { name: 'Runo', level: 1 }))
}

// O nome acessível é "Equipe, N na equipe": o "·" é desenho (o leitor falaria "ponto médio").
async function openTeam() {
  const button = screen.getByRole('button', { name: /^Equipe, \d+ na equipe$/ })
  fireEvent.click(button)
  const dialog = await screen.findByRole('dialog', { name: 'Equipe do plano' })
  return { button, dialog }
}

/** Três tiques do compasso (o teste injeta `teamPollMs` curto). */
const tiques = (teamPollMs: number, n = 3) =>
  act(() => new Promise((resolve) => setTimeout(resolve, teamPollMs * n + 10)))

const AVISO = 'Alguém da equipe mexeu no plano.'
const pollCalls = (calls: string[]) =>
  calls.filter((call) => call === 'GET /projects/plan-1').length

describe('a equipe do plano', () => {
  test('o dono: "Equipe · 1" abre a janela com a lista, e o "Criar um código" gera o ZAP-', async () => {
    const { adapter } = harness({ role: 'owner', members: [BIA] })
    await openPlan(adapter)
    // O que se VÊ é "Equipe · 1"; o que se OUVE é "Equipe, 1 na equipe" (o "·" fica fora do nome).
    const equipe = screen.getByRole('button', { name: 'Equipe, 1 na equipe' })
    expect(equipe.querySelector('[aria-hidden="true"]:not(svg)')?.textContent).toBe('Equipe · 1')
    const { dialog } = await openTeam()
    const janela = within(dialog)
    await waitFor(() => janela.getByText('1 de 5 lugares'))
    // O dono ("você", "dono do plano") e a Bia, com o rosto e o "Tirar".
    expect(janela.getByText('Helena')).toBeTruthy()
    expect(janela.getByText('você')).toBeTruthy()
    expect(janela.getByText('dono do plano')).toBeTruthy()
    expect(janela.getByText('Bia')).toBeTruthy()
    expect(janela.getByRole('button', { name: 'Tirar Bia da equipe' })).toBeTruthy()
    // Sem código ainda: o convite e o botão de criar.
    expect(janela.getByText(/Ninguém entra sem um código/)).toBeTruthy()
    fireEvent.click(janela.getByRole('button', { name: 'Criar um código' }))
    // O nome vem do h3 (`aria-labelledby`), não de um `aria-label` que o repetia.
    const code = await janela.findByRole('status', { name: 'Código do plano' })
    expect(code.textContent).toBe('ZAP-AAAAAB')
    expect(code.getAttribute('aria-label')).toBeNull()
    expect(code.getAttribute('aria-labelledby')).toBe(
      janela.getByRole('heading', { name: 'Código do plano', level: 3 }).id,
    )
    expect(janela.getByRole('button', { name: 'Gerar outro código' })).toBeTruthy()
    expect(janela.getByRole('button', { name: 'Desligar o código' })).toBeTruthy()
    // Gerar outro: o código muda (o antigo deixa de valer no servidor).
    fireEvent.click(janela.getByRole('button', { name: 'Gerar outro código' }))
    await waitFor(() =>
      expect(janela.getByRole('status', { name: 'Código do plano' }).textContent).toBe(
        'ZAP-AAAAAC',
      ),
    )
    // Desligar: volta ao convite.
    fireEvent.click(janela.getByRole('button', { name: 'Desligar o código' }))
    await waitFor(() => janela.getByRole('button', { name: 'Criar um código' }))
    expect(janela.queryByRole('status', { name: 'Código do plano' })).toBeNull()
  })

  test('copiar: sem área de transferência o recado é honesto; com ela, "Código copiado!"', async () => {
    const { adapter } = harness({ role: 'owner', shareCode: 'AAAAAB' })
    await openPlan(adapter)
    const { dialog } = await openTeam()
    const janela = within(dialog)
    await janela.findByRole('status', { name: 'Código do plano' })
    const nav = navigator as Navigator & { clipboard?: { writeText(text: string): Promise<void> } }
    const original = Object.getOwnPropertyDescriptor(nav, 'clipboard')
    Object.defineProperty(nav, 'clipboard', { value: undefined, configurable: true })
    try {
      fireEvent.click(janela.getByRole('button', { name: 'Copiar' }))
      await waitFor(() => janela.getByText(/Não deu para copiar/))
      const written: string[] = []
      Object.defineProperty(nav, 'clipboard', {
        value: {
          writeText: async (text: string) => {
            written.push(text)
          },
        },
        configurable: true,
      })
      fireEvent.click(janela.getByRole('button', { name: 'Copiar' }))
      await waitFor(() => janela.getByText('Código copiado!'))
      expect(written).toEqual(['ZAP-AAAAAB'])
    } finally {
      if (original) Object.defineProperty(nav, 'clipboard', original)
      else Reflect.deleteProperty(nav, 'clipboard')
    }
  })

  test('tirar alguém pede confirmação na linha; "Deixar" desiste e "Tirar mesmo" tira (o contador do cabeçalho acompanha)', async () => {
    const { adapter, calls } = harness({ role: 'owner', members: [BIA] })
    await openPlan(adapter)
    const { dialog } = await openTeam()
    const janela = within(dialog)
    await janela.findByText('1 de 5 lugares')
    fireEvent.click(janela.getByRole('button', { name: 'Tirar Bia da equipe' }))
    expect(janela.getByText('Tirar Bia da equipe?')).toBeTruthy()
    fireEvent.click(janela.getByRole('button', { name: 'Deixar' }))
    expect(janela.queryByText('Tirar Bia da equipe?')).toBeNull()
    expect(calls.some((call) => call.startsWith('DELETE'))).toBe(false)
    fireEvent.click(janela.getByRole('button', { name: 'Tirar Bia da equipe' }))
    fireEvent.click(janela.getByRole('button', { name: 'Tirar mesmo' }))
    await waitFor(() => janela.getByText('Ainda não entrou ninguém.'))
    expect(calls).toContain('DELETE /projects/plan-1/members/perfil-bia')
    expect(janela.queryByText('Bia')).toBeNull()
    expect(screen.getByRole('button', { name: 'Equipe, 0 na equipe' })).toBeTruthy()
  })

  test('o foco dos dois passos do "Tirar": armar foca o "Tirar mesmo", "Deixar" devolve ao "Tirar", tirar pousa no contador', async () => {
    const { adapter } = harness({ role: 'owner', members: [BIA, JOAO_1] })
    await openPlan(adapter)
    const { dialog } = await openTeam()
    const janela = within(dialog)
    await janela.findByText('2 de 5 lugares')
    // Enter no "Tirar" (o botão DESMONTA): o foco vai para o "Tirar mesmo", não para o body.
    fireEvent.click(janela.getByRole('button', { name: 'Tirar Bia da equipe' }))
    await waitFor(() =>
      expect(document.activeElement).toBe(janela.getByRole('button', { name: 'Tirar mesmo' })),
    )
    // "Deixar": de volta ao "Tirar" da linha (um botão NOVO, com o mesmo nome).
    fireEvent.click(janela.getByRole('button', { name: 'Deixar' }))
    await waitFor(() =>
      expect(document.activeElement).toBe(
        janela.getByRole('button', { name: 'Tirar Bia da equipe' }),
      ),
    )
    // "Tirar mesmo": a linha some, e o foco pousa no contador de lugares.
    fireEvent.click(janela.getByRole('button', { name: 'Tirar Bia da equipe' }))
    fireEvent.click(janela.getByRole('button', { name: 'Tirar mesmo' }))
    await janela.findByText('1 de 5 lugares')
    await waitFor(() => expect(document.activeElement).toBe(janela.getByText('1 de 5 lugares')))
    expect(document.activeElement).not.toBe(document.body)
  })

  test('dois colegas com o mesmo nome: o "Tirar" diz qual pela posição na lista', async () => {
    const { adapter, calls } = harness({ role: 'owner', members: [BIA, JOAO_1, JOAO_2] })
    await openPlan(adapter)
    const { dialog } = await openTeam()
    const janela = within(dialog)
    await janela.findByText('3 de 5 lugares')
    expect(janela.getByRole('button', { name: 'Tirar Bia da equipe' })).toBeTruthy()
    expect(janela.getByRole('button', { name: 'Tirar João (2º da lista) da equipe' })).toBeTruthy()
    fireEvent.click(janela.getByRole('button', { name: 'Tirar João (3º da lista) da equipe' }))
    fireEvent.click(janela.getByRole('button', { name: 'Tirar mesmo' }))
    await waitFor(() => expect(calls).toContain('DELETE /projects/plan-1/members/perfil-joao-2'))
    // Sobrou um João: o nome volta a ser só o nome.
    await janela.findByRole('button', { name: 'Tirar João da equipe' })
  })

  test('quem entrou pelo código: sem o lápis, "Este plano é de Bia", sem a parte do código, e "Sair da equipe" leva à home com o foco no título', async () => {
    const { adapter, calls } = harness({
      role: 'member',
      members: [
        { ...EU, profileId: 'perfil-eu-membro', joinedAt: '2026-09-21T10:00:00.000Z' },
        JOAO_1,
      ],
    })
    await openPlan(adapter)
    expect(screen.queryByRole('button', { name: /^Renomear o plano/ })).toBeNull()
    const { dialog } = await openTeam()
    const janela = within(dialog)
    // "Vocês" e não "vocês dois": aqui somos três.
    await janela.findByText(/Este plano é de Bia\. Vocês mexem no mesmo plano\./)
    expect(janela.queryByText(/Vocês dois/)).toBeNull()
    expect(janela.queryByText(/Ninguém entra sem um código/)).toBeNull()
    expect(janela.queryByRole('button', { name: 'Criar um código' })).toBeNull()
    expect(janela.queryByRole('button', { name: /^Tirar/ })).toBeNull()
    // Os dois passos do "Sair": armar foca o "Sair mesmo"; "Ficar" devolve ao "Sair da equipe".
    fireEvent.click(janela.getByRole('button', { name: 'Sair da equipe' }))
    expect(janela.getByText(/Você perde o acesso a este plano/)).toBeTruthy()
    await waitFor(() =>
      expect(document.activeElement).toBe(janela.getByRole('button', { name: 'Sair mesmo' })),
    )
    fireEvent.click(janela.getByRole('button', { name: 'Ficar' }))
    expect(janela.queryByText(/Você perde o acesso/)).toBeNull()
    await waitFor(() =>
      expect(document.activeElement).toBe(janela.getByRole('button', { name: 'Sair da equipe' })),
    )
    fireEvent.click(janela.getByRole('button', { name: 'Sair da equipe' }))
    fireEvent.click(janela.getByRole('button', { name: 'Sair mesmo' }))
    const titulo = await screen.findByRole('heading', { name: 'Meus projetos' })
    expect(calls).toContain('DELETE /projects/plan-1/members/me')
    // Não sobrou ninguém para o foco voltar (o "Equipe" e a janela se foram): a home nasce com
    // o foco no título, não no body.
    await waitFor(() => expect(document.activeElement).toBe(titulo))
  })

  test('Esc fecha a janela e o foco volta ao "Equipe"; erro do servidor fica NA janela', async () => {
    const { adapter } = harness({
      role: 'owner',
      fail: { share: 'Só quem criou o plano pode fazer isso.' },
    })
    await openPlan(adapter)
    const { button, dialog } = await openTeam()
    const janela = within(dialog)
    await janela.findByRole('button', { name: 'Criar um código' })
    fireEvent.click(janela.getByRole('button', { name: 'Criar um código' }))
    const alerta = await janela.findByRole('alert')
    expect(alerta.textContent).toBe('Só quem criou o plano pode fazer isso.')
    expect(screen.getByRole('dialog', { name: 'Equipe do plano' })).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(button)
  })

  test('reabrir a janela não mostra a lista velha, e a resposta atrasada da abertura anterior não repõe nada', async () => {
    const { adapter, release } = harness({
      role: 'owner',
      members: [BIA],
      defer: ['GET /projects/plan-1/members'],
    })
    await openPlan(adapter)
    // 1ª abertura: o GET fica preso; fecha antes de ele voltar.
    const primeira = await openTeam()
    expect(within(primeira.dialog).getByText('Buscando a equipe…')).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    // 2ª abertura: começa do zero (buscando), sem lista nenhuma à vista.
    const segunda = await openTeam()
    const janela = within(segunda.dialog)
    expect(janela.getByText('Buscando a equipe…')).toBeTruthy()
    expect(janela.queryByText('Bia')).toBeNull()
    // A resposta ATRASADA da 1ª abertura chega com uma lista velha: é descartada.
    const velha: PensaProjectMembersView = {
      role: 'owner',
      viewerProfileId: EU.profileId,
      shareCode: null,
      maxMembers: 5,
      owner: EU,
      members: [BIA, JOAO_1],
    }
    await act(async () => {
      release('GET /projects/plan-1/members', velha)
      await Promise.resolve()
    })
    expect(janela.queryByText('João')).toBeNull()
    expect(janela.getByText('Buscando a equipe…')).toBeTruthy()
    // A resposta da 2ª abertura é a que vale.
    await act(async () => {
      release('GET /projects/plan-1/members')
    })
    await janela.findByText('1 de 5 lugares')
    expect(janela.getByText('Bia')).toBeTruthy()
    expect(janela.queryByText('João')).toBeNull()
  })

  test('com equipe, o compasso avisa "alguém mexeu no plano" e o "Atualizar" recarrega', async () => {
    const { adapter, touch, calls } = harness({ role: 'owner', members: [BIA] })
    await openPlan(adapter, 20)
    expect(screen.queryByText(AVISO)).toBeNull()
    // Sem mudança, o compasso pergunta e fica quieto.
    await tiques(20)
    expect(screen.queryByText(AVISO)).toBeNull()
    touch()
    const aviso = await screen.findByText(AVISO)
    expect(aviso.closest('[role="status"]')).toBeTruthy()
    const antes = calls.filter((call) => call === 'GET /cycles/cycle-1/stages/z').length
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }))
    await waitFor(() => expect(screen.queryByText(AVISO)).toBeNull())
    await waitFor(() =>
      expect(calls.filter((call) => call === 'GET /cycles/cycle-1/stages/z').length).toBe(
        antes + 1,
      ),
    )
  })

  test('mexer na equipe (gerar código, tirar alguém) NÃO acusa a própria criança, e a etapa não remonta', async () => {
    const { adapter, calls } = harness({ role: 'owner', members: [BIA, JOAO_1] })
    await openPlan(adapter, 20)
    // O que ela está escrevendo na conversa tem que sobreviver à sincronização.
    const campo = screen.getByRole('textbox', { name: 'Mensagem para o Zappy' })
    fireEvent.change(campo, { target: { value: 'meu gato pula muito alto' } })
    const { dialog } = await openTeam()
    const janela = within(dialog)
    await janela.findByText('2 de 5 lugares')
    // Gerar o código grava o `updatedAt` no servidor (o harness imita o members).
    fireEvent.click(janela.getByRole('button', { name: 'Criar um código' }))
    await janela.findByRole('status', { name: 'Código do plano' })
    await tiques(20)
    expect(screen.queryByText(AVISO)).toBeNull()
    // Tirar alguém também.
    fireEvent.click(janela.getByRole('button', { name: 'Tirar Bia da equipe' }))
    fireEvent.click(janela.getByRole('button', { name: 'Tirar mesmo' }))
    await janela.findByText('1 de 5 lugares')
    fireEvent.click(janela.getByRole('button', { name: 'Fechar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await tiques(20)
    expect(screen.queryByText(AVISO)).toBeNull()
    expect(screen.getByRole('button', { name: 'Equipe, 1 na equipe' })).toBeTruthy()
    // A sincronização puxou o detalhe SEM recarregar a etapa: o rascunho continua no campo.
    expect(calls.filter((call) => call === 'GET /cycles/cycle-1/stages/z')).toHaveLength(1)
    expect(
      (screen.getByRole('textbox', { name: 'Mensagem para o Zappy' }) as HTMLTextAreaElement).value,
    ).toBe('meu gato pula muito alto')
    // Anti-vácuo: o compasso segue vivo, e uma mexida DE FORA ainda avisa.
    expect(pollCalls(calls)).toBeGreaterThan(1)
  })

  test('"Atualizar" com coisa sem guardar pergunta antes; "Continuar aqui" mantém tudo, "Atualizar" recarrega', async () => {
    const { adapter, touch, calls } = harness({
      role: 'owner',
      members: [BIA],
      stage: stageZComIdeia,
    })
    await openPlan(adapter, 20)
    // O rascunho da conversa conta como sujo.
    const chat = screen.getByRole('textbox', { name: 'Mensagem para o Zappy' })
    fireEvent.change(chat, { target: { value: 'ainda pensando' } })
    touch()
    await screen.findByText(AVISO)
    const stagesAntes = calls.filter((call) => call === 'GET /cycles/cycle-1/stages/z').length
    const atualizar = screen.getByRole('button', { name: 'Atualizar' })
    fireEvent.click(atualizar)
    const pergunta = await screen.findByRole('dialog', { name: 'Atualizar o plano?' })
    expect(within(pergunta).getByText('Você tem coisa sem guardar. Atualizar mesmo?')).toBeTruthy()
    fireEvent.click(within(pergunta).getByRole('button', { name: 'Continuar aqui' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect((chat as HTMLTextAreaElement).value).toBe('ainda pensando')
    expect(screen.getByText(AVISO)).toBeTruthy()
    expect(calls.filter((call) => call === 'GET /cycles/cycle-1/stages/z')).toHaveLength(
      stagesAntes,
    )
    expect(document.activeElement).toBe(atualizar)
    // Limpou o chat, mas abriu a Carta da Ideia para editar e mexeu: continua sujo.
    fireEvent.change(chat, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Título' }), {
      target: { value: 'Runo 2' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }))
    const pergunta2 = await screen.findByRole('dialog', { name: 'Atualizar o plano?' })
    fireEvent.click(within(pergunta2).getByRole('button', { name: 'Atualizar' }))
    await waitFor(() => expect(screen.queryByText(AVISO)).toBeNull())
    await waitFor(() =>
      expect(calls.filter((call) => call === 'GET /cycles/cycle-1/stages/z')).toHaveLength(
        stagesAntes + 1,
      ),
    )
  })

  test('"Atualizar" sem nada para guardar recarrega direto, sem perguntar', async () => {
    const { adapter, touch, calls } = harness({
      role: 'owner',
      members: [BIA],
      stage: stageZComIdeia,
    })
    await openPlan(adapter, 20)
    // Abriu para editar mas não mexeu: não é sujo.
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    touch()
    await screen.findByText(AVISO)
    const stagesAntes = calls.filter((call) => call === 'GET /cycles/cycle-1/stages/z').length
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(screen.queryByText(AVISO)).toBeNull())
    await waitFor(() =>
      expect(calls.filter((call) => call === 'GET /cycles/cycle-1/stages/z')).toHaveLength(
        stagesAntes + 1,
      ),
    )
  })

  test('o compasso não pergunta com a aba escondida', async () => {
    const { adapter, calls, touch } = harness({ role: 'owner', members: [BIA] })
    const original = Object.getOwnPropertyDescriptor(document, 'visibilityState')
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    try {
      await openPlan(adapter, 20)
      const antes = pollCalls(calls)
      await tiques(20)
      expect(pollCalls(calls)).toBe(antes)
      expect(screen.queryByText(AVISO)).toBeNull()
    } finally {
      if (original) Object.defineProperty(document, 'visibilityState', original)
      else Reflect.deleteProperty(document, 'visibilityState')
    }
    // Anti-vácuo: de volta à vista, o compasso pergunta e avisa.
    touch()
    await screen.findByText(AVISO)
  })

  test('o compasso não pergunta com uma ação em voo (o `busy`)', async () => {
    const { adapter, calls, release } = harness({
      role: 'owner',
      members: [BIA],
      stage: stageZComIdeia,
      defer: ['POST /cycles/cycle-1/artifacts/idea/validate'],
    })
    await openPlan(adapter, 20)
    fireEvent.click(screen.getByRole('button', { name: 'Está do meu jeito ✓' }))
    await waitFor(() => expect(calls).toContain('POST /cycles/cycle-1/artifacts/idea/validate'))
    const antes = pollCalls(calls)
    await tiques(20)
    expect(pollCalls(calls)).toBe(antes)
    // A ação termina em `refresh` (que traz o `updatedAt` novo): nada de aviso, compasso de volta.
    await act(async () => {
      release('POST /cycles/cycle-1/artifacts/idea/validate')
    })
    await waitFor(() => expect(pollCalls(calls)).toBeGreaterThan(antes))
    await tiques(20)
    expect(screen.queryByText(AVISO)).toBeNull()
  })

  test('sem equipe, o compasso nem liga', async () => {
    const { adapter, calls } = harness({ role: 'owner' })
    await openPlan(adapter, 20)
    const antes = calls.length
    await tiques(20)
    expect(calls.length).toBe(antes)
  })
})

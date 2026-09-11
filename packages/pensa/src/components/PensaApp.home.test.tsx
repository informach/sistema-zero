import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { PensaHostAdapter, PensaProjectListView, PensaStage } from '../core/types'
import { PensaApp } from './PensaApp'

afterEach(cleanup)

/**
 * A home no desenho das telas-modelo (11/09/2026): três faixas (creme com o cabeçalho, céu com os
 * planos e o cartão "Novo plano" no fim, lilás com as oficinas), o cartão do plano com os selos,
 * a trilha Z-E-R-O, a linha do andamento e o "Editado há…". happy-dom não faz layout: o que se
 * trava aqui é a estrutura e o texto; o desenho confere-se no playground (`?host=1`).
 */
const DAY = 24 * 60 * 60 * 1000

function plan(id: string, name: string, stage: PensaStage, updatedMsAgo: number) {
  return {
    id,
    name,
    status: 'active',
    cycleNumber: 1,
    stage,
    createdAt: new Date(Date.now() - 5 * DAY).toISOString(),
    updatedAt: new Date(Date.now() - updatedMsAgo).toISOString(),
  } satisfies PensaProjectListView
}

function adapterWith(projects: PensaProjectListView[]): {
  adapter: PensaHostAdapter
  request: ReturnType<typeof mock>
} {
  const request = mock(async (path: string) => {
    if (path === '/projects') return { projects }
    throw new Error(`Unexpected request: ${path}`)
  })
  return {
    request,
    adapter: {
      mode: 'kids',
      capabilities: { pintaOwned: true, studioOwned: true, moldaOwned: true },
      onOpenTask: () => undefined,
      transport: {
        request: request as PensaHostAdapter['transport']['request'],
        streamChat: () => () => {},
      },
    },
  }
}

const DOIS_PLANOS = [
  plan('lua', 'Guardiões da Lua', 'r', DAY + 60_000),
  plan('runo', 'Runo', 'done', 2 * DAY + 60_000),
]

async function home(projects: PensaProjectListView[] = DOIS_PLANOS) {
  const result = adapterWith(projects)
  render(<PensaApp adapter={result.adapter} />)
  await waitFor(() => screen.getByRole('heading', { name: 'Meus projetos' }))
  return result
}

describe('a home do Pensa nas três faixas', () => {
  test('creme com o cabeçalho e o selo do Pensa, céu com os planos, lilás com as oficinas', async () => {
    await home()
    const faixas = Array.from(document.querySelector('.pensa-home.sz-tool-bands')?.children ?? [])
    expect(faixas.map((el) => el.className)).toEqual([
      'sz-tool-band sz-tool-band--creme',
      'sz-tool-band sz-tool-band--ceu',
      'sz-tool-band sz-tool-band--lilas',
    ])
    const creme = faixas[0]
    expect(creme?.tagName).toBe('HEADER')
    expect(within(creme as HTMLElement).getByText('Pensa · sua oficina de planos')).toBeTruthy()
    expect(creme?.contains(screen.getByRole('button', { name: '+ Novo plano' }))).toBe(true)
    // A faixa céu é a região "Meus planos"; a lilás, a das oficinas.
    expect(screen.getByRole('region', { name: 'Meus planos' })).toBe(faixas[1] as HTMLElement)
    const oficinas = screen.getByRole('region', {
      name: 'Cada Cartão de Criação vai para o lugar certo',
    })
    const nomes = within(oficinas)
      .getAllByRole('listitem')
      .map((item) => within(item).getByRole('heading').textContent)
    expect(nomes).toEqual(['Estúdio', 'Pinta', 'Molda'])
    // Informativos: nenhum link nem botão (quem abre a oficina é o cartão do plano).
    expect(within(oficinas).queryByRole('button')).toBeNull()
    expect(within(oficinas).queryByRole('link')).toBeNull()
  })

  test('o cartão do plano: selos, trilha Z-E-R-O, andamento, "Editado há…" e o Continuar', async () => {
    await home()
    const lua = screen.getByRole('heading', { name: 'Guardiões da Lua' }).closest('article')
    expect(lua).not.toBeNull()
    const cartao = within(lua as HTMLElement)
    expect(cartao.getByText('Versão 1')).toBeTruthy()
    expect(cartao.getByText('Etapa R').className).toContain('is-stage')
    // A trilha: Z e E vencidas, R a atual, O ainda não (o nome de cada uma para o leitor).
    const etapas = cartao.getAllByRole('listitem')
    expect(etapas.map((item) => item.className)).toEqual([
      'is-complete',
      'is-complete',
      'is-current',
      'is-next',
    ])
    expect(etapas[2]?.textContent).toBe('RRoteirizar a Criação (etapa atual)')
    expect(cartao.getByText('Etapa atual: Roteirizar a Criação')).toBeTruthy()
    expect(cartao.getByText('Editado ontem')).toBeTruthy()

    const runo = screen.getByRole('heading', { name: 'Runo' }).closest('article')
    const aprovado = within(runo as HTMLElement)
    expect(aprovado.getByText('Plano aprovado').className).toContain('is-approved')
    expect(
      aprovado.getAllByRole('listitem').every((item) => item.className === 'is-complete'),
    ).toBe(true)
    expect(aprovado.getByText('Todas as 4 etapas concluídas')).toBeTruthy()
    expect(aprovado.getByText('Editado há 2 dias')).toBeTruthy()
  })

  test('"Continuar" leva o nome do plano (repetido na grade, sozinho não diria qual) e abre o plano', async () => {
    const { request } = await home()
    const continuar = screen.getByRole('button', { name: 'Continuar o plano Runo' })
    expect(continuar.textContent).toBe('Continuar')
    expect(continuar.className).toContain('sz-tool-pill--primary')
    fireEvent.click(continuar)
    await waitFor(() => expect(request).toHaveBeenCalledWith('/projects/runo'))
  })

  test('o cartão "Novo plano" fecha a grade, abre o mesmo campo e o foco volta para ele', async () => {
    await home()
    const grade = document.querySelector('.pensa-project-grid')
    const novo = screen.getByRole('button', {
      name: 'Novo plano Comece pela etapa Z e siga o método.',
    })
    expect(grade?.lastElementChild).toBe(novo)
    expect(novo.className).toContain('sz-tool-card--new')
    expect(screen.queryByRole('textbox', { name: 'Nome do novo jogo' })).toBeNull()

    fireEvent.click(novo)
    const campo = screen.getByRole('textbox', { name: 'Nome do novo jogo' })
    await waitFor(() => expect(document.activeElement).toBe(campo))
    expect(novo.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('button', { name: '+ Novo plano' }).getAttribute('aria-expanded')).toBe(
      'true',
    )
    // Esc fecha e devolve o foco a QUEM abriu (o cartão, não o botão lá de cima).
    fireEvent.keyDown(campo, { key: 'Escape' })
    expect(screen.queryByRole('textbox', { name: 'Nome do novo jogo' })).toBeNull()
    expect(document.activeElement).toBe(novo)
  })

  test('com o campo já aberto, o cartão "Novo plano" só leva o foco até ele', async () => {
    await home()
    fireEvent.click(screen.getByRole('button', { name: '+ Novo plano' }))
    const campo = screen.getByRole('textbox', { name: 'Nome do novo jogo' })
    await waitFor(() => expect(document.activeElement).toBe(campo))
    ;(document.activeElement as HTMLElement).blur()
    fireEvent.click(screen.getByRole('button', { name: /^Novo plano/ }))
    expect(document.activeElement).toBe(campo)
    expect(screen.getAllByRole('textbox', { name: 'Nome do novo jogo' })).toHaveLength(1)
  })

  test('sem planos: o convite em cartão, sem o cartão "Novo plano" (o campo já nasce aberto)', async () => {
    await home([])
    expect(screen.getByText('Seu primeiro mundo começa aqui')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Novo plano/ })).toBeNull()
    expect(screen.getByRole('textbox', { name: 'Nome do novo jogo' })).toBeTruthy()
    // As oficinas continuam: é onde a criança entende para que serve o plano.
    expect(
      screen.getByRole('region', { name: 'Cada Cartão de Criação vai para o lugar certo' }),
    ).toBeTruthy()
  })
})

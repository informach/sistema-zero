import { describe, expect, it } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getCopy } from '../../core/copy'
import type { PensaHostAdapter } from '../../core/types'
import { createProjectStore, type PensaProjectStore } from '../../state/projectStore'
import {
  createFakeTransport,
  type FakeTransport,
  makeDetail,
  makeListProject,
} from '../../testing/fakeTransport'
import { PensaAppProvider } from '../appContext'
import { ProjectList } from './ProjectList'

function renderList(transport: FakeTransport): { store: PensaProjectStore } {
  const store = createProjectStore(transport)
  const adapter: PensaHostAdapter = { transport, mode: 'kids' }
  render(
    <PensaAppProvider value={{ adapter, copy: getCopy('kids'), store }}>
      <ProjectList />
    </PensaAppProvider>,
  )
  return { store }
}

describe('ProjectList', () => {
  it('mostra o estado vazio amigável quando não há projetos', async () => {
    const transport = createFakeTransport(() => ({ projects: [] }))
    renderList(transport)

    await waitFor(() => {
      expect(screen.getByText('Nenhum plano por aqui ainda')).toBeTruthy()
    })
    expect(screen.getByRole('button', { name: /Criar um jogo novo/ })).toBeTruthy()
  })

  it('lista os projetos com nome, Versão N e menu do card', async () => {
    const transport = createFakeTransport(() => ({
      projects: [
        makeListProject({ name: 'Jogo do Dino', cycleNumber: 2, stage: 'r' }),
        makeListProject({ id: 'proj-2', name: 'Corrida Maluca' }),
      ],
    }))
    renderList(transport)

    await waitFor(() => {
      expect(screen.getByText('Jogo do Dino')).toBeTruthy()
    })
    expect(screen.getByText('Corrida Maluca')).toBeTruthy()
    expect(screen.getByText('Versão 2')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Mais opções do projeto' })).toHaveLength(2)
  })

  it('cria um projeto pelo dialog de 1 passo e abre o projeto novo', async () => {
    const detail = makeDetail({ id: 'proj-novo', name: 'Meu Foguete' })
    const transport = createFakeTransport((path, init) => {
      if (path === '/projects' && init?.method === 'POST') return { project: detail }
      return { projects: [] }
    })
    const { store } = renderList(transport)

    await waitFor(() => {
      expect(screen.getByText('Nenhum plano por aqui ainda')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: /Criar um jogo novo/ }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('Como vai se chamar seu jogo?')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Nome do jogo'), {
      target: { value: 'Meu Foguete' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Criar e começar' }))

    await waitFor(() => {
      expect(store.getState().activeProjectId).toBe('proj-novo')
    })
    const post = transport.calls.find((c) => c.method === 'POST')
    expect(post?.path).toBe('/projects')
    expect(post?.body).toEqual({ name: 'Meu Foguete', kind: 'game' })
    // Fechou o dialog após criar.
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('valida nome curto sem chamar o transport', async () => {
    const transport = createFakeTransport(() => ({ projects: [] }))
    renderList(transport)

    await waitFor(() => {
      expect(screen.getByText('Nenhum plano por aqui ainda')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /Criar um jogo novo/ }))
    fireEvent.change(screen.getByLabelText('Nome do jogo'), { target: { value: 'a' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar e começar' }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('pelo menos 2 letras')
    })
    expect(transport.calls.filter((c) => c.method === 'POST')).toHaveLength(0)
  })

  it('erro do transport vira mensagem gentil com botão de tentar de novo', async () => {
    let fail = true
    const transport = createFakeTransport(() => {
      if (fail) throw new Error('rede caiu')
      return { projects: [makeListProject({ name: 'Voltou!' })] }
    })
    renderList(transport)

    await waitFor(() => {
      expect(screen.getByText('Ops, algo não deu certo')).toBeTruthy()
    })
    // Não vaza o erro técnico.
    expect(screen.queryByText(/rede caiu/)).toBeNull()

    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() => {
      expect(screen.getByText('Voltou!')).toBeTruthy()
    })
  })
})

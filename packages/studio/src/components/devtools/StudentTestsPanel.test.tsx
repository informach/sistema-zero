import { afterEach, describe, expect, it } from 'bun:test'
import type { StudioStudentTest } from '@sistemazero/core/studio/student-tests'
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { createEmptyProject } from '#core'
import { useProjectStore } from '../../state/projectStore'
import { studentTestResultsFor } from '../../state/studentTestResults'
import { useUIStoreApi } from '../../state/uiStore'
import { StudentTestsPanel } from './StudentTestsPanel'

/**
 * A aba Meus testes FORA de um <Studio> (lê a store default; sem a prévia, não há fábrica do
 * documento e o teste não roda: o recado diz que o jogo está carregando). O executor de verdade
 * tem os testes dele (`studentTests/runner.test.ts`) e o navegador, o e2e.
 */
const comecar: StudioStudentTest = {
  id: 'a',
  name: 'Começar o jogo',
  rule: {
    type: 'behavior',
    steps: [{ action: 'press', key: 'Enter' }],
    expect: { target: { kind: 'value', path: 'estado' }, compare: 'equals', value: 'jogando' },
  },
}

/** Os resultados da instância padrão (fora de um <Studio>, a store de interface padrão). */
function defaultResults() {
  const { result } = renderHook(() => useUIStoreApi())
  return studentTestResultsFor(result.current)
}

function seed(tests?: StudioStudentTest[]): void {
  const project = createEmptyProject('p1', 'Jogo')
  useProjectStore.setState({
    project: {
      ...project,
      files: { ...project.files, 'script.js': 'let estado = "titulo"\nlet pontos = 0\n' },
      ...(tests ? { studentTests: tests } : {}),
    },
    isDirty: false,
    saveError: null,
  })
}

afterEach(() => {
  cleanup()
  useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  defaultResults().setState({ projectId: null, outcomes: {}, running: null })
  cleanup()
})

describe('a aba Meus testes', () => {
  it('sem testes, explica o que é um teste e só deixa criar', () => {
    seed()
    render(<StudentTestsPanel />)
    expect(screen.getByRole('status').textContent).toContain('Nenhum teste ainda.')
    expect(screen.getByRole('button', { name: /Rodar os testes/ })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: '+ Novo teste' })).toHaveProperty('disabled', false)
  })

  it('cria um teste pelo formulário, com os nomes do jogo, e ele fica guardado no projeto', () => {
    seed()
    render(<StudentTestsPanel />)
    fireEvent.click(screen.getByRole('button', { name: '+ Novo teste' }))
    const form = screen.getByRole('form', { name: 'Novo teste' })
    fireEvent.change(within(form).getByLabelText('Nome do teste'), {
      target: { value: 'Enter dá um ponto' },
    })
    // O passo que vem pronto é "Apertar a tecla Enter".
    expect((within(form).getByLabelText('Tecla do passo 1') as HTMLSelectElement).value).toBe(
      'Enter',
    )
    const variavel = within(form).getByLabelText('Qual variável') as HTMLSelectElement
    expect([...variavel.options].map((option) => option.value)).toEqual(['', 'estado', 'pontos'])
    fireEvent.change(variavel, { target: { value: 'pontos' } })
    fireEvent.change(within(form).getByLabelText('Como comparar'), {
      target: { value: 'increased' },
    })
    // "aumentou" não pede valor.
    expect(within(form).queryByLabelText('Valor para comparar')).toBeNull()
    fireEvent.click(within(form).getByRole('button', { name: 'Salvar teste' }))
    const saved = useProjectStore.getState().project?.studentTests
    expect(saved).toHaveLength(1)
    expect(saved?.[0]).toMatchObject({
      name: 'Enter dá um ponto',
      rule: {
        steps: [{ action: 'press', key: 'Enter' }],
        expect: { target: { kind: 'value', path: 'pontos' }, compare: 'increased' },
      },
    })
    // De volta à lista, o teste aparece escrito como a prancha.
    expect(screen.getByText('Quando eu apertar Enter. No fim, pontos aumentou.')).toBeTruthy()
  })

  it('não salva sem o que conferir, e diz por quê', () => {
    seed()
    render(<StudentTestsPanel />)
    fireEvent.click(screen.getByRole('button', { name: '+ Novo teste' }))
    const form = screen.getByRole('form', { name: 'Novo teste' })
    fireEvent.change(within(form).getByLabelText('Nome do teste'), { target: { value: 'Teste' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Salvar teste' }))
    expect(within(form).getByRole('alert').textContent).toBe('Escolha o que conferir no fim.')
    expect(useProjectStore.getState().project?.studentTests).toBeUndefined()
  })

  it('edita e apaga um teste guardado', () => {
    seed([comecar])
    render(<StudentTestsPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    const form = screen.getByRole('form', { name: 'Editar teste' })
    expect((within(form).getByLabelText('Valor para comparar') as HTMLInputElement).value).toBe(
      'jogando',
    )
    fireEvent.change(within(form).getByLabelText('Valor para comparar'), {
      target: { value: 'pausado' },
    })
    fireEvent.click(within(form).getByRole('button', { name: 'Salvar teste' }))
    expect(useProjectStore.getState().project?.studentTests?.[0]?.rule.expect.value).toBe('pausado')
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apagar teste' }))
    expect(useProjectStore.getState().project?.studentTests).toBeUndefined()
  })

  it('rodar sem a prévia pronta dá o recado de carregar de novo', async () => {
    seed([comecar])
    render(<StudentTestsPanel />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Rodar os testes/ }))
    })
    await waitFor(() =>
      expect(
        screen.getByText('O jogo ainda está carregando. Rode os testes de novo.'),
      ).toBeTruthy(),
    )
  })

  it('mostra o resultado de cada teste e, no que não passou, como o jogo terminou', () => {
    seed([comecar])
    defaultResults().setState({
      projectId: 'p1',
      outcomes: {
        a: {
          status: 'failed',
          detail: 'x',
          ending: 'data:image/jpeg;base64,AAAA',
          observation: {
            id: 'a',
            type: 'behavior',
            final: { found: true, value: { format: 'sz-observed-v1', value: ['titulo'] } },
            errors: [],
          },
        },
      },
    })
    render(<StudentTestsPanel />)
    expect(screen.getByRole('status').textContent).toContain('0 de 1 teste passou.')
    fireEvent.click(screen.getByRole('button', { name: 'Ver como o jogo terminou' }))
    expect(
      screen.getByRole('img', { name: 'Como o jogo terminou no teste "Começar o jogo"' }),
    ).toBeTruthy()
  })

  it('oferece "Clicar no sprite" só num jogo com o Jogo 2D', () => {
    seed()
    const { unmount } = render(<StudentTestsPanel />)
    fireEvent.click(screen.getByRole('button', { name: '+ Novo teste' }))
    const semJogo2D = screen.getByLabelText('Passo 1', { exact: true }) as HTMLSelectElement
    expect([...semJogo2D.options].map((option) => option.value)).toEqual(['press', 'hold', 'wait'])
    unmount()
    const project = useProjectStore.getState().project
    if (!project) throw new Error('sem projeto')
    useProjectStore.setState({
      project: {
        ...project,
        installedExtensions: [{ id: 'game-2d', version: '1.0.0', installedAt: 0 }],
      },
    })
    render(<StudentTestsPanel />)
    fireEvent.click(screen.getByRole('button', { name: '+ Novo teste' }))
    const comJogo2D = screen.getByLabelText('Passo 1', { exact: true }) as HTMLSelectElement
    expect([...comJogo2D.options].map((option) => option.value)).toContain('click')
  })
})

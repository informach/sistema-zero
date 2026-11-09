import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PythonBlocksHeader } from './PythonBlocksHeader'

/**
 * O cabeçalho dos blocos do Python (redesenho de 11/2026): uma linha só com o arquivo, o "Ir
 * para" (busca de função dentro da lista), "Fechar as funções" e os Rascunhos com a frase na dica.
 */
const program = {
  entries: [
    { id: 'a', label: 'Função colocar_moeda', depth: 0, expanded: false },
    { id: 'b', label: 'Função contar_tempo', depth: 0, expanded: false },
  ],
  scratch: 2,
} as never

afterEach(cleanup)

describe('PythonBlocksHeader', () => {
  it('com um .py só mostra o nome; com mais, o seletor troca de arquivo', () => {
    const onChangeFile = mock(() => {})
    const { rerender } = render(
      <PythonBlocksHeader
        path="main.py"
        files={['main.py']}
        onChangeFile={onChangeFile}
        program={program}
        activeDefinition=""
        locked={false}
        onNavigate={() => {}}
        onScratch={() => {}}
      />,
    )
    expect(screen.queryByRole('combobox', { name: 'Arquivo Python' })).toBeNull()
    expect(screen.getByText('main.py')).toBeTruthy()
    rerender(
      <PythonBlocksHeader
        path="main.py"
        files={['main.py', 'settings.py']}
        onChangeFile={onChangeFile}
        program={program}
        activeDefinition=""
        locked={false}
        onNavigate={() => {}}
        onScratch={() => {}}
      />,
    )
    fireEvent.change(screen.getByRole('combobox', { name: 'Arquivo Python' }), {
      target: { value: 'settings.py' },
    })
    expect(onChangeFile).toHaveBeenCalledWith('settings.py')
  })

  it('"Ir para" filtra as funções e navega; "Fechar as funções" volta ao Programa inteiro', () => {
    const onNavigate = mock((_id?: string) => {})
    const { rerender } = render(
      <PythonBlocksHeader
        path="main.py"
        files={['main.py']}
        program={program}
        activeDefinition=""
        locked={false}
        onNavigate={onNavigate}
        onScratch={() => {}}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Fechar as funções' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Ir para: Programa inteiro' }))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Procurar uma função ou classe' }), {
      target: { value: 'tempo' },
    })
    expect(screen.queryByRole('button', { name: 'Função colocar_moeda' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Função contar_tempo' }))
    expect(onNavigate).toHaveBeenLastCalledWith('b')
    rerender(
      <PythonBlocksHeader
        path="main.py"
        files={['main.py']}
        program={program}
        activeDefinition="b"
        locked={false}
        onNavigate={onNavigate}
        onScratch={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: 'Ir para: Função contar_tempo' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Fechar as funções' }))
    expect(onNavigate.mock.calls.at(-1)?.[0]).toBeUndefined()
    expect(onNavigate).toHaveBeenCalledTimes(2)
  })

  it('Rascunhos: o número no botão e a frase de antes na dica', () => {
    const onScratch = mock(() => {})
    render(
      <PythonBlocksHeader
        path="main.py"
        files={['main.py']}
        program={program}
        activeDefinition=""
        locked={false}
        onNavigate={() => {}}
        onScratch={onScratch}
      />,
    )
    const rascunhos = screen.getByRole('button', { name: /^Rascunhos 2\./ })
    expect(rascunhos.getAttribute('title')).toContain('não rodam')
    fireEvent.click(rascunhos)
    expect(onScratch).toHaveBeenCalledTimes(1)
  })
})

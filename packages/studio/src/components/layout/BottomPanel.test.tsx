import { afterAll, afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import type { JSX } from 'react'
import { useEffect } from 'react'
import { createEmptyProject } from '#core'
import { useProjectStore } from '../../state/projectStore'
import { useUIStore } from '../../state/uiStore'

// bun:test NÃO isola module mocks por arquivo — captura os exports reais ANTES
// de mockar e restaura no afterAll, senão os stubs vazam para os próximos
// arquivos da suíte (ver BlocksMode.test.tsx).
const realTerminal = { ...(await import('../terminal/Terminal')) }
const realAIPanel = { ...(await import('../ai/AIPanel')) }
const realConsolePanel = { ...(await import('../console/ConsolePanel')) }

// Probe leve do Terminal: marca quantas vezes foi MONTADO (effect com deps []).
// Se a troca de aba desmontasse o Terminal, um retorno à aba o montaria de novo
// (contagem > 1).
let terminalMounts = 0
mock.module('../terminal/Terminal', () => ({
  Terminal: (): JSX.Element => {
    useEffect(() => {
      terminalMounts += 1
    }, [])
    return <div data-testid="terminal-probe">terminal</div>
  },
}))

mock.module('../ai/AIPanel', () => ({
  AIPanel: () => <div data-testid="ai-probe">ia</div>,
}))

let consoleShouldThrow = false
mock.module('../console/ConsolePanel', () => ({
  ConsolePanel: (): JSX.Element => {
    if (consoleShouldThrow) throw new Error('console explodiu')
    return <div data-testid="console-probe">console</div>
  },
}))

afterAll(() => {
  mock.module('../terminal/Terminal', () => realTerminal)
  mock.module('../ai/AIPanel', () => realAIPanel)
  mock.module('../console/ConsolePanel', () => realConsolePanel)
})

// Importa DEPOIS dos mocks para que o lazy() resolva os stubs.
const { BottomPanel } = await import('./BottomPanel')

function setCodeProject(): void {
  useProjectStore.setState({
    project: { ...createEmptyProject('p1', 'Projeto'), mode: 'code' },
    isDirty: false,
    saveError: null,
  })
}

describe('BottomPanel', () => {
  beforeEach(() => {
    terminalMounts = 0
    consoleShouldThrow = false
    setCodeProject()
    useUIStore.setState({ bottomTab: 'console' })
  })

  afterEach(() => {
    cleanup()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
    useUIStore.setState({ bottomTab: 'console' })
  })

  it('marca as abas com role=tab e aria-selected', () => {
    const { getAllByRole, getByRole } = render(<BottomPanel />)
    expect(getByRole('tablist')).toBeTruthy()
    const tabs = getAllByRole('tab')
    expect(tabs.length).toBe(3) // console + terminal + ia (modo code, tudo ligado)
    const selected = tabs.filter((b) => b.getAttribute('aria-selected') === 'true')
    expect(selected.length).toBe(1)
    expect(selected[0]?.textContent).toContain('Console')
  })

  it('atualiza aria-selected ao trocar de aba', () => {
    const { getAllByRole } = render(<BottomPanel />)
    act(() => useUIStore.setState({ bottomTab: 'terminal' }))
    const selected = getAllByRole('tab').filter((b) => b.getAttribute('aria-selected') === 'true')
    expect(selected.length).toBe(1)
    expect(selected[0]?.textContent).toContain('Terminal')
  })

  it('mantém o Terminal montado ao alternar abas (não remonta)', async () => {
    useUIStore.setState({ bottomTab: 'terminal' })
    const { findByTestId, getByTestId } = render(<BottomPanel />)
    // Espera o chunk lazy do Terminal resolver E o effect de montagem FLUSHAR — o
    // `findByTestId` resolve no commit (probe no DOM), mas o passive effect que
    // incrementa `terminalMounts` corre depois; sem o waitFor, no CI dá 0 (flake).
    await findByTestId('terminal-probe')
    await waitFor(() => expect(terminalMounts).toBe(1))

    // Vai para console e volta para o terminal.
    act(() => useUIStore.setState({ bottomTab: 'console' }))
    expect(getByTestId('console-probe')).toBeTruthy()
    // O Terminal continua no DOM mesmo com a aba console ativa.
    expect(getByTestId('terminal-probe')).toBeTruthy()

    act(() => useUIStore.setState({ bottomTab: 'terminal' }))
    // Nenhuma remontagem: o shell do WebContainer e o buffer do xterm sobrevivem.
    expect(terminalMounts).toBe(1)
  })

  it('isola falha do ConsolePanel num boundary com fallback', async () => {
    const spy = spyOn(console, 'error').mockImplementation(() => {})
    consoleShouldThrow = true
    const { findByText } = render(<BottomPanel />)
    expect(await findByText('O console falhou ao carregar')).toBeTruthy()
    spy.mockRestore()
  })
})

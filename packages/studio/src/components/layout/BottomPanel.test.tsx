import { afterAll, afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { act, cleanup, render } from '@testing-library/react'
import type { JSX } from 'react'
import { createEmptyProject } from '#core'
import { useProjectStore } from '../../state/projectStore'
import { useUIStore } from '../../state/uiStore'

// bun:test NÃO isola module mocks por arquivo — captura os exports reais ANTES
// de mockar e restaura no afterAll, senão os stubs vazam para os próximos
// arquivos da suíte (ver BlocksMode.test.tsx).
const realTerminal = { ...(await import('../terminal/Terminal')) }
const realAIPanel = { ...(await import('../ai/AIPanel')) }
const realConsolePanel = { ...(await import('../console/ConsolePanel')) }

// Probe leve do Terminal. A "não remontagem" é verificada por IDENTIDADE DO NÓ do
// DOM (ver teste abaixo), não por contagem de effect: o passive/layout effect de
// um componente `lazy` NÃO flusha no harness do CI (happy-dom@20 + bun:test), o
// que tornava um contador de montagens flaky (0 no CI, ok local).
mock.module('../terminal/Terminal', () => ({
  Terminal: (): JSX.Element => <div data-testid="terminal-probe">terminal</div>,
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
  setProject('code')
}

function setProject(mode: 'blocks' | 'bridge' | 'code'): void {
  useProjectStore.setState({
    project: { ...createEmptyProject('p1', 'Projeto'), mode },
    isDirty: false,
    saveError: null,
  })
}

describe('BottomPanel', () => {
  beforeEach(() => {
    consoleShouldThrow = false
    setCodeProject()
    useUIStore.setState({ bottomTab: 'console', consoleVisibilityOverride: null })
  })

  afterEach(() => {
    cleanup()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
    useUIStore.setState({ bottomTab: 'console', consoleVisibilityOverride: null })
  })

  it.each(['blocks', 'bridge'] as const)('começa sem a aba Console no modo %s', (mode) => {
    setProject(mode)
    const { queryByRole } = render(<BottomPanel />)
    expect(queryByRole('tab', { name: 'Console' })).toBeNull()
  })

  it('começa com a aba Console no modo code', () => {
    const { getByRole } = render(<BottomPanel />)
    expect(getByRole('tab', { name: 'Console' })).toBeTruthy()
  })

  it('faz a escolha manual prevalecer ao trocar de modo', () => {
    setProject('blocks')
    useUIStore.setState({ consoleVisibilityOverride: true })
    const { getByRole, queryByRole } = render(<BottomPanel />)
    expect(getByRole('tab', { name: 'Console' })).toBeTruthy()

    act(() => setProject('code'))
    act(() => useUIStore.setState({ consoleVisibilityOverride: false }))
    expect(queryByRole('tab', { name: 'Console' })).toBeNull()

    act(() => setProject('bridge'))
    expect(queryByRole('tab', { name: 'Console' })).toBeNull()
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
    // Captura o NÓ do DOM do Terminal (chunk lazy resolvido). Se a troca de aba
    // remontasse o componente, o React criaria um nó NOVO; se ele só fica oculto
    // (hidden), o MESMO nó persiste. Comparar identidade é determinístico e não
    // depende de flush de effect (que não roda p/ lazy no harness do CI).
    const firstNode = await findByTestId('terminal-probe')

    // Vai para console: o Terminal continua no DOM (mesmo nó), só oculto.
    act(() => useUIStore.setState({ bottomTab: 'console' }))
    expect(getByTestId('console-probe')).toBeTruthy()
    expect(getByTestId('terminal-probe')).toBe(firstNode)

    // Volta para o terminal: ainda o MESMO nó = não remontou (shell do
    // WebContainer e buffer do xterm sobrevivem).
    act(() => useUIStore.setState({ bottomTab: 'terminal' }))
    expect(getByTestId('terminal-probe')).toBe(firstNode)
  })

  it('isola falha do ConsolePanel num boundary com fallback', async () => {
    const spy = spyOn(console, 'error').mockImplementation(() => {})
    consoleShouldThrow = true
    const { findByText } = render(<BottomPanel />)
    expect(await findByText('O console falhou ao carregar')).toBeTruthy()
    spy.mockRestore()
  })
})

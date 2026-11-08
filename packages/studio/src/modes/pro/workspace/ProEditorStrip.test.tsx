import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { MonacoHeaderContext } from '../../../monaco/MonacoTabs'
import { ProEditorStrip, type ProEditorTools } from './ProEditorStrip'

afterEach(cleanup)

function strip(overrides: Partial<MonacoHeaderContext> = {}, layout: 'split' | 'code' = 'split') {
  const calls: string[] = []
  const ctx: MonacoHeaderContext = {
    files: [
      { name: 'src/main.js', value: '' },
      { name: 'src/style.css', value: '' },
    ],
    active: 'src/main.js',
    setActive: (name) => calls.push(`active:${name}`),
    temporaryFile: 'src/style.css',
    canClose: () => true,
    closeFile: (name) => calls.push(`close:${name}`),
    pinFile: (name) => calls.push(`pin:${name}`),
    format: () => calls.push('format'),
    formatBusy: false,
    canFormat: true,
    compact: false,
    ...overrides,
  }
  const tools: ProEditorTools = {
    openSymbols: mock(() => {}),
    openCommands: mock(() => {}),
    findReferences: mock(() => {}),
    rename: mock(() => {}),
  }
  const onShowStage = mock(() => {})
  const onToggleWhitespace = mock(() => {})
  const onCloseOthers = mock(() => {})
  const onQuickOpen = mock(() => {})
  const onReveal = mock(() => {})
  const view = render(
    <ProEditorStrip
      ctx={ctx}
      subject="game"
      layout={layout}
      tools={tools}
      editor={{ current: null }}
      showWhitespace={false}
      onToggleWhitespace={onToggleWhitespace}
      onShowStage={onShowStage}
      onQuickOpen={onQuickOpen}
      onCloseOthers={onCloseOthers}
      onReveal={onReveal}
    />,
  )
  return {
    view,
    calls,
    tools,
    onShowStage,
    onToggleWhitespace,
    onCloseOthers,
    onQuickOpen,
    onReveal,
  }
}

describe('a faixa única sobre o código (redesenho do Pro, 11/2026)', () => {
  it('abas com ladrilho e nome curto; trocar, fixar e fechar passam pelo editor', () => {
    const { calls } = strip()
    // Botões dentro de um `nav`, não `tab`: o × de fechar mora ao lado de cada aba, e uma
    // `tablist` só pode ter abas dentro. O nome acessível é o CAMINHO.
    const nav = screen.getByRole('navigation', { name: 'Arquivos abertos' })
    const tabs = Array.from(nav.querySelectorAll<HTMLButtonElement>('.sz-pro-edtab'))
    expect(tabs.map((tab) => tab.textContent)).toEqual(['JSmain.js', 'style.css'])
    expect(tabs.map((tab) => tab.getAttribute('aria-label'))).toEqual([
      'src/main.js',
      'src/style.css',
    ])
    expect(screen.queryAllByRole('tab')).toHaveLength(0)
    expect(tabs[0]?.getAttribute('aria-current')).toBe('true')
    expect(tabs[1]?.hasAttribute('aria-current')).toBe(false)
    expect(tabs[1]?.className).toContain('sz-pro-edtab--temporary')
    fireEvent.click(tabs[1] as HTMLElement)
    fireEvent.doubleClick(tabs[1] as HTMLElement)
    fireEvent.click(screen.getByRole('button', { name: 'Fechar src/style.css' }))
    expect(calls).toEqual(['active:src/style.css', 'pin:src/style.css', 'close:src/style.css'])
    // O título inteiro (com a pasta) fica no title da aba.
    expect(tabs[0]?.getAttribute('title')).toBe('src/main.js')
  })

  it('"Arrumar código" chama o formatador do editor e respeita quem não tem formatador', () => {
    const { calls } = strip()
    fireEvent.click(screen.getByRole('button', { name: 'Arrumar código' }))
    expect(calls).toEqual(['format'])
    cleanup()
    strip({ canFormat: false })
    expect(
      (screen.getByRole('button', { name: 'Arrumar código' }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  it('"Mostrar o jogo" só existe em "Só o código"', () => {
    strip()
    expect(screen.queryByRole('button', { name: 'Mostrar o jogo' })).toBeNull()
    cleanup()
    const { onShowStage } = strip({}, 'code')
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar o jogo' }))
    expect(onShowStage).toHaveBeenCalledTimes(1)
  })

  it('o menu "Mais" reúne o que eram cinco faixas: mapa, ir para um arquivo, onde é usado, trocar nome, espaços, mostrar na lista, fixar, fechar as outras, todas as ações', () => {
    const { tools, onQuickOpen, onToggleWhitespace, onCloseOthers, onReveal, calls } = strip({
      // A aba de agora é a temporária: "Deixar esta aba aberta" aparece (o teclado também fixa).
      active: 'src/style.css',
    })
    const open = () => fireEvent.click(screen.getByRole('button', { name: 'Mais' }))
    open()
    const names = screen.getAllByRole('menuitem').map((item) => item.textContent)
    expect(names).toEqual([
      'Mapa do arquivoCtrl+Shift+O',
      'Ir para um arquivoCtrl+P',
      'Procurar neste arquivoCtrl+F',
      'Onde isto é usadoShift+F12',
      'Trocar nome em todo lugarF2',
      'Mostrar espaços',
      'Mostrar na lista de arquivos',
      'Deixar esta aba aberta',
      'Fechar as outras abas',
      'Todas as ações…Ctrl+Shift+P',
    ])
    fireEvent.click(screen.getByRole('menuitem', { name: 'Mostrar na lista de arquivos' }))
    expect(onReveal).toHaveBeenCalledTimes(1)
    open()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Deixar esta aba aberta' }))
    expect(calls).toEqual(['pin:src/style.css'])
    open()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Mapa do arquivo' }))
    expect(tools.openSymbols).toHaveBeenCalledTimes(1)
    open()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Ir para um arquivo' }))
    expect(onQuickOpen).toHaveBeenCalledTimes(1)
    open()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Onde isto é usado' }))
    expect(tools.findReferences).toHaveBeenCalledTimes(1)
    open()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Trocar nome em todo lugar' }))
    expect(tools.rename).toHaveBeenCalledTimes(1)
    open()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Mostrar espaços' }))
    expect(onToggleWhitespace).toHaveBeenCalledTimes(1)
    open()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Fechar as outras abas' }))
    expect(onCloseOthers).toHaveBeenCalledTimes(1)
    open()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Todas as ações…' }))
    expect(tools.openCommands).toHaveBeenCalledTimes(1)
  })

  it('sem as ferramentas prontas, os itens que dependem delas ficam desligados', () => {
    const ctxOnly = strip()
    ctxOnly.view.rerender(
      <ProEditorStrip
        ctx={{
          files: [{ name: 'a.py', value: '' }],
          active: 'a.py',
          setActive: () => {},
          temporaryFile: null,
          canClose: () => false,
          closeFile: () => {},
          pinFile: () => {},
          format: () => {},
          formatBusy: false,
          canFormat: true,
          compact: true,
        }}
        subject="program"
        layout="split"
        tools={null}
        editor={{ current: null }}
        showWhitespace
        onToggleWhitespace={() => {}}
        onShowStage={() => {}}
        onQuickOpen={() => {}}
        onCloseOthers={() => {}}
        onReveal={() => {}}
      />,
    )
    // Compacto: o botão vira só ícone, com o nome acessível de sempre.
    expect(screen.getByRole('button', { name: 'Arrumar código' }).textContent).toBe('')
    expect(screen.queryByRole('button', { name: /Fechar a\.py/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Mais' }))
    const disabled = screen
      .getAllByRole('menuitem')
      .filter(
        (item) => item.hasAttribute('disabled') || item.getAttribute('aria-disabled') === 'true',
      )
      .map((item) => item.textContent)
    expect(disabled).toEqual([
      'Mapa do arquivoCtrl+Shift+O',
      'Onde isto é usadoShift+F12',
      'Trocar nome em todo lugarF2',
      'Fechar as outras abas',
      'Todas as ações…Ctrl+Shift+P',
    ])
  })
})

import { describe, expect, it } from 'bun:test'
import { act, fireEvent, render, within } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { StudioStoresContext } from '../../../state/storesContext'
import { createStudioStores } from '../../../state/studioStores'
import { StudioLayoutProvider } from '../../../studio/layoutContext'
import { emptyWorkspace, type ProWorkspacePreferences } from './model'
import { ProWorkspaceLayout } from './ProWorkspaceLayout'

/**
 * Regra 12 do CLAUDE.md: trocar de tamanho (largo → tablet → celular) ou de arrumação NÃO
 * remonta Monaco, a prévia nem o Zappy. Cada sonda conta montagens e desmontagens; o valor
 * digitado no "código" sobrevive a tudo.
 */
describe('layout contínuo do Pro', () => {
  const mounts: Record<string, number> = {},
    disposals: Record<string, number> = {}
  function Probe({ name }: { name: string }) {
    useEffect(() => {
      mounts[name] = (mounts[name] ?? 0) + 1
      return () => {
        disposals[name] = (disposals[name] ?? 0) + 1
      }
    }, [name])
    return <input aria-label={name} defaultValue={`${name} inicial`} />
  }
  let latest: ProWorkspacePreferences = emptyWorkspace()
  function Workspace({ preview = true }: { preview?: boolean }) {
    const [preferences, change] = useState(emptyWorkspace)
    latest = preferences
    return (
      <ProWorkspaceLayout
        navigator={(_close, { phone }) => (
          <div>
            <Probe name="arquivos" />
            <span>{phone ? 'seletor do celular' : 'sem seletor'}</span>
          </div>
        )}
        editor={<Probe name="código" />}
        preview={preview ? <Probe name="jogo" /> : null}
        tutor={<Probe name="zappy" />}
        dock={<Probe name="gaveta" />}
        subject="game"
        preferences={preferences}
        change={change}
        gameRequest={0}
        searchRequest={0}
      />
    )
  }
  const stores = createStudioStores({ persistence: 'none' })
  const content = (width: number) => (
    <StudioStoresContext.Provider value={stores}>
      <StudioLayoutProvider value={{ width, isNarrow: width < 1024, isCompact: width < 440 }}>
        <Workspace />
      </StudioLayoutProvider>
    </StudioStoresContext.Provider>
  )

  it('preserva código, prévia, Zappy e gaveta pelos três tamanhos e por toda arrumação', () => {
    const view = render(content(1440))
    const root = view.container.querySelector('[data-sz-pro-tier]') as HTMLElement
    expect(root.getAttribute('data-sz-pro-tier')).toBe('wide')
    const original = view.getByLabelText('código')
    fireEvent.change(original, { target: { value: 'edição ainda aberta' } })

    // Largo: o segmentado do palco arruma a tela.
    fireEvent.click(view.getByRole('button', { name: 'Só o jogo' }))
    expect(latest.layout).toBe('game')
    fireEvent.click(view.getByRole('button', { name: 'Lado a lado' }))
    expect(latest.layout).toBe('split')
    expect(view.getByRole('button', { name: 'Lado a lado' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    // "Só o código" esconde o palco inteiro (o segmentado vai junto): quem traz de volta é o
    // "Mostrar o jogo" da faixa do editor ou o Rodar da Topbar (`revealStage`).
    fireEvent.click(view.getByRole('button', { name: 'Só o código' }))
    expect(latest.layout).toBe('code')
    expect(view.queryByRole('button', { name: 'Só o jogo' })).toBeNull()
    act(() => stores.proRun.getState().revealStage?.())
    expect(latest.layout).toBe('split')

    // Tablet: o mesmo DOM; o painel lateral vira gaveta (fechada por padrão).
    view.rerender(content(900))
    expect(root.getAttribute('data-sz-pro-tier')).toBe('tablet')
    expect(view.getByLabelText('arquivos').closest('[hidden]')).not.toBeNull()

    // Celular: abas no rodapé; o grupo de painéis fica montado.
    view.rerender(content(390))
    expect(root.getAttribute('data-sz-pro-tier')).toBe('phone')
    // Botões com `aria-pressed`, não `tab`: uma `tablist` exige painéis ligados por
    // `aria-controls`, e as partes da tela não são painéis de abas.
    const tabs = view.getByRole('navigation', { name: 'Partes da tela' })
    fireEvent.click(within(tabs).getByRole('button', { name: 'Jogo' }))
    expect(within(tabs).getByRole('button', { name: 'Jogo' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    fireEvent.click(within(tabs).getByRole('button', { name: 'Saída' }))
    fireEvent.click(within(tabs).getByRole('button', { name: 'Arquivos' }))
    expect(view.getByText('seletor do celular')).toBeTruthy()
    fireEvent.click(within(tabs).getByRole('button', { name: 'Código' }))
    expect(view.queryByRole('button', { name: 'Só o código' })).toBeNull()

    view.rerender(content(1440))
    expect(view.getByLabelText('código')).toBe(original)
    expect((original as HTMLInputElement).value).toBe('edição ainda aberta')
    expect(view.getByText('sem seletor')).toBeTruthy()
    expect(mounts).toEqual({ arquivos: 1, código: 1, jogo: 1, zappy: 1, gaveta: 1 })
    expect(disposals).toEqual({})
    view.unmount()
    expect(disposals).toEqual({ arquivos: 1, código: 1, jogo: 1, zappy: 1, gaveta: 1 })
  })

  it('o trilho troca a vista do painel (e o fecha ao apertar de novo); no tablet é uma gaveta', () => {
    const view = render(content(1440))
    const rail = view.getByRole('navigation', { name: 'Explorar o projeto' })
    const files = within(rail).getByRole('button', { name: 'Arquivos' })
    expect(files.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(within(rail).getByRole('button', { name: 'Procurar' }))
    expect(latest.panel).toBe('search')
    expect(
      within(rail).getByRole('button', { name: 'Procurar' }).getAttribute('aria-pressed'),
    ).toBe('true')
    const panel = document.getElementById(files.getAttribute('aria-controls') ?? '')
    expect(panel?.hidden).toBe(false)
    fireEvent.click(within(rail).getByRole('button', { name: 'Procurar' }))
    expect(panel?.hidden).toBe(true)
    expect(latest.panel).toBe('search')

    view.rerender(content(900))
    expect(panel?.hidden).toBe(true)
    fireEvent.click(within(rail).getByRole('button', { name: 'Materiais' }))
    expect(panel?.hidden).toBe(false)
    expect(panel?.className).toContain('sz-pro-side--drawer')
    fireEvent.click(view.getByRole('button', { name: 'Fechar o painel' }))
    expect(panel?.hidden).toBe(true)
    fireEvent.click(within(rail).getByRole('button', { name: 'Materiais' }))
    fireEvent.keyDown(panel as HTMLElement, { key: 'Escape' })
    expect(panel?.hidden).toBe(true)
    view.unmount()
  })

  it('abrir já no tablet começa com a gaveta FECHADA (ela cobriria o código)', () => {
    const view = render(content(900))
    const rail = view.getByRole('navigation', { name: 'Explorar o projeto' })
    const files = within(rail).getByRole('button', { name: 'Arquivos' })
    const panel = document.getElementById(files.getAttribute('aria-controls') ?? '')
    expect(panel?.hidden).toBe(true)
    view.unmount()
  })

  it('no celular há UM studio-run e no máximo UM studio-stop, sempre no que está visível', () => {
    // O cursor da professora usa `querySelector` (o primeiro da página): um alvo escondido na
    // frente do visível apontaria para o nada.
    const view = render(content(390))
    const targets = (id: string) =>
      Array.from(view.container.querySelectorAll(`[data-live-target="${id}"]`))
    const tabs = view.getByRole('navigation', { name: 'Partes da tela' })
    // Aba Código: o botão flutuante; o par do palco está escondido e sem alvo.
    expect(targets('studio-run')).toHaveLength(1)
    expect(targets('studio-run')[0]?.className).toContain('sz-pro-fab')
    expect(targets('studio-stop')).toHaveLength(0)
    // Aba Jogo: o par embaixo do palco.
    fireEvent.click(within(tabs).getByRole('button', { name: 'Jogo' }))
    expect(targets('studio-run')).toHaveLength(1)
    expect(targets('studio-stop')).toHaveLength(1)
    expect(targets('studio-run')[0]?.closest('[hidden]')).toBeNull()
    expect(targets('studio-stop')[0]?.closest('[hidden]')).toBeNull()
    // Aba Arquivos: nenhum (nada de Rodar visível ali).
    fireEvent.click(within(tabs).getByRole('button', { name: 'Arquivos' }))
    expect(targets('studio-run')).toHaveLength(0)
    expect(targets('studio-stop')).toHaveLength(0)
    // Largo: os alvos são da Topbar, nenhum no palco.
    view.rerender(content(1440))
    expect(targets('studio-run')).toHaveLength(0)
    expect(targets('studio-stop')).toHaveLength(0)
    view.unmount()
  })

  it('registra o revealStage que a Topbar chama junto com Rodar: sai de "Só o código"', () => {
    const view = render(content(1440))
    fireEvent.click(view.getByRole('button', { name: 'Só o código' }))
    expect(latest.layout).toBe('code')
    act(() => stores.proRun.getState().revealStage?.())
    expect(latest.layout).toBe('split')
    view.unmount()
    expect(stores.proRun.getState().revealStage).toBeNull()
  })
})

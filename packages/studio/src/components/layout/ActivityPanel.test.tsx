import { afterEach, describe, expect, it, spyOn } from 'bun:test'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import type { JSX } from 'react'
import * as activityRunner from '../../activity/useActivityRunner'
import type { LessonActivity } from '../../studio/activity'
import { StudioActivityProvider } from '../../studio/activity'
import type { StudioLayout } from '../../studio/layoutContext'
import { StudioLayoutProvider } from '../../studio/layoutContext'
import { ActivityPanel } from './ActivityPanel'

const WIDE: StudioLayout = { width: 1000, isNarrow: false, isCompact: false }
const NARROW: StudioLayout = { width: 400, isNarrow: true, isCompact: false }

const ACTIVITY: LessonActivity = {
  instructions: 'Faça um botão que conta cliques',
  checks: [{ id: 'c1', label: 'Usou um laço', kind: 'structure', rule: { type: 'usesLoop' } }],
}

function renderPanel(activity: LessonActivity | null, layout: StudioLayout): JSX.Element {
  return (
    <StudioLayoutProvider value={layout}>
      <StudioActivityProvider value={activity}>
        <ActivityPanel />
      </StudioActivityProvider>
    </StudioLayoutProvider>
  )
}

describe('ActivityPanel', () => {
  afterEach(() => cleanup())

  it('mostra falha de carregamento/execução sem inventar uma nota e permite tentar de novo', async () => {
    const run = spyOn(activityRunner, 'useActivityRunner').mockReturnValue({
      run: () => Promise.reject(new Error('Failed to fetch dynamically imported module')),
      running: false,
      result: null,
    })
    try {
      const view = render(renderPanel(ACTIVITY, WIDE))
      fireEvent.click(view.getByText('Verificar'))
      await waitFor(() => expect(view.getByRole('alert').textContent).toContain('tente novamente'))
      expect(view.queryByText(/100/)).toBeNull()
      expect(view.getByText('Verificar').hasAttribute('disabled')).toBe(false)
      view.rerender(renderPanel({ ...ACTIVITY, instructions: 'Outra aula' }, WIDE))
      expect(view.queryByRole('alert')).toBeNull()
    } finally {
      run.mockRestore()
    }
  })

  it('sem atividade não acrescenta DOM (self-gating do <StudioEditor>)', () => {
    const { container } = render(renderPanel(null, WIDE))
    expect(container.querySelector('aside')).toBeNull()
  })

  it('renderiza enunciado + "Verificar" no WIDE (coluna lateral w-80)', () => {
    const { getByText, container } = render(renderPanel(ACTIVITY, WIDE))
    expect(getByText('Faça um botão que conta cliques')).toBeTruthy()
    expect(getByText('Verificar')).toBeTruthy()
    const aside = container.querySelector('aside')
    expect(aside?.className).toContain('w-80')
    expect(aside?.className).toContain('border-r')
  })

  it('renderiza no NARROW como faixa de topo (full-width, border-b) — achado A', () => {
    // Regressão do 6º review: o ActivityPanel só montava no layout wide, então em
    // tela estreita (kids no celular) o aluno ficava sem "Verificar" e o gate
    // reprovava toda checagem não-estrutural em silêncio.
    const { getByText, container } = render(renderPanel(ACTIVITY, NARROW))
    expect(getByText('Verificar')).toBeTruthy()
    const aside = container.querySelector('aside')
    expect(aside?.className).toContain('w-full')
    expect(aside?.className).toContain('border-b')
    expect(aside?.className).not.toContain('w-80')
  })
})

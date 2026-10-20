import { afterEach, expect, mock, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createEmptyProject } from '#core'
import { missionSessionFixture } from '../../../ui/tests/mission-fixture'
import { useProjectStore } from '../state/projectStore'
import { TaskGuidePanel } from './TaskGuidePanel'
import { withSaveBeforeTaskActions } from './taskSessionSave'

afterEach(() => {
  cleanup()
  useProjectStore.setState({ project: null, isDirty: false })
})
test('preparação instala a extensão por escolha explícita e repetir não duplica', async () => {
  const session = missionSessionFixture()
  session.mission = {
    ...session.mission,
    kind: 'setup',
    destination: 'studio',
    setup: {
      type: 'extensions',
      authoring: 'blocks',
      runtimeExtensionId: 'game-2d',
      requiredAuxiliaryExtensionIds: [],
      recommendation: 'Recomendo Jogo 2D para este jogo.',
    },
  }
  useProjectStore.setState({ project: createEmptyProject('jogo', 'Jogo'), isDirty: false })
  render(<TaskGuidePanel session={session} />)
  expect(useProjectStore.getState().project?.installedExtensions).toHaveLength(0)
  fireEvent.click(screen.getByRole('button', { name: 'Instalar ferramentas recomendadas' }))
  await screen.findByText('Já está preparada.')
  expect(useProjectStore.getState().project?.installedExtensions.map((item) => item.id)).toEqual([
    'game-2d',
  ])
  expect(screen.getByRole('button', { name: 'Já preparei' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Instalar ferramentas recomendadas' })).toBeNull()
})
test('falha no flush impede a confirmação e conserva a frase da gravação', async () => {
  const session = missionSessionFixture()
  const complete = mock(async () => {})
  session.onComplete = complete
  const wrapped = withSaveBeforeTaskActions(session, async () => {
    throw new Error('storage')
  })
  render(<TaskGuidePanel session={wrapped} />)
  fireEvent.click(screen.getByRole('button', { name: 'Conferi e está pronto' }))
  await waitFor(() =>
    expect(screen.getByRole('alert').textContent).toContain('guardar seu jogo neste aparelho'),
  )
  expect(complete).not.toHaveBeenCalled()
})
test('uma missão concluída permite reabrir sem trocar o resultado esperado', async () => {
  const session = missionSessionFixture()
  session.progress.status = 'completed'
  session.onReopen = mock(async () => {})
  render(<TaskGuidePanel session={session} />)
  fireEvent.click(screen.getByRole('button', { name: 'Quero mexer de novo' }))
  await waitFor(() => expect(session.onReopen).toHaveBeenCalledTimes(1))
  expect(screen.getByText('Você reconhece a nave.')).toBeTruthy()
  expect(screen.queryByText(/Passo 1 de|Próximo passo/)).toBeNull()
})
test('o topo âmbar recolhe a missão e o trilho a abre de novo', () => {
  const onCollapsedChange = mock()
  const session = {
    ...missionSessionFixture(),
    order: { index: 4, total: 9 },
    onCollapsedChange,
  }
  const { rerender } = render(<TaskGuidePanel session={session} />)
  const head = screen.getByRole('button', { name: /Desenhar a nave/ })
  expect(head.getAttribute('aria-expanded')).toBe('true')
  expect(screen.getByText(/Pensa · Bosque · missão 4 de 9/)).toBeTruthy()
  fireEvent.click(head)
  expect(onCollapsedChange).toHaveBeenLastCalledWith(true)

  rerender(<TaskGuidePanel session={{ ...session, collapsed: true }} />)
  const rail = screen.getByRole('button', { name: /Ver missão · Desenhar a nave/ })
  expect(rail.getAttribute('aria-expanded')).toBe('false')
  expect(screen.queryByRole('button', { name: 'Conferi e está pronto' })).toBeNull()
  fireEvent.click(rail)
  expect(onCollapsedChange).toHaveBeenLastCalledWith(false)
})

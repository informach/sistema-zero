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
test('recolher e abrir não perde o foco: o topo e o trilho são o MESMO botão', () => {
  const session = missionSessionFixture()
  const { rerender } = render(<TaskGuidePanel session={session} />)
  const head = screen.getByRole('button', { name: /Desenhar a nave/ })
  head.focus()
  expect(document.activeElement).toBe(head)
  rerender(<TaskGuidePanel session={{ ...session, collapsed: true }} />)
  const rail = screen.getByRole('button', { name: /Ver missão · Desenhar a nave/ })
  // O nó sobreviveu à troca (é ele que segura o foco), e o foco continua nele.
  expect(rail === head).toBe(true)
  expect(document.activeElement === rail).toBe(true)
  rerender(<TaskGuidePanel session={{ ...session, collapsed: false }} />)
  expect(document.activeElement === head).toBe(true)
  expect(head.getAttribute('aria-expanded')).toBe('true')
})
test('concluir leva o foco ao recado de missão pronta, mesmo que o host responda depois', async () => {
  let finish: () => void = () => {}
  const session = {
    ...missionSessionFixture(),
    nextMission: { title: 'Faça a nave voar', destination: 'studio' as const },
    onComplete: () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  }
  const { rerender } = render(<TaskGuidePanel session={session} />)
  const conferir = screen.getByRole('button', { name: 'Conferi e está pronto' })
  conferir.focus()
  fireEvent.click(conferir)
  finish()
  await waitFor(() => expect(conferir.getAttribute('aria-busy')).toBe('false'))
  // O host aplica a resposta do servidor só agora: o botão sai e o foco não cai no corpo.
  rerender(
    <TaskGuidePanel
      session={{ ...session, progress: { ...session.progress, status: 'completed' } }}
    />,
  )
  const pronto = screen.getByText(/Missão pronta\. A próxima é Faça a nave voar, no Estúdio\./)
  await waitFor(() => expect(document.activeElement === pronto.closest('p')).toBe(true))
})
test('abrir pela linha recolhida traz a faixa para a vista; montar aberto não rola nada', () => {
  const calls: unknown[] = []
  const original = Element.prototype.scrollIntoView
  Element.prototype.scrollIntoView = function (this: Element, arg?: unknown) {
    if (this.matches('aside[aria-label="Missão do Pensa"]')) calls.push(arg)
  } as typeof Element.prototype.scrollIntoView
  try {
    const session = { ...missionSessionFixture(), collapsed: true }
    const onCollapsedChange = mock()
    const { rerender } = render(<TaskGuidePanel session={{ ...session, onCollapsedChange }} />)
    expect(calls).toEqual([])
    fireEvent.click(screen.getByRole('button', { name: /Ver missão · Desenhar a nave/ }))
    expect(onCollapsedChange).toHaveBeenLastCalledWith(false)
    rerender(<TaskGuidePanel session={{ ...session, collapsed: false, onCollapsedChange }} />)
    expect(calls).toEqual([{ block: 'nearest' }])
    // Recolher não rola.
    fireEvent.click(screen.getByRole('button', { name: /Desenhar a nave/ }))
    rerender(<TaskGuidePanel session={{ ...session, collapsed: true, onCollapsedChange }} />)
    expect(calls).toHaveLength(1)
  } finally {
    Element.prototype.scrollIntoView = original
  }
})

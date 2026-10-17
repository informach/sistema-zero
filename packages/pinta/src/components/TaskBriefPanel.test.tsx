import { expect, mock, test } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { missionSessionFixture } from '../../../ui/tests/mission-fixture'
import { TaskBriefPanel } from './TaskBriefPanel'

test('a criação de arte é conferida sem exigir importação no Estúdio', async () => {
  const session = missionSessionFixture()
  session.onComplete = mock(async () => {})
  render(<TaskBriefPanel session={session} outputMissing={false} currentCreationId="nave" />)
  expect(screen.queryByRole('checkbox')).toBeNull()
  expect(screen.queryByText(/Próximo passo|Blocos úteis/)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Conferi e está pronto' }))
  await waitFor(() => expect(session.onComplete).toHaveBeenCalledTimes(1))
})
test('o desenho aberto pode ser associado ao slot escolhido sem concluir a missão', async () => {
  const session = missionSessionFixture()
  session.onBindCreation = mock(async () => {})
  session.onComplete = mock(async () => {})
  render(<TaskBriefPanel session={session} outputMissing={false} currentCreationId="nave" />)
  fireEvent.click(screen.getByRole('button', { name: 'Usar o desenho aberto nesta parte' }))
  await waitFor(() =>
    expect(session.onBindCreation).toHaveBeenCalledWith({
      assetSlotId: session.assetSlots[0]!.id,
      creationId: 'nave',
    }),
  )
  expect(session.onComplete).not.toHaveBeenCalled()
})
test('uma falha de salvamento conserva o erro visível com a missão recolhida', async () => {
  const session = missionSessionFixture()
  session.onComplete = async () => {
    throw Object.assign(new Error('disk'), {
      childMessage: 'Não consegui guardar seu desenho neste aparelho.',
    })
  }
  const { rerender } = render(
    <TaskBriefPanel session={session} outputMissing={false} currentCreationId="nave" />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Conferi e está pronto' }))
  await screen.findByRole('alert')
  rerender(
    <TaskBriefPanel
      session={{ ...session, collapsed: true }}
      outputMissing={false}
      currentCreationId="nave"
    />,
  )
  expect(screen.getByRole('alert').textContent).toContain('Não consegui guardar seu desenho')
})

test('um desenho ausente continua recuperável com a missão recolhida', () => {
  const session = { ...missionSessionFixture(), collapsed: true }
  const onRelink = mock()
  render(
    <TaskBriefPanel
      session={session}
      outputMissing
      currentCreationId={null}
      onRelink={onRelink}
      onRecreate={mock()}
    />,
  )
  expect(screen.getByText(/Este desenho não está neste aparelho/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Escolher desenho' }))
  expect(onRelink).toHaveBeenCalledTimes(1)
})

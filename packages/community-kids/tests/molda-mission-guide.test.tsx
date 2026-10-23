import { expect, mock, test } from 'bun:test'
import { createModelAsset } from '@sistemazero/molda/assets'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { missionSessionFixture } from '../../ui/tests/mission-fixture'
import { MoldaMissionGuide } from '../src/components/kids/molda-mission-guide'

test('vincula um modelo guardado ao slot correto sem marcar a missão pronta', async () => {
  const asset = createModelAsset({ name: 'Rocha guardada' })
  const session = missionSessionFixture()
  if (session.mission.kind !== 'asset' || !session.assetSlots[0])
    throw new Error('Expected asset fixture')
  session.mission.destination = 'molda'
  session.assetSlots[0].kind = 'model'
  session.onBindCreation = mock(async () => {})
  session.onComplete = mock(async () => {})
  render(
    <MoldaMissionGuide
      session={session}
      persistence={{ load: async () => asset, loadAll: async () => [asset] }}
      onOpenAsset={() => {}}
      hasOpenCreation={async () => false}
    />,
  )
  await screen.findByRole('option', { name: 'Rocha guardada' })
  fireEvent.change(screen.getByRole('combobox'), { target: { value: asset.id } })
  await waitFor(() =>
    expect(session.onBindCreation).toHaveBeenCalledWith({
      assetSlotId: session.assetSlots[0]!.id,
      creationId: asset.id,
    }),
  )
  expect(session.onComplete).not.toHaveBeenCalled()
})
test('uma criação ainda aberta precisa ser guardada antes da conferência', async () => {
  const session = missionSessionFixture()
  session.onComplete = mock(async () => {})
  render(
    <MoldaMissionGuide
      session={session}
      persistence={{ load: async () => null, loadAll: async () => [] }}
      onOpenAsset={() => {}}
      hasOpenCreation={async () => true}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Conferi e está pronto' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Guarde e feche a criação')
  expect(session.onComplete).not.toHaveBeenCalled()
})

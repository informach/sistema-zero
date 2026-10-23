import { afterEach, expect, test } from 'bun:test'
import type { LiveRoomView } from '@sistemazero/core/live'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { LiveParticipants } from '../../member-shell/src/components/live/live-participants'

afterEach(cleanup)
test('eight children have one primary action, ordered requests and individual moderation menus', () => {
  const now = new Date().toISOString()
  const participants = Array.from({ length: 8 }, (_, i) => ({
    learnerId: `child-${i}`,
    displayName: `Criador ${i}`,
    deviceId: `device-${i}`,
    admission: 'admitted',
    joinedAt: now,
    seenAt: now,
    handAt: i === 0 ? now : null,
    helpAt: i === 7 ? now : null,
    microphoneLocked: false,
    cameraLocked: false,
    turnGranted: false,
    muteEpoch: 0,
    activity: { stepId: 'scene', saveState: i === 7 ? 'saving' : 'saved', reportedAt: now },
  }))
  const room = {
    serverTime: now,
    plan: { steps: [{ id: 'scene', title: 'Criar o cenário' }] },
    occurrence: { participants },
  } as unknown as LiveRoomView
  const observed: string[] = [],
    commands: unknown[] = []
  render(
    <LiveParticipants
      room={room}
      disabled={false}
      onObserve={(id) => observed.push(id)}
      onControl={async (command) => {
        commands.push(command)
        return true
      }}
    />,
  )
  const cards = screen.getAllByRole('article')
  expect(cards).toHaveLength(8)
  expect(within(cards[0]!).getByRole('heading').textContent).toContain('Criador 7')
  fireEvent.click(within(cards[0]!).getByRole('button', { name: 'Acompanhar pedido de ajuda' }))
  expect(observed).toEqual(['child-7'])
  expect(screen.getAllByText('Criar o cenário')).toHaveLength(8)
  const menu = within(cards[0]!).getByText('Controles de Criador 7').closest('details')!
  menu.open = true
  fireEvent.click(within(menu).getByRole('button', { name: 'Silenciar' }))
  expect(commands).toEqual([{ kind: 'mute', learnerId: 'child-7' }])
})

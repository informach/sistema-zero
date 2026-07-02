import { describe, expect, it } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import { getCopy } from '../../core/copy'
import type { PensaGamificationDelta } from '../../core/gamification'
import { createProjectStore } from '../../state/projectStore'
import { createFakeTransport, makeStudioAdapter } from '../../testing/fakeTransport'
import { PensaAppProvider } from '../appContext'
import { LaunchCelebration } from './LaunchCelebration'

function renderCelebration(
  props: {
    cycleNumber?: number
    ideaText?: string | null
    gamification?: PensaGamificationDelta | null
    onClose?: () => void
  } = {},
) {
  const transport = createFakeTransport(() => {
    throw new Error('rota inesperada')
  })
  return render(
    <PensaAppProvider
      value={{
        adapter: makeStudioAdapter(transport),
        copy: getCopy('kids'),
        store: createProjectStore(transport),
      }}
    >
      <LaunchCelebration
        cycleNumber={props.cycleNumber ?? 2}
        projectName="Dino Turbo"
        ideaText={props.ideaText ?? null}
        gamification={props.gamification ?? null}
        onClose={props.onClose ?? (() => {})}
      />
    </PensaAppProvider>,
  )
}

describe('LaunchCelebration', () => {
  it('selo "Versão N lançada" sobre a carta + delta de XP + conquista genérica', () => {
    let closed = 0
    renderCelebration({
      ideaText: 'Um jogo em que o Dino desvia de meteoros.',
      gamification: {
        xpAwarded: 30,
        badgesUnlocked: [{ slug: 'pensa-first-launch', unlockedAt: '2026-07-01T10:00:00.000Z' }],
      },
      onClose: () => {
        closed += 1
      },
    })

    expect(screen.getByRole('dialog', { name: 'Você lançou seu jogo!' })).toBeTruthy()
    const stamp = screen.getByText('Versão 2 lançada')
    expect(stamp.className).toContain('pz-launch-stamp')
    expect(screen.getByText('Um jogo em que o Dino desvia de meteoros.')).toBeTruthy()
    expect(screen.getByText('+30 XP')).toBeTruthy()
    // Badges são apresentadas pelo HOST: aqui só a frase genérica.
    expect(screen.getByText('Nova conquista desbloqueada!')).toBeTruthy()
    expect(screen.queryByText('pensa-first-launch')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Ver meu projeto' }))
    expect(closed).toBe(1)
  })

  it('sem carta usa o nome do projeto; sem delta não mostra XP nem conquista', () => {
    renderCelebration()

    expect(screen.getByText('Dino Turbo')).toBeTruthy()
    expect(screen.queryByText(/XP/)).toBeNull()
    expect(screen.queryByText('Nova conquista desbloqueada!')).toBeNull()
  })
})

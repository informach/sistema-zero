import { describe, expect, it } from 'bun:test'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { ChildGuide } from '../src/components/kids/child-guide'
import { ContinueHeroLink } from '../src/components/kids/continue-hero-link'
import { childGuideWelcomeSeenKey, writeGuideFlag } from '../src/lib/guide'

describe('associação semântica do guia com o Começar', () => {
  it('só aplica aria-describedby enquanto o balão correspondente está montado', async () => {
    const profileKey = 'aria-profile'
    writeGuideFlag(childGuideWelcomeSeenKey(profileKey))
    const view = render(
      <ChildGuide
        profileKey={profileKey}
        childName="Lia"
        hasAvatar
        hasCourseActivity={false}
        startAvailable
      >
        <ContinueHeroLink href="/cursos/jogo" started={false} />
      </ChildGuide>,
    )

    const start = view.getByRole('link', { name: 'Começar' })
    await waitFor(() => expect(start.getAttribute('aria-describedby')).toBe('child-start-guide'))
    expect(document.getElementById('child-start-guide')).not.toBeNull()

    fireEvent.click(view.getByRole('button', { name: 'Entendi!' }))
    await waitFor(() => expect(start.getAttribute('aria-describedby')).toBeNull())
    expect(document.getElementById('child-start-guide')).toBeNull()
  })
})

describe('o balão da home não encosta no herói', () => {
  // Relato dela (12/10/2026): o convite do avatar colava no cartão do Desafio logo abaixo.
  for (const [passo, hasAvatar, id] of [
    ['avatar', false, 'child-avatar-guide'],
    ['start', true, 'child-start-guide'],
  ] as const) {
    it(`o balão "${passo}" tem a margem de baixo do cabeçalho`, async () => {
      const profileKey = `spacing-${passo}`
      writeGuideFlag(childGuideWelcomeSeenKey(profileKey))
      render(
        <ChildGuide
          profileKey={profileKey}
          childName="Lia"
          hasAvatar={hasAvatar}
          hasCourseActivity={false}
          startAvailable
        >
          <ContinueHeroLink href="/cursos/jogo" started={false} />
        </ChildGuide>,
      )
      await waitFor(() => expect(document.getElementById(id)).not.toBeNull())
      const balao = document.getElementById(id)?.closest('[role="status"]')
      expect(balao?.className.split(' ')).toEqual(expect.arrayContaining(['mb-6', 'md:mb-7']))
    })
  }
})

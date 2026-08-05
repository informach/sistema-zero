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

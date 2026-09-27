import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CelebrationWatcher } from '../src/components/kids/celebration-watcher'
import { ChildGuide } from '../src/components/kids/child-guide'
import { PlatformRenovationNotice } from '../src/components/kids/platform-renovation-notice'
import {
  endRenovationVisits,
  isRenovationDismissed,
  RENOVATION_CAMPAIGN,
  startRenovationVisit,
} from '../src/lib/platform-renovation-visit'

function notice(profileId: string | null = 'child-a', enabled = true) {
  return (
    <PlatformRenovationNotice enabled={enabled} profileId={profileId}>
      <main>Aula</main>
    </PlatformRenovationNotice>
  )
}

beforeEach(endRenovationVisits)
afterEach(() => {
  cleanup()
  endRenovationVisits()
})

describe('aviso temporário por visita da criança', () => {
  it('só aparece com a campanha ligada e um perfil selecionado', () => {
    const view = render(notice(null))
    expect(screen.queryByRole('dialog')).toBeNull()
    view.rerender(notice('child-a', false))
    expect(screen.queryByRole('dialog')).toBeNull()
    view.rerender(notice())
    expect(screen.getByRole('dialog', { name: 'Tem novidade por aqui!' })).toBeTruthy()
  })

  it('o X fecha e a navegação e remontagem preservam a dispensa', () => {
    const view = render(notice())
    fireEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    view.rerender(notice())
    expect(screen.queryByRole('dialog')).toBeNull()
    view.unmount()
    render(notice())
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText('Aula')).toBeTruthy()
  })

  it('usa a dispensa salva pela mesma aba e não grava uma preferência permanente', () => {
    sessionStorage.setItem(`sz:kids:notice:${RENOVATION_CAMPAIGN}:restored-child`, 'dismissed')
    render(notice('restored-child'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(localStorage.getItem(`sz:kids:notice:${RENOVATION_CAMPAIGN}:restored-child`)).toBeNull()
  })

  it('cada criança vê seu aviso e selecionar novamente inicia outra visita', () => {
    const view = render(notice())
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    view.rerender(notice('child-b'))
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    view.unmount()
    startRenovationVisit('child-a')
    render(notice())
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(isRenovationDismissed('child-b')).toBe(true)
  })

  it('sair limpa as visitas sem apagar outros dados da aba', () => {
    sessionStorage.setItem('unrelated-setting', 'keep')
    const view = render(notice())
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    view.unmount()
    endRenovationVisits()
    render(notice())
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(sessionStorage.getItem('unrelated-setting')).toBe('keep')
  })

  it('continua dispensável quando o navegador bloqueia o armazenamento', () => {
    const read = spyOn(sessionStorage, 'getItem').mockImplementation(() => {
      throw new Error('Denied')
    })
    const write = spyOn(sessionStorage, 'setItem').mockImplementation(() => {
      throw new Error('Denied')
    })
    try {
      const view = render(notice())
      fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
      view.unmount()
      render(notice())
      expect(screen.queryByRole('dialog')).toBeNull()
    } finally {
      read.mockRestore()
      write.mockRestore()
    }
  })

  it('oferece ajuda sem impedir continuar a aula', () => {
    render(notice())
    const link = screen.getByRole('link', { name: 'Conhecer o Como fazer' })
    expect(link.getAttribute('href')).toBe('/como-fazer')
    // Testa a dispensa; a navegação é responsabilidade do Link do Next.
    link.addEventListener('click', (event) => event.preventDefault(), { once: true })
    fireEvent.click(link)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(isRenovationDismissed('child-a')).toBe(true)
  })

  it('mostra aviso, guia e conquista em sequência, sem sobrepor nem perder a conquista', async () => {
    localStorage.clear()
    localStorage.setItem('sz:kids:level:overlay-child', 'coder')
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 }),
    )
    try {
      render(
        <PlatformRenovationNotice enabled profileId="overlay-child">
          <ChildGuide
            profileKey="overlay-child"
            childName="Ana"
            hasAvatar={false}
            hasCourseActivity={false}
            startAvailable
          />
          <CelebrationWatcher
            levelSlug="hacker"
            toolsRevision={null}
            ownsStudio={false}
            profileKey="overlay-child"
          />
        </PlatformRenovationNotice>,
      )
      expect(screen.getAllByRole('dialog')).toHaveLength(1)
      expect(screen.getByRole('dialog').getAttribute('aria-label')).toBe('Tem novidade por aqui!')
      expect(localStorage.getItem('sz:kids:level:overlay-child')).toBe('coder')
      fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
      await screen.findByRole('button', { name: /Vamos lá/ })
      await waitFor(() =>
        expect(localStorage.getItem('sz:kids:level:overlay-child')).toBe('hacker'),
      )
      expect(screen.getAllByRole('dialog')).toHaveLength(1)
      fireEvent.click(screen.getByRole('button', { name: /Vamos lá/ }))
      await waitFor(() =>
        expect(screen.getByRole('dialog').getAttribute('aria-label')).toContain('Inventor'),
      )
      expect(screen.getAllByRole('dialog')).toHaveLength(1)
    } finally {
      fetchSpy.mockRestore()
      localStorage.clear()
    }
  })
})

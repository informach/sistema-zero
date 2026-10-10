import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { UserMenu } from '../src/components/kids/user-menu'
import type { SessionUserWithAvatar } from '../src/lib/types'

/**
 * O "Sair deste aparelho?" vai ao `<body>` por portal (10/10/2026). Montado dentro do menu, o
 * diálogo herdava o empilhamento da barra lateral (ou da de cima) e ficava POR BAIXO do rodapé
 * fixo da aula: a criança via os botões da fase por cima da pergunta.
 */

const aluno: SessionUserWithAvatar = {
  id: '11111111-1111-4111-8111-111111111111',
  email: '',
  firstName: '',
  lastName: '',
  role: 'customer',
  status: 'active',
  avatarUrl: null,
  activeProfile: { accountId: '22222222-2222-4222-8222-222222222222', name: 'André' },
  kids: {
    kind: 'student',
    sessionId: 'sessao-1',
  } as SessionUserWithAvatar['kids'],
}

afterEach(cleanup)

describe('sair deste aparelho', () => {
  test('o diálogo nasce no <body>, fora do contexto de empilhamento do menu', () => {
    const { container } = render(
      // A barra do menu cria um contexto de empilhamento (como a lateral e a de cima).
      <div style={{ position: 'relative', zIndex: 1, transform: 'translateZ(0)' }}>
        <UserMenu user={aluno} />
      </div>,
    )
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Conta' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))
    const dialog = screen.getByRole('dialog', { name: 'Sair deste aparelho?' })
    expect(container.contains(dialog)).toBe(false)
    const overlay = dialog.closest('.sz-overlay')
    expect(overlay?.parentElement).toBe(document.body)
    fireEvent.click(screen.getByRole('button', { name: 'Continuar aqui' }))
    expect(screen.queryByRole('dialog', { name: 'Sair deste aparelho?' })).toBeNull()
  })
})

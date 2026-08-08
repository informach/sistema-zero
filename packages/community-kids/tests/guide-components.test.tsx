import { describe, expect, it, mock } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import {
  GuideBalloon,
  GuideTargetItem,
  GuideWelcomeDialog,
  ParentConcludeTarget,
} from '../src/components/kids/parent-guide'
import { ProfileForm } from '../src/components/kids/profile-management'
import { childWelcomeSteps } from '../src/lib/guide'

describe('GuideWelcomeDialog — conteúdo infantil integrado ao modal real', () => {
  it('quem já fez aulas e só não tem avatar não recebe instrução de primeira aula', () => {
    const onClose = mock(() => {})
    render(
      <GuideWelcomeDialog
        open
        onClose={onClose}
        title="Oi, Ana! Eu sou o Zappy! 👋"
        description="Vem ver como tudo funciona por aqui:"
        steps={childWelcomeSteps({
          hasAvatar: false,
          hasCourseActivity: true,
          startAvailable: true,
        })}
      />,
    )

    expect(screen.getByText(/Monte o seu avatar/)).toBeTruthy()
    expect(screen.queryByText(/primeira aula/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Vamos lá/ }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('nome longo continua inteiro e o título pode quebrar dentro do modal', () => {
    const longName = 'A'.repeat(60)
    render(
      <GuideWelcomeDialog
        open
        onClose={() => {}}
        title={`Oi, ${longName}! Eu sou o Zappy! 👋`}
        description="Vem ver como tudo funciona por aqui:"
        steps={childWelcomeSteps({
          hasAvatar: false,
          hasCourseActivity: true,
          startAvailable: false,
        })}
      />,
    )

    const heading = screen.getByRole('heading', { name: new RegExp(longName) })
    expect(heading.className).toContain('break-words')
  })
})

describe('alvos do guia dos pais — copy, clique e layout', () => {
  it('perfil existente recebe orientação neutra e o Concluir continua acionável', () => {
    const onConclude = mock(() => {})
    render(<ParentConcludeTarget created={false} busy={false} onConclude={onConclude} />)

    expect(screen.getByText(/toque em/i).textContent).not.toContain('Perfil criado!')
    fireEvent.click(screen.getByRole('button', { name: 'Concluir' }))
    expect(onConclude).toHaveBeenCalledTimes(1)
  })

  it('só celebra a criação quando ela aconteceu durante o guia', () => {
    render(<ParentConcludeTarget created busy={false} onConclude={() => {}} />)
    expect(screen.getByText(/Perfil criado!/)).toBeTruthy()
  })

  it('o balão não aumenta a largura-base do tile na grade', () => {
    const { container } = render(
      <ul className="flex">
        <GuideTargetItem>
          <button type="button">Ana</button>
          <span>Um balão deliberadamente mais largo que o alvo</span>
        </GuideTargetItem>
        <GuideTargetItem>
          <button type="button">Bia</button>
        </GuideTargetItem>
      </ul>,
    )

    const items = [...container.querySelectorAll('li')]
    expect(items).toHaveLength(2)
    expect(items.every((item) => item.className.includes('w-28'))).toBe(true)
  })

  it('o balão de alvo estreito fica preso à viewport no mobile', () => {
    render(<GuideBalloon mobileFloating>Instrução responsiva</GuideBalloon>)
    const balloon = screen.getByRole('status')
    expect(balloon.className).toContain('max-sm:fixed')
    expect(balloon.className).toContain('max-sm:inset-x-4')
  })
})

describe('formulário do primeiro perfil', () => {
  it('é um form semântico e salva pelo submit do teclado', () => {
    const onSave = mock(() => {})
    const { container } = render(
      <ProfileForm
        editing={{ mode: 'create' }}
        busy={false}
        onCancel={() => {}}
        onSave={onSave}
        onArchive={() => {}}
      />,
    )

    fireEvent.change(screen.getByLabelText('Nome do perfil'), { target: { value: 'Sofia' } })
    const form = container.querySelector('form')
    expect(form).not.toBeNull()
    if (!form) throw new Error('form semântico não renderizado')
    fireEvent.submit(form)
    expect(onSave).toHaveBeenCalledWith('Sofia', null, false, undefined)
  })
})

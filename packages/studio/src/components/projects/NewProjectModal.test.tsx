import { afterEach, describe, expect, it } from 'bun:test'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { PythonProjectCreationEnvironment } from '../../core/freeProjectOptions'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { NewProjectModal } from './NewProjectModal'

// O modal é portalado — queries via `screen` (document.body).
function nameInput(): HTMLInputElement {
  return screen.getByRole('textbox') as HTMLInputElement
}

const noop = () => undefined

it('JavaScript remains default; Python selects an exact environment and its own Pro starter', async () => {
  const fixture = await pythonEnvironmentFixture('classic')
  const environments: PythonProjectCreationEnvironment[] = (['classic', 'pro'] as const).map(
    (kind) => ({
      kind,
      key: fixture.project.runtime.manifestSha256,
      label: 'Python',
      context: {
        catalog: fixture.environment.catalog,
        runtime: fixture.project.runtime,
        releaseStatus: 'active',
      },
    }),
  )
  const creations: unknown[] = []
  const props = {
    open: true,
    defaultName: 'Meu Python',
    onClose: noop,
    professionalAvailable: true,
    onCreate: (_name: string, options?: unknown) => {
      creations.push(options)
    },
  }
  const view = render(<NewProjectModal {...props} pythonEnvironments={environments} />)
  expect(
    (screen.getByRole('radio', { name: 'JavaScript (padrão)' }) as HTMLInputElement).checked,
  ).toBe(true)
  await act(async () => fireEvent.click(screen.getByText('Criar e abrir')))
  expect(creations).toEqual([undefined])
  fireEvent.click(screen.getByRole('radio', { name: /^Python$/ }))
  await act(async () => fireEvent.click(screen.getByText('Criar e abrir')))
  expect(creations[1]).toEqual({
    programmingLanguage: 'python',
    kind: 'classic',
    environmentKey: environments[0]!.key,
  })
  fireEvent.click(screen.getByRole('radio', { name: /Pro \(código\)/ }))
  expect(screen.queryByText('Escolha um ponto de partida')).toBeNull()
  await act(async () => fireEvent.click(screen.getByText('Criar e abrir')))
  expect(creations[2]).toEqual({
    programmingLanguage: 'python',
    kind: 'pro',
    environmentKey: environments[1]!.key,
  })
  view.rerender(<NewProjectModal {...props} pythonEnvironments={[]} />)
  expect(nameInput().value).toBe('Meu Python')
  expect((screen.getByText('Criar e abrir') as HTMLButtonElement).disabled).toBe(true)
  await act(async () => fireEvent.keyDown(nameInput(), { key: 'Enter' }))
  expect(creations.length).toBe(3)
  view.unmount()
})

it('Python discovery can be retried inside the dialog while preserving the chosen name', async () => {
  let retries = 0
  const props = { open: true, defaultName: 'Meu jogo', onClose: noop, onCreate: noop }
  const retry = () => {
    retries++
  }
  const view = render(
    <NewProjectModal
      {...props}
      pythonDiscovery={{
        loading: false,
        unavailable: false,
        error: 'Não foi possível consultar Python.',
        retry,
      }}
    />,
  )
  fireEvent.change(nameInput(), { target: { value: 'Nome inventado' } })
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(retries).toBe(1)
  view.rerender(
    <NewProjectModal {...props} pythonDiscovery={{ loading: true, unavailable: false, retry }} />,
  )
  expect(nameInput().value).toBe('Nome inventado')
  expect(screen.getByRole('status').textContent).toContain('Consultando')
  const fixture = await pythonEnvironmentFixture('classic')
  view.rerender(
    <NewProjectModal
      {...props}
      pythonDiscovery={{ loading: false, unavailable: false, retry }}
      pythonEnvironments={[
        {
          key: fixture.project.runtime.manifestSha256,
          label: 'Python',
          kind: 'classic',
          context: {
            catalog: fixture.environment.catalog,
            runtime: fixture.project.runtime,
            releaseStatus: 'active',
          },
        },
      ]}
    />,
  )
  expect(nameInput().value).toBe('Nome inventado')
  expect(screen.getByRole('radio', { name: /^Python$/ })).toBeTruthy()
  view.unmount()
})

describe('NewProjectModal — nome do projeto', () => {
  afterEach(() => {
    cleanup()
  })

  // BUG (07/2026): `templates` (default `[]`) e `defaultName` eram refs novas a
  // cada render do pai e estavam nas deps do reset — o efeito re-disparava e
  // devolvia o campo ao padrão enquanto a criança digitava. O reset agora só
  // acontece na transição fechado→aberto.
  it('preserva a digitação quando o pai re-renderiza com refs novas', () => {
    const { rerender } = render(
      <NewProjectModal open defaultName="Meu projeto 2" onClose={noop} onCreate={noop} />,
    )

    act(() => {
      fireEvent.change(nameInput(), { target: { value: 'Nave do Zappy' } })
    })
    expect(nameInput().value).toBe('Nave do Zappy')

    // Pai re-renderiza (lista recarregada): defaultName novo + templates ref nova.
    rerender(
      <NewProjectModal
        open
        defaultName="Meu projeto 3"
        onClose={noop}
        onCreate={noop}
        templates={[]}
      />,
    )
    expect(nameInput().value).toBe('Nave do Zappy')
  })

  it('nome duplicado mostra aviso e desabilita o Criar (inclusive via Enter)', () => {
    let created = ''
    render(
      <NewProjectModal
        open
        defaultName="Meu projeto 2"
        onClose={noop}
        onCreate={(name) => {
          created = name
        }}
        existingNames={['Nave do Zappy', 'Meu projeto']}
      />,
    )

    act(() => {
      fireEvent.change(nameInput(), { target: { value: 'Nave do Zappy' } })
    })
    expect(screen.getByRole('status').textContent).toContain('Já existe um projeto')

    const create = screen.getByText('Criar e abrir') as HTMLButtonElement
    expect(create.disabled).toBe(true)

    // Enter no input chama submit() direto — o guard interno também segura.
    act(() => {
      fireEvent.keyDown(nameInput(), { key: 'Enter' })
    })
    expect(created).toBe('')

    // Corrigindo o nome, o aviso some e o Criar volta.
    act(() => {
      fireEvent.change(nameInput(), { target: { value: 'Nave do Zappy 2' } })
    })
    expect(screen.queryByRole('status')).toBeNull()
    expect(create.disabled).toBe(false)
  })

  it('reabrir o modal reseta para o nome padrão atual', () => {
    const { rerender } = render(
      <NewProjectModal open defaultName="Meu projeto 2" onClose={noop} onCreate={noop} />,
    )
    act(() => {
      fireEvent.change(nameInput(), { target: { value: 'Rascunho' } })
    })

    rerender(
      <NewProjectModal open={false} defaultName="Meu projeto 2" onClose={noop} onCreate={noop} />,
    )
    rerender(<NewProjectModal open defaultName="Meu projeto 5" onClose={noop} onCreate={noop} />)

    expect(nameInput().value).toBe('Meu projeto 5')
  })
  it('falha ao carregar um kit mantém nome e escolha para tentar novamente', async () => {
    let attempts = 0
    render(
      <NewProjectModal
        open
        defaultName="Meu jogo"
        onClose={noop}
        onCreate={async () => {
          if (++attempts === 1) throw new Error('chunk offline')
        }}
      />,
    )
    await act(async () => {
      fireEvent.click(screen.getByText('Criar e abrir'))
    })
    expect(screen.getByRole('alert').textContent).toContain('tente novamente')
    expect(nameInput().value).toBe('Meu jogo')
    await act(async () => {
      fireEvent.click(screen.getByText('Criar e abrir'))
    })
    expect(attempts).toBe(2)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

it('revoking a selected template preserves the name, explains the change and rejects Enter', async () => {
  const kit = {
    id: 'canvas-survival',
    name: 'Arena',
    description: '2D',
    devScript: 'dev',
    engine: 'canvas',
  } as const
  let creations = 0
  const props = {
    open: true,
    defaultName: 'Minha arena',
    professionalAvailable: true,
    onClose: noop,
    onCreate: () => {
      creations++
    },
  }
  const view = render(<NewProjectModal {...props} templates={[kit]} />)
  fireEvent.click(screen.getByRole('radio', { name: /Pro \(código\)/ }))
  view.rerender(<NewProjectModal {...props} templates={[]} />)
  expect(nameInput().value).toBe('Minha arena')
  expect(screen.getByRole('status').textContent).toContain('deixou de estar disponível')
  expect((screen.getByText('Criar e abrir') as HTMLButtonElement).disabled).toBe(true)
  await act(async () => fireEvent.keyDown(nameInput(), { key: 'Enter' }))
  expect(creations).toBe(0)
  view.unmount()
})

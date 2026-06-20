import { afterAll, afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createEmptyProject } from '#core'
import { useProjectStore } from '../../state/projectStore'
import type { StudioShareAdapter } from '../../studio/share'

// bun:test NÃO isola module mocks por arquivo — captura o real ANTES e restaura
// no afterAll (ver BottomPanel.test.tsx). Mockar a captura evita o timeout de
// ~5.5s do iframe oculto sob happy-dom (que nunca executa o script).
const realCover = { ...(await import('../../cover/coverCapture')) }
mock.module('../../cover/coverCapture', () => ({
  captureCoverFromProject: async () => 'data:image/png;base64,FAKECOVER',
}))

afterAll(() => {
  mock.module('../../cover/coverCapture', () => realCover)
})

const { ShareDialog } = await import('./ShareDialog')

function seedProject(): void {
  useProjectStore.setState({
    project: createEmptyProject('p1', 'Meu Jogo'),
    isDirty: false,
    saveError: null,
  })
}

function makeAdapter(): StudioShareAdapter {
  return {
    generateDescription: mock(async () => 'Um jogo de nave que desvia de asteroides.'),
    publish: mock(async () => ({ muralUrl: '/mural?thread=1', playUrl: '/jogar/abc' })),
  }
}

describe('ShareDialog', () => {
  afterEach(() => {
    cleanup()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  it('não renderiza nada quando o adapter é null', () => {
    seedProject()
    render(<ShareDialog open onClose={() => {}} adapter={null} />)
    expect(document.body.querySelector('dialog')).toBeNull()
  })

  it('o confirm exige os dois checkboxes antes de avançar', () => {
    seedProject()
    render(<ShareDialog open onClose={() => {}} adapter={makeAdapter()} />)
    const next = screen.getByRole('button', { name: 'Avançar' }) as HTMLButtonElement
    expect(next.disabled).toBe(true)
    const checks = screen.getAllByRole('checkbox')
    for (const c of checks) fireEvent.click(c)
    expect((screen.getByRole('button', { name: 'Avançar' }) as HTMLButtonElement).disabled).toBe(
      false,
    )
  })

  it('gera a descrição via adapter e publica com print + título + descrição', async () => {
    seedProject()
    const adapter = makeAdapter()
    render(<ShareDialog open onClose={() => {}} adapter={adapter} />)

    // confirm → describe
    for (const c of screen.getAllByRole('checkbox')) fireEvent.click(c)
    fireEvent.click(screen.getByRole('button', { name: 'Avançar' }))

    // a IA preenche o textarea
    await screen.findByDisplayValue('Um jogo de nave que desvia de asteroides.')
    expect(adapter.generateDescription).toHaveBeenCalledTimes(1)

    // describe → cover (o print mockado resolve na hora)
    fireEvent.click(screen.getByRole('button', { name: 'Avançar' }))
    await waitFor(() =>
      expect((screen.getByRole('button', { name: 'Avançar' }) as HTMLButtonElement).disabled).toBe(
        false,
      ),
    )

    // cover → review
    fireEvent.click(screen.getByRole('button', { name: 'Avançar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))

    // sucesso com os links
    await screen.findByText('Ver no Mural')
    expect(screen.getByText('Abrir o jogo')).toBeTruthy()
    expect(adapter.publish).toHaveBeenCalledTimes(1)
    const arg = (adapter.publish as ReturnType<typeof mock>).mock.calls[0]?.[0]
    expect(arg?.coverDataUrl).toBe('data:image/png;base64,FAKECOVER')
    expect(arg?.title).toBe('Meu Jogo')
    expect(arg?.description).toBe('Um jogo de nave que desvia de asteroides.')
  })
})

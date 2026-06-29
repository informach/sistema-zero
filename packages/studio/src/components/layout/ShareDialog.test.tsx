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

function makeAdapter(over: Partial<StudioShareAdapter> = {}): StudioShareAdapter {
  return {
    generateDescription: mock(async () => 'Um jogo de nave que desvia de asteroides.'),
    publish: mock(async () => ({ muralUrl: '/mural?thread=1', playUrl: '/jogar/abc' })),
    ...over,
  }
}

const pubArg = (adapter: StudioShareAdapter) =>
  (adapter.publish as ReturnType<typeof mock>).mock.calls[0]?.[0]

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

  it('Publicar fica desabilitado até ter título + resumo + capa', async () => {
    seedProject()
    render(<ShareDialog open onClose={() => {}} adapter={makeAdapter()} />)

    // título já vem do nome do projeto; o resumo é preenchido pela IA na abertura.
    await screen.findByDisplayValue('Um jogo de nave que desvia de asteroides.')
    const publish = () => screen.getByRole('button', { name: 'Publicar' }) as HTMLButtonElement
    // Falta a capa → desabilitado.
    expect(publish().disabled).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Gerar capa' }))
    await waitFor(() => expect(publish().disabled).toBe(false))
  })

  it('gera a capa pelo print e publica com coverDataUrl + título + resumo', async () => {
    seedProject()
    const adapter = makeAdapter()
    render(<ShareDialog open onClose={() => {}} adapter={adapter} />)

    await screen.findByDisplayValue('Um jogo de nave que desvia de asteroides.')
    expect(adapter.generateDescription).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Gerar capa' }))
    await waitFor(() =>
      expect((screen.getByRole('button', { name: 'Publicar' }) as HTMLButtonElement).disabled).toBe(
        false,
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))

    await screen.findByText('Ver no Mural')
    expect(adapter.publish).toHaveBeenCalledTimes(1)
    expect(pubArg(adapter)?.coverDataUrl).toBe('data:image/png;base64,FAKECOVER')
    expect(pubArg(adapter)?.useAdminCover).toBeFalsy()
    expect(pubArg(adapter)?.title).toBe('Meu Jogo')
    expect(pubArg(adapter)?.description).toBe('Um jogo de nave que desvia de asteroides.')
  })

  it('trava a IA em 3 gerações por abertura (automática + cliques)', async () => {
    seedProject()
    const adapter = makeAdapter()
    render(<ShareDialog open onClose={() => {}} adapter={adapter} />)

    // Geração automática na abertura = 1ª. O botão tem aria-label ESTÁVEL.
    await screen.findByDisplayValue('Um jogo de nave que desvia de asteroides.')
    const btn = () =>
      screen.getByRole('button', { name: 'Gerar resumo com a IA' }) as HTMLButtonElement

    await waitFor(() => expect(btn().disabled).toBe(false)) // auto-gen terminou
    fireEvent.click(btn()) // 2ª
    await waitFor(() => expect(btn().disabled).toBe(false))
    fireEvent.click(btn()) // 3ª → atinge o teto
    await waitFor(() => expect(btn().disabled).toBe(true))

    expect(adapter.generateDescription).toHaveBeenCalledTimes(3)
  })

  it('não mostra título editável quando o host usa título autoritativo', async () => {
    seedProject()
    const adapter = makeAdapter({
      titleEditable: false,
      presetDescription: 'Resumo configurado pelo professor.',
    })
    render(<ShareDialog open onClose={() => {}} adapter={adapter} />)

    expect(screen.queryByLabelText('Título')).toBeNull()
    await screen.findByDisplayValue('Resumo configurado pelo professor.')
    fireEvent.click(screen.getByRole('button', { name: 'Gerar capa' }))
    await waitFor(() =>
      expect((screen.getByRole('button', { name: 'Publicar' }) as HTMLButtonElement).disabled).toBe(
        false,
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))

    await screen.findByText('Ver no Mural')
    expect(adapter.publish).toHaveBeenCalledTimes(1)
    expect(pubArg(adapter)?.title).toBe('Meu Jogo')
  })

  it('SEM generateDescription (aula) → sem botão de IA; publica com o resumo do admin', async () => {
    seedProject()
    const adapter = makeAdapter({
      generateDescription: undefined,
      titleEditable: false,
      presetDescription: 'Resumo definido pelo professor.',
    })
    render(<ShareDialog open onClose={() => {}} adapter={adapter} />)

    await screen.findByDisplayValue('Resumo definido pelo professor.')
    // Sem IA: o botão "Gerar/Regerar" não existe e a auto-geração não roda.
    expect(screen.queryByRole('button', { name: 'Gerar resumo com a IA' })).toBeNull()
    expect(adapter.generateDescription).toBeUndefined()

    fireEvent.click(screen.getByRole('button', { name: 'Gerar capa' }))
    await waitFor(() =>
      expect((screen.getByRole('button', { name: 'Publicar' }) as HTMLButtonElement).disabled).toBe(
        false,
      ),
    )
  })

  it('usa a capa do curso (preset) → publica com useAdminCover e sem coverDataUrl', async () => {
    seedProject()
    const adapter = makeAdapter({ presetCoverUrl: 'https://cdn.example.com/capa.webp' })
    render(<ShareDialog open onClose={() => {}} adapter={adapter} />)

    await screen.findByDisplayValue('Um jogo de nave que desvia de asteroides.')
    fireEvent.click(screen.getByRole('button', { name: 'Usar a capa do curso' }))
    await waitFor(() =>
      expect((screen.getByRole('button', { name: 'Publicar' }) as HTMLButtonElement).disabled).toBe(
        false,
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))

    await screen.findByText('Ver no Mural')
    expect(pubArg(adapter)?.useAdminCover).toBe(true)
    expect(pubArg(adapter)?.coverDataUrl).toBeNull()
  })
})

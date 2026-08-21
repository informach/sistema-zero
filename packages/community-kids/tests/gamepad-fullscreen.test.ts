import { describe, expect, it, mock } from 'bun:test'
import {
  exitGamepadFullscreen,
  isDocumentFullscreen,
  requestGamepadFullscreen,
} from '../src/components/kids/gamepad-fullscreen'

describe('tela cheia do gamepad mobile', () => {
  it('solicita tela cheia na moldura que contém jogo e controles', async () => {
    const requestGamepad = mock(async () => {})

    await expect(requestGamepadFullscreen({ requestFullscreen: requestGamepad })).resolves.toBe(
      true,
    )
    expect(requestGamepad).toHaveBeenCalledTimes(1)
  })

  it('informa quando a Fullscreen API não está disponível', async () => {
    await expect(requestGamepadFullscreen(null)).resolves.toBe(false)
    await expect(requestGamepadFullscreen({})).resolves.toBe(false)
  })

  it('informa quando o navegador recusa a solicitação', async () => {
    await expect(
      requestGamepadFullscreen({
        requestFullscreen: async () => {
          throw new Error('fullscreen recusado')
        },
      }),
    ).resolves.toBe(false)
  })
})

describe('voltar da tela cheia', () => {
  it('sai quando existe alguém em tela cheia', async () => {
    const exit = mock(async () => {})
    const doc = { fullscreenElement: {} as Element, exitFullscreen: exit }

    expect(isDocumentFullscreen(doc)).toBe(true)
    await expect(exitGamepadFullscreen(doc)).resolves.toBe(true)
    expect(exit).toHaveBeenCalledTimes(1)
  })

  it('não faz nada quando já está normal', async () => {
    const exit = mock(async () => {})
    const doc = { fullscreenElement: null, exitFullscreen: exit }

    expect(isDocumentFullscreen(doc)).toBe(false)
    await expect(exitGamepadFullscreen(doc)).resolves.toBe(false)
    expect(exit).not.toHaveBeenCalled()
  })

  it('quem está em tela cheia pode ser o JOGO, e sair continua sendo o certo', () => {
    // ⚠️ A pergunta não é "é o MEU elemento": quando o jogo pede tela cheia, quem
    // fica com a tela é o <iframe>.
    const iframe = { tagName: 'IFRAME' } as unknown as Element
    expect(isDocumentFullscreen({ fullscreenElement: iframe })).toBe(true)
  })

  it('sobrevive a navegador sem a API e a recusa do navegador', async () => {
    await expect(exitGamepadFullscreen(null)).resolves.toBe(false)
    await expect(exitGamepadFullscreen({ fullscreenElement: {} as Element })).resolves.toBe(false)
    await expect(
      exitGamepadFullscreen({
        fullscreenElement: {} as Element,
        exitFullscreen: async () => {
          throw new Error('recusado')
        },
      }),
    ).resolves.toBe(false)
  })
})

import { describe, expect, it, mock } from 'bun:test'
import { requestGamepadFullscreen } from '../src/components/kids/gamepad-fullscreen'

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

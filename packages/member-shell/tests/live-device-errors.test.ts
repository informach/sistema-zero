import { describe, expect, test } from 'bun:test'
import { friendlyDeviceError } from '../src/lib/live/device-errors'

describe('erros de aparelho na língua da criança', () => {
  test('o navegador bloqueou: ensina o cadeado', () => {
    const text = friendlyDeviceError(
      new DOMException('Permission denied', 'NotAllowedError'),
      'camera',
    )
    expect(text).toContain('bloqueou a câmera')
    expect(text).toContain('cadeado')
    expect(text).not.toContain('Permission')
  })
  test('cancelar a escolha da aba não é erro de permissão', () => {
    expect(
      friendlyDeviceError(new DOMException('Permission denied', 'NotAllowedError'), 'screen'),
    ).toContain('Nenhuma aba foi escolhida')
  })
  test('aparelho ocupado por outro programa', () => {
    expect(
      friendlyDeviceError(
        new DOMException('Could not start video source', 'NotReadableError'),
        'camera',
      ),
    ).toBe('A câmera está sendo usada por outro programa. Feche o outro programa e tente de novo.')
  })
  test('navegador sem compartilhamento de tela (celular)', () => {
    expect(
      friendlyDeviceError(
        new TypeError('navigator.mediaDevices.getDisplayMedia is not a function'),
        'screen',
      ),
    ).toContain('Chrome ou o Edge')
  })
  test('nossa mensagem em português passa como veio; a do navegador desconhecida não', () => {
    expect(friendlyDeviceError(new Error('Escolha esta aba.'), 'screen')).toBe('Escolha esta aba.')
    expect(friendlyDeviceError(new DOMException('Weird', 'InvalidStateError'), 'microphone')).toBe(
      'Não foi possível ligar o microfone. Tente de novo.',
    )
  })
})

import { describe, expect, it } from 'bun:test'
import { triggerDownload } from './download'

describe('triggerDownload', () => {
  it('aciona um link temporário e revoga a URL somente depois do clique', () => {
    const createDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
    const revokeDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')
    const events: string[] = []
    const clicked: { current: HTMLAnchorElement | null } = { current: null }
    const onClick = (event: MouseEvent): void => {
      if (event.target instanceof HTMLAnchorElement) {
        clicked.current = event.target
        events.push('click')
        event.preventDefault()
      }
    }
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: () => {
        events.push('create')
        return 'blob:pinta-test'
      },
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: (url: string) => events.push(`revoke:${url}`),
    })
    document.addEventListener('click', onClick)

    try {
      triggerDownload(new Blob(['pinta']), 'desenho.png')
      expect(events).toEqual(['create', 'click', 'revoke:blob:pinta-test'])
      expect(clicked.current?.download).toBe('desenho.png')
      expect(clicked.current?.isConnected).toBe(false)
    } finally {
      document.removeEventListener('click', onClick)
      if (createDescriptor) Object.defineProperty(URL, 'createObjectURL', createDescriptor)
      else Reflect.deleteProperty(URL, 'createObjectURL')
      if (revokeDescriptor) Object.defineProperty(URL, 'revokeObjectURL', revokeDescriptor)
      else Reflect.deleteProperty(URL, 'revokeObjectURL')
    }
  })
})

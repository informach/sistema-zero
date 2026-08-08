import { describe, expect, it } from 'bun:test'
import { triggerDownload } from '../download'

describe('triggerDownload', () => {
  it('só revoga a object URL no macrotask seguinte (Firefox ainda precisa lê-la)', async () => {
    const events: string[] = []
    const originalCreateObjectURL = URL.createObjectURL
    const originalRevokeObjectURL = URL.revokeObjectURL
    const originalClick = HTMLAnchorElement.prototype.click

    try {
      URL.createObjectURL = () => {
        events.push('create')
        return 'blob:studio-test'
      }
      URL.revokeObjectURL = () => events.push('revoke')
      HTMLAnchorElement.prototype.click = function click() {
        events.push('click')
      }

      triggerDownload(new Blob(['projeto']), 'projeto.json')
      expect(events).toEqual(['create', 'click'])

      await new Promise<void>((resolve) => setTimeout(resolve, 0))
      expect(events).toEqual(['create', 'click', 'revoke'])
    } finally {
      URL.createObjectURL = originalCreateObjectURL
      URL.revokeObjectURL = originalRevokeObjectURL
      HTMLAnchorElement.prototype.click = originalClick
    }
  })
})

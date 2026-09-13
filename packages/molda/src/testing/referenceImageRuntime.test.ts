import { expect, spyOn, test } from 'bun:test'
import { triggerDownload } from '../export/download'
import { installReferenceImageRuntime } from './referenceImageRuntime'

test('a delayed download cleanup does not count as releasing the reference image', () => {
  let releaseDownload: (() => void) | undefined
  const timer = spyOn(globalThis, 'setTimeout').mockImplementation(((callback: () => void) => {
    releaseDownload = callback
    return 0
  }) as typeof setTimeout)
  const click = spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  try {
    expect(triggerDownload('backup', 'backup.json')).toBe(true)
  } finally {
    timer.mockRestore()
    click.mockRestore()
  }
  const runtime = installReferenceImageRuntime()
  try {
    const referenceUrl = URL.createObjectURL(new Blob(['image']))
    expect(releaseDownload).toBeDefined()
    releaseDownload!()
    expect(runtime.revoke).not.toHaveBeenCalled()
    URL.revokeObjectURL(referenceUrl)
    expect(runtime.revoke).toHaveBeenCalledTimes(1)
    expect(runtime.revoke).toHaveBeenCalledWith(referenceUrl)
  } finally {
    runtime.restore()
  }
})

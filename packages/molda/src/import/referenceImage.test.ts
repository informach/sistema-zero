import { expect, spyOn, test } from 'bun:test'
import { MOLDA_LIMITS } from '../core/limits'
import { encodePng } from '../export/png'
import { installReferenceImageRuntime } from '../testing/referenceImageRuntime'
import { loadReferenceImage } from './referenceImage'

const file = () =>
  new File([new Uint8Array(encodePng(new Uint8Array(16), 2, 2))], 'guia.png', {
    type: 'text/plain',
  })

test('oversized input is rejected before reading bytes or invoking the decoder', async () => {
  const runtime = installReferenceImageRuntime()
  try {
    const big = file()
    Object.defineProperty(big, 'size', { value: MOLDA_LIMITS.referenceFileBytes + 1 })
    const read = spyOn(big, 'arrayBuffer')
    await expect(loadReferenceImage(big, new AbortController().signal)).rejects.toMatchObject({
      reason: 'size',
    })
    expect(read).not.toHaveBeenCalled()
    expect(runtime.create).not.toHaveBeenCalled()
    read.mockRestore()
  } finally {
    runtime.restore()
  }
})

test('the decoded resource keeps its URL until explicit idempotent disposal, ignoring forged MIME', async () => {
  const runtime = installReferenceImageRuntime()
  try {
    const pending = loadReferenceImage(file(), new AbortController().signal)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(runtime.images).toHaveLength(1)
    runtime.images[0]!.finish()
    const resource = await pending
    expect(resource).toMatchObject({ name: 'guia.png', width: 2, height: 2 })
    expect(runtime.create.mock.calls[0]?.[0]).toMatchObject({ type: 'image/png' })
    expect(runtime.revoke).not.toHaveBeenCalled()
    resource.dispose()
    resource.dispose()
    expect(runtime.revoke).toHaveBeenCalledTimes(1)
    expect(runtime.revoke).toHaveBeenCalledWith(resource.url)
  } finally {
    runtime.restore()
  }
})

test('abort releases an in-flight decoder URL immediately and late success cannot resurrect it', async () => {
  const runtime = installReferenceImageRuntime()
  try {
    const controller = new AbortController()
    const pending = loadReferenceImage(file(), controller.signal)
    await new Promise((resolve) => setTimeout(resolve, 0))
    const decoded = runtime.images[0]!
    controller.abort()
    expect(runtime.revoke).toHaveBeenCalledTimes(1)
    expect(decoded.removed).toBe(true)
    decoded.finish()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(runtime.revoke).toHaveBeenCalledTimes(1)
  } finally {
    runtime.restore()
  }
})

test('corrupt decoded data and dimension disagreement revoke their URL', async () => {
  const runtime = installReferenceImageRuntime()
  try {
    const corrupt = loadReferenceImage(file(), new AbortController().signal)
    await new Promise((resolve) => setTimeout(resolve, 0))
    runtime.images[0]!.fail()
    await expect(corrupt).rejects.toMatchObject({ reason: 'decode' })
    const mismatch = loadReferenceImage(file(), new AbortController().signal)
    await new Promise((resolve) => setTimeout(resolve, 0))
    runtime.images[1]!.finish(4, 4)
    await expect(mismatch).rejects.toMatchObject({ reason: 'decode' })
    expect(runtime.revoke).toHaveBeenCalledTimes(2)
  } finally {
    runtime.restore()
  }
})

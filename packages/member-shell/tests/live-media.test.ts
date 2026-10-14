import { expect, test } from 'bun:test'
import { isApprovedLiveCapture } from '../src/lib/live/media-devices'
import { createLiveMediaTransport, LiveMediaOperationQueue } from '../src/lib/live/media-transport'

test('negotiation work is serialized across overlapping event handlers', async () => {
  const queue = new LiveMediaOperationQueue()
  const events: string[] = []
  let finish!: () => void
  const first = queue.run(async () => {
    events.push('offer')
    await new Promise<void>((resolve) => {
      finish = resolve
    })
    events.push('answer-ack')
  })
  const second = queue.run(async () => {
    events.push('next-offer')
  })
  await Promise.resolve()
  expect(events).toEqual(['offer'])
  finish()
  await Promise.all([first, second])
  expect(events).toEqual(['offer', 'answer-ack', 'next-offer'])
})

test('retirement discards pending operations instead of reviving a failed connection', async () => {
  const queue = new LiveMediaOperationQueue()
  const operation = queue.run(async () => 'must not run')
  queue.retire()
  await expect(operation).rejects.toThrow('encerrada')
})

test('capture requires current tab origin, nonce and browser surface', () => {
  const track = (surface: string, handle: string, origin: string) =>
    ({
      getSettings: () => ({ displaySurface: surface }),
      getCaptureHandle: () => ({ handle, origin }),
    }) as unknown as MediaStreamTrack & { getCaptureHandle(): { handle: string; origin: string } }
  expect(
    isApprovedLiveCapture(
      track('browser', 'nonce', 'https://kids.test'),
      'nonce',
      'https://kids.test',
    ),
  ).toBe(true)
  expect(
    isApprovedLiveCapture(
      track('monitor', 'nonce', 'https://kids.test'),
      'nonce',
      'https://kids.test',
    ),
  ).toBe(false)
  expect(
    isApprovedLiveCapture(
      track('browser', 'other-tab', 'https://kids.test'),
      'nonce',
      'https://kids.test',
    ),
  ).toBe(false)
  expect(
    isApprovedLiveCapture(
      track('browser', 'nonce', 'https://other.test'),
      'nonce',
      'https://kids.test',
    ),
  ).toBe(false)
})

test('focusing a screen negotiates full quality and returns the previous screen to thumbnail', async () => {
  const requests: { path: string; body: Record<string, unknown> }[] = []
  let mid = 0
  const publications = ['one', 'two'].map((id) => ({
    id,
    actorId: id,
    role: 'learner',
    kind: 'screen',
    simulcast: true,
  }))
  const peer = {
    iceGatheringState: 'complete',
    localDescription: { toJSON: () => ({ type: 'answer', sdp: 'answer' }) },
    addEventListener() {},
    close() {},
    async createAnswer() {
      return { type: 'answer', sdp: 'answer' }
    },
    async setLocalDescription() {},
    async setRemoteDescription() {},
  } as unknown as RTCPeerConnection
  const transport = createLiveMediaTransport({
    baseUrl: '/api/media',
    deviceId: 'device',
    onTrack() {},
    onState() {},
    onError(error) {
      throw error
    },
    createPeerConnection: () => peer,
    fetch: (async (url: string, init?: RequestInit) => {
      const path = String(url).split('/').at(-1)!,
        body = init?.body ? JSON.parse(String(init.body)) : {}
      requests.push({ path, body })
      if (path === 'join')
        return Response.json({
          connectionId: 'connection',
          generation: 1,
          iceServers: [],
          controlLeaseMs: 15000,
        })
      if (path.startsWith('publications')) return Response.json({ publications })
      if (path === 'subscribe')
        return Response.json({
          operationId: body.operationId,
          mid: String(mid++),
          requiresAnswer: true,
          sessionDescription: { type: 'offer', sdp: 'offer' },
        })
      return Response.json({})
    }) as typeof fetch,
  })
  try {
    await transport.join()
    await transport.refreshPublications()
    await transport.focusPublication('one')
    await transport.focusPublication('two')
    const qualities = requests
      .filter((request) => request.path === 'subscribe')
      .map((request) => [request.body.publicationId, request.body.quality])
    expect(qualities).toEqual([
      ['one', 'thumbnail'],
      ['two', 'thumbnail'],
      ['one', 'full'],
      ['one', 'thumbnail'],
      ['two', 'full'],
    ])
    expect(requests.filter((request) => request.path === 'unsubscribe')).toHaveLength(3)
    expect(requests.filter((request) => request.path === 'complete')).toHaveLength(5)
  } finally {
    await transport.close()
  }
})

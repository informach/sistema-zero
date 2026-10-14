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
    iceGatheringState: 'gathering',
    localDescription: { toJSON: () => ({ type: 'answer', sdp: 'answer' }) },
    addEventListener() {},
    removeEventListener() {},
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

function oscillatingPeer() {
  const target = new EventTarget()
  const peer = Object.assign(target, {
    connectionState: 'new' as RTCPeerConnectionState,
    iceGatheringState: 'complete',
    close() {},
    set(next: RTCPeerConnectionState) {
      peer.connectionState = next
      target.dispatchEvent(new Event('connectionstatechange'))
    },
  })
  return peer
}

function oscillationTransport(peer: ReturnType<typeof oscillatingPeer>, states: string[]) {
  return createLiveMediaTransport({
    baseUrl: '/api/media',
    deviceId: 'device',
    disconnectGraceMs: 40,
    onTrack() {},
    onState(state) {
      states.push(state)
    },
    onError() {},
    createPeerConnection: () => peer as unknown as RTCPeerConnection,
    fetch: (async (url: string) => {
      if (String(url).endsWith('/join'))
        return Response.json({
          connectionId: 'connection',
          generation: 1,
          iceServers: [],
          controlLeaseMs: 60_000,
        })
      return Response.json({})
    }) as typeof fetch,
  })
}

test('a short Wi-Fi drop (disconnected, then connected) keeps the room', async () => {
  const peer = oscillatingPeer()
  const states: string[] = []
  const transport = oscillationTransport(peer, states)
  try {
    await transport.join()
    peer.set('connected')
    peer.set('disconnected')
    await Bun.sleep(10)
    peer.set('connected')
    await Bun.sleep(80)
    expect(states).not.toContain('failed')
    expect(states.at(-1)).toBe('connected')
  } finally {
    await transport.close()
  }
})

test('a drop that does not come back within the grace closes the connection', async () => {
  const peer = oscillatingPeer()
  const states: string[] = []
  const transport = oscillationTransport(peer, states)
  try {
    await transport.join()
    peer.set('connected')
    peer.set('disconnected')
    await Bun.sleep(10)
    expect(states).not.toContain('failed')
    await Bun.sleep(80)
    expect(states.at(-1)).toBe('failed')
  } finally {
    await transport.close()
  }
})

test('failed ends the connection at once, without waiting for the grace', async () => {
  const peer = oscillatingPeer()
  const states: string[] = []
  const transport = oscillationTransport(peer, states)
  try {
    await transport.join()
    peer.set('connected')
    peer.set('failed')
    await Bun.sleep(5)
    expect(states.at(-1)).toBe('failed')
  } finally {
    await transport.close()
  }
})

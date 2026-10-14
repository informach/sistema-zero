import assert from 'node:assert/strict'

const expect = (value: unknown) => ({
  toHaveLength: (length: number) => assert.equal((value as unknown[]).length, length),
  toBeGreaterThan: (limit: number) => assert.ok(Number(value) > limit),
  toBe: (expected: unknown) => assert.equal(value, expected),
})

import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative, resolve } from 'node:path'
import type { S3Client } from '@aws-sdk/client-s3'
import { chromium } from 'playwright'
import type { RecordingManifest } from '../src/contracts'
import { installReceiverPage } from '../src/receiver-page'
import { RecordingSegmentStore } from '../src/segment-store'

export async function checkReceiver() {
  const directory = await mkdtemp(join(tmpdir(), 'sz-live-recorder-test-'))
  const browser = await chromium.launch({
    headless: true,
    chromiumSandbox: true,
    args: ['--autoplay-policy=no-user-gesture-required'],
  })
  try {
    const objects = new Map<string, Uint8Array>()
    const client = {
      async send(command: { input: { Key: string; Body: unknown } }) {
        const body = command.input.Body
        if (typeof body === 'string') objects.set(command.input.Key, new TextEncoder().encode(body))
        else if (body instanceof Uint8Array) objects.set(command.input.Key, body)
        else {
          const chunks: Uint8Array[] = []
          for await (const chunk of body as AsyncIterable<Uint8Array>) chunks.push(chunk)
          objects.set(command.input.Key, Buffer.concat(chunks))
        }
        return { ETag: 'test-etag' }
      },
    } as unknown as S3Client
    const manifest: RecordingManifest = {
      version: 1,
      eventSequence: 0,
      jobId: crypto.randomUUID(),
      occurrenceId: crypto.randomUUID(),
      generation: 1,
      state: 'starting',
      segments: [],
      gaps: [],
      replayKey: null,
      error: null,
    }
    const store = new RecordingSegmentStore(client, 'private', manifest, directory)
    await store.prepare()
    const sender = await browser.newPage(),
      receiver = await browser.newPage()
    await receiver.exposeFunction(
      'szRecordingSegment',
      async (segment: Parameters<RecordingSegmentStore['segment']>[0]) => {
        await store.segment(segment)
      },
    )
    await receiver.exposeFunction('szRecordingFailure', (message: string) => {
      throw new Error(message)
    })
    await receiver.evaluate(installReceiverPage, [])
    const offer = await sender.evaluate(async () => {
      const pc = new RTCPeerConnection()
      Object.assign(window, { testPeer: pc })
      const canvas = document.createElement('canvas')
      canvas.width = 1280
      canvas.height = 720
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#00aaff'
      ctx.fillRect(0, 0, 1280, 720)
      const video = pc.addTransceiver(canvas.captureStream(15).getVideoTracks()[0]!, {
        direction: 'sendonly',
      })
      const audio = new AudioContext(),
        output = audio.createMediaStreamDestination(),
        oscillator = audio.createOscillator()
      oscillator.connect(output)
      oscillator.start()
      await audio.resume()
      const microphone = pc.addTransceiver(output.stream.getAudioTracks()[0]!, {
        direction: 'sendonly',
      })
      await pc.setLocalDescription(await pc.createOffer())
      await new Promise<void>((resolve) => {
        const done = () => {
          if (pc.iceGatheringState === 'complete') resolve()
        }
        pc.addEventListener('icegatheringstatechange', done)
        done()
      })
      return {
        description: pc.localDescription!.toJSON(),
        bindings: [
          { mid: video.mid!, kind: 'demo' as const },
          { mid: microphone.mid!, kind: 'microphone' as const },
        ],
      }
    })
    const answer = await receiver.evaluate(
      ({ bindings, description }) => window.szRecorder.offer(bindings, description),
      offer,
    )
    await sender.evaluate(async (answer) => {
      await (window as unknown as { testPeer: RTCPeerConnection }).testPeer.setRemoteDescription(
        answer,
      )
    }, answer)
    await receiver.evaluate(() => window.szRecorder.start())
    await new Promise((resolve) => setTimeout(resolve, 1300))
    await receiver.evaluate(() => window.szRecorder.close())
    expect(manifest.segments).toHaveLength(1)
    expect(manifest.segments[0]!.bytes).toBeGreaterThan(1000)
    expect(objects.has(store.manifestKey)).toBe(true)
    const key = await store.finalize()
    expect(objects.get(key)!.length).toBeGreaterThan(1000)
    const replay = await readFile(join(store.directory, 'replay.mp4'))
    expect(replay.subarray(4, 8).toString()).toBe('ftyp')
  } finally {
    await browser.close()
    const within = relative(resolve(tmpdir()), resolve(directory))
    assert.ok(within && !within.startsWith('..') && !isAbsolute(within))
    await rm(directory, { recursive: true, force: true })
  }
}
await checkReceiver()

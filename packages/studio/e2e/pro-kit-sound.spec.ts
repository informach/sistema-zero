import { expect, test } from '@playwright/test'
import { materializeTestTemplate } from '../../studio-runtime/tests/template-files'
import { createTestProArtifact } from './helpers/proArtifact'

function wave() {
  const samples = 8000,
    bytes = new Uint8Array(44 + samples * 2),
    view = new DataView(bytes.buffer)
  const text = (at: number, value: string) => {
    for (let i = 0; i < value.length; i++) bytes[at + i] = value.charCodeAt(i)
  }
  text(0, 'RIFF')
  view.setUint32(4, bytes.length - 8, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, 8000, true)
  view.setUint32(28, 16000, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, samples * 2, true)
  for (let i = 0; i < samples; i++)
    view.setInt16(44 + i * 2, Math.sin((i / 8000) * Math.PI * 880) * 400, true)
  return bytes
}
test('local audio in an opaque published iframe waits for opt-in, pauses and releases resources', async ({
  page,
}) => {
  const { allFiles } = await materializeTestTemplate('canvas-grid-arena')
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  allFiles['public/studio-assets/sample.wav'] = wave()
  allFiles['src/main.ts'] += `
import { createSoundBank } from './sound'
const observedAudio = new Set<HTMLMediaElement>()
const nativePlay = HTMLMediaElement.prototype.play
HTMLMediaElement.prototype.play = function () { observedAudio.add(this); return nativePlay.call(this) }
const bank = createSoundBank(ui)
bank.define('loop', 'studio-assets/sample.wav', 'music')
bank.define('fx', 'studio-assets/sample.wav', 'effects')
bank.music('loop')
const output = document.createElement('output'); output.id = 'audio-proof'; ui.controls.append(output)
const inspectButton = document.createElement('button'); inspectButton.id = 'inspect-audio'; inspectButton.textContent = 'Conferir áudio'
inspectButton.onclick = () => { output.textContent = JSON.stringify({ ...bank.inspect(), playing: [...observedAudio].filter(voice => !voice.paused && voice.volume > 0).length }) }; ui.controls.append(inspectButton)
const fxButton = document.createElement('button'); fxButton.id = 'play-fx'; fxButton.textContent = 'Efeito de teste'; fxButton.onclick = () => bank.effect('fx'); ui.controls.append(fxButton)
manageLifetime(() => bank.dispose())
`
  const artifact = await createTestProArtifact(page, allFiles, 'canvas-grid-arena', {
    bridge: true,
  })
  try {
    const frame = page.frameLocator('#game')
    const inspect = async () => {
      await frame.locator('#inspect-audio').click()
      return JSON.parse((await frame.locator('#audio-proof').textContent()) ?? '{}') as {
        voices: number
        music: boolean
        playing: number
      }
    }
    await frame.locator('#start').click()
    expect((await inspect()).voices).toBe(0)
    await frame.locator('#sound').click()
    expect((await inspect()).voices).toBe(1)
    await frame.locator('#play-fx').click()
    expect((await inspect()).voices).toBe(2)
    await page.evaluate(() => {
      document
        .querySelector<HTMLIFrameElement>('#game')!
        .contentWindow!.postMessage({ type: 'sz:audio', muted: true }, '*')
    })
    await expect(frame.locator('#sound')).toBeDisabled()
    expect((await inspect()).voices).toBe(1)
    expect((await inspect()).playing).toBe(0)
    await page.evaluate(() => {
      document
        .querySelector<HTMLIFrameElement>('#game')!
        .contentWindow!.postMessage({ type: 'sz:audio', muted: false }, '*')
    })
    await expect(frame.locator('#sound')).toBeEnabled()
    await expect.poll(async () => (await inspect()).playing).toBe(1)
    await frame.locator('#pause').click()
    expect((await inspect()).voices).toBe(1)
    await frame.locator('#start').click()
    await frame.locator('#sound').click()
    expect((await inspect()).voices).toBe(1)
    await frame.locator('#menu').click()
    expect((await inspect()).voices).toBe(0)
    await expect(frame.locator('#status')).not.toContainText('áudio')
    await frame
      .locator('body')
      .evaluate(() =>
        window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })),
      )
    await expect(frame.locator('canvas')).toHaveCount(0)
    expect(errors).toEqual([])
  } finally {
    await artifact.dispose()
  }
})

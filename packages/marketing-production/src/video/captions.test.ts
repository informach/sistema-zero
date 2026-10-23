import { expect, test } from 'bun:test'
import { exportSourceSrt, importSrtCaptions } from './captions'

const source = {
  assetId: '00000000-0000-4000-8000-000000000001',
  durationMs: 5000,
  srtSha256: 'a'.repeat(64),
}
const srt =
  '1\n00:00:00,500 --> 00:00:02,000\nOlá, criação!\n\n2\n00:00:02,500 --> 00:00:04,000\nVeja o jogo.'
test('SRT conserva acentos, tempos e identidade; erros e duração fora do original são recusados', async () => {
  const captions = await importSrtCaptions(srt, source)
  expect(captions).toEqual(await importSrtCaptions(srt, source))
  expect(captions[0]).toMatchObject({
    text: 'Olá, criação!',
    startMs: 500,
    endMs: 2000,
    corrected: false,
  })
  expect(await importSrtCaptions(exportSourceSrt(captions), source)).toEqual(captions)
  await expect(importSrtCaptions('não é SRT', source)).rejects.toThrow()
  await expect(importSrtCaptions(srt, { ...source, durationMs: 3500 })).rejects.toThrow('duração')
})

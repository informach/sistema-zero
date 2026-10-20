/** Original qualification sources and generated PCM; no third-party audio is distributed. */
export const audioFixtures: Record<string, string> = {
  portableAudio: `import sz_audio
print('audio imported')
one = sz_audio.play('assets/tone.wav', loop=True, volume=0.2)
two = sz_audio.play('assets/tone.wav', loop=True, volume=0.1)
print('audio handles', one, two)
input('Parar primeiro: ')
sz_audio.stop(one)
print('first stopped')
input('Parar todos: ')
sz_audio.stop()
print('all stopped')
`,
  portableAudioNamespace: `import sz_audio
assert sz_audio.AUTHOR == 'author audio preserved'
print(sz_audio.AUTHOR)
`,
}

export function portableAudioAsset() {
  const bytes = new Uint8Array(44 + 48000 * 2)
  const view = new DataView(bytes.buffer)
  const tag = (at: number, text: string) => bytes.set(new TextEncoder().encode(text), at)
  tag(0, 'RIFF')
  view.setUint32(4, bytes.length - 8, true)
  tag(8, 'WAVEfmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, 48000, true)
  view.setUint32(28, 96000, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  tag(36, 'data')
  view.setUint32(40, bytes.length - 44, true)
  for (let index = 0; index < 48000; index++)
    view.setInt16(
      44 + index * 2,
      Math.round(Math.sin((index * 2 * Math.PI * 440) / 48000) * 3000),
      true,
    )
  return {
    id: 'portable-tone',
    name: 'portable-tone',
    kind: 'audio' as const,
    source: 'upload' as const,
    proPath: 'assets/tone.wav',
    dataUrl: `data:audio/wav;base64,${Buffer.from(bytes).toString('base64')}`,
  }
}

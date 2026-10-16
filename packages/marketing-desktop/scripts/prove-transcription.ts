import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { downloadWhisperModel, installWhisperCpp, transcribe } from '@remotion/install-whisper-cpp'

const directory = path.resolve('.cache/proof')
const whisperPath = path.join(directory, 'whisper-1.6.0')
await mkdir(directory, { recursive: true })
await installWhisperCpp({ version: '1.6.0', to: whisperPath, printOutput: false })
console.log('Whisper.cpp instalado.')
await downloadWhisperModel({ model: 'base', folder: whisperPath, printOutput: false })
console.log('Modelo multilíngue disponível.')
const started = Date.now()
const result = await transcribe({
  inputPath: path.join(directory, 'fala-pt.wav'),
  whisperPath,
  whisperCppVersion: '1.6.0',
  model: 'base',
  language: 'pt',
  tokenLevelTimestamps: false,
  printOutput: false,
})
await writeFile(path.join(directory, 'transcription.json'), JSON.stringify(result, null, 2))
console.log(
  JSON.stringify({
    language: result.result.language,
    durationMs: Date.now() - started,
    segments: result.transcription.map(({ text, offsets }) => ({ text, offsets })),
  }),
)

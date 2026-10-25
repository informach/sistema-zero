/**
 * Renders the sounds of one gallery game into its assets/ (while the game is being made, before
 * it enters the manifest; the gallery generator does the same for every listed game).
 *
 * FFMPEG=<ffmpeg with libvorbis> bun --no-env-file scripts/python/render-pygame-audio.ts <game>
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { encodeOgg, songWav } from './pygame-audio'
import { loadGalleryAudio } from './pygame-gallery-audio'

const game = process.argv[2]
const audio = (await loadGalleryAudio())[game ?? '']
if (!game || !audio)
  throw new Error('Use: render-pygame-audio.ts <jogo com pygame-gallery-audio/<jogo>.ts>')
const folder = join(import.meta.dirname, '../../src/examples/python/pygame', game, 'assets')
await mkdir(folder, { recursive: true })
for (const [name, sound] of Object.entries(audio)) {
  const wav = 'wav' in sound ? sound.wav() : songWav(sound.song)
  // The file name decides the format, as in the gallery generator.
  const bytes = name.endsWith('.ogg') ? await encodeOgg(wav) : wav
  await writeFile(join(folder, name), bytes)
  console.log(`${name}: ${bytes.length} bytes`)
}

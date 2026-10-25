/**
 * The sounds of each Pygame-ce gallery game: pygame-gallery-audio/<game>.ts exports
 * `audio: GameAudio` (file name in assets/ → how to make it: an effect or a song). The file
 * name decides the format: `.wav` is written as rendered, `.ogg` is encoded by ffmpeg (the
 * generator keeps a digest of the WAV so `--check` does not depend on the encoder build).
 */
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Song } from './pygame-audio'

export type GameAudio = Record<string, { wav: () => Uint8Array } | { song: Song }>

export async function loadGalleryAudio(): Promise<Record<string, GameAudio>> {
  const folder = join(import.meta.dirname, 'pygame-gallery-audio')
  const audio: Record<string, GameAudio> = {}
  for (const file of (await readdir(folder)).sort())
    if (file.endsWith('.ts')) audio[file.slice(0, -3)] = (await import(join(folder, file))).audio
  return audio
}

import { readFile, writeFile } from 'node:fs/promises'
import { REFERENCE_GAME_SOUNDS, renderReferenceSound } from './python/reference-game-audio'

const directory = new URL('../src/examples/python/', import.meta.url)

/** Original WAVs are reproduced from the score; the shared generator serializes text/media. */
export async function generateVisualReferenceGames(check: boolean) {
  const outputs = new Map<URL, Uint8Array>()
  for (const sound of REFERENCE_GAME_SOUNDS) {
    const bytes = renderReferenceSound(sound)
    outputs.set(new URL(`${sound.game}/${sound.path}`, directory), bytes)
  }
  // Check all outputs before reporting; never rewrite material in check mode.
  for (const [url, expected] of outputs) {
    if (!check) await writeFile(url, expected)
    else if (!Buffer.from(await readFile(url)).equals(Buffer.from(expected)))
      throw new Error(`Som visual desatualizado: ${url.pathname}`)
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  if (args.some((argument) => argument !== '--check') || args.length > 1)
    throw new Error('Uso: bun --no-env-file scripts/generate-visual-reference-games.ts [--check]')
  await generateVisualReferenceGames(args.includes('--check'))
  await import('./gen-python-text-sources')
}

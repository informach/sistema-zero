import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import pacman from '../studio-python-l0/corpus/pacman.json'
import arena from '../studio-python-l0/corpus/space-arena.json'

interface Edit {
  first: number
  last: number
  replacement: readonly string[]
}

/** Versioned source patches for the pinned external QA corpus, never product templates. */
export const portableGameRecipes = {
  pacman: {
    version: pacman.portableVariant.version,
    manifest: pacman,
    edits: [
      { first: 10, last: 10, replacement: ['import sz_audio'] },
      { first: 46, last: 46, replacement: ['            sz_audio.play("eat.wav")'] },
      { first: 57, last: 57, replacement: ['            sz_audio.play("eat.wav")'] },
      { first: 74, last: 74, replacement: ['            sz_audio.play("death.wav")'] },
      { first: 163, last: 163, replacement: ['    sz_audio.play("start_up.wav")'] },
    ],
  },
  'space-arena': {
    version: arena.portableVariant.version,
    manifest: arena,
    edits: [
      { first: 12, last: 13, replacement: ['import sz_audio'] },
      { first: 15, last: 21, replacement: [] },
      { first: 23, last: 32, replacement: ['    sz_audio.play(sound_file)'] },
      {
        first: 775,
        last: 775,
        replacement: ['    x = random.randint(int(-game.width/2.0), int(game.width/2.0))'],
      },
      {
        first: 776,
        last: 776,
        replacement: ['    y = random.randint(int(-game.height/2.0), int(game.height/2.0))'],
      },
      {
        first: 792,
        last: 792,
        replacement: ['    x = random.randint(int(-game.width/2.0), int(game.width/2.0))'],
      },
      {
        first: 793,
        last: 793,
        replacement: ['    y = random.randint(int(-game.height/2.0), int(game.height/2.0))'],
      },
      {
        first: 846,
        last: 846,
        replacement: ['    # O console do Estúdio preserva o histórico de FPS sem abrir um shell.'],
      },
      {
        first: 855,
        last: 855,
        replacement: [
          '    if game.state == "paused":',
          '        wn.update()',
          '        continue',
          '    ',
        ],
      },
    ],
  },
} as const satisfies Record<
  string,
  {
    version: string
    manifest: { entrypoint: string; files: { path: string; sha256: string }[] }
    edits: readonly Edit[]
  }
>

export type PortableGame = keyof typeof portableGameRecipes

export function portableGameSource(game: PortableGame, source: string) {
  const recipe = portableGameRecipes[game]
  const original = recipe.manifest.files.find((file) => file.path === recipe.manifest.entrypoint)
  assert.ok(original, 'Pinned entrypoint is absent')
  const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')
  assert.equal(
    sha256(source),
    original.sha256,
    'Portable patches require the exact pinned LF source',
  )
  const lines = source.split('\n')
  let boundary = lines.length + 1
  for (const edit of [...recipe.edits].reverse()) {
    assert.ok(
      edit.first >= 1 && edit.first <= edit.last && edit.last < boundary,
      'Overlapping or invalid patch',
    )
    lines.splice(edit.first - 1, edit.last - edit.first + 1, ...edit.replacement)
    boundary = edit.first
  }
  const content = lines.join('\n')
  assert.equal(
    sha256(content),
    recipe.manifest.portableVariant.entrypointSha256,
    'Portable output differs from the reviewed recipe',
  )
  return {
    content,
    receipt: {
      game,
      version: recipe.version,
      sourceSha256: original.sha256,
      portableSha256: sha256(content),
      edits: recipe.edits,
      qualification: 'not-qualified',
      ...(game === 'space-arena'
        ? {
            pauseBehavior:
              'explicit event pump while paused; isolated original-loop Tk reproduction passed; full-game qualification pending',
          }
        : {}),
    },
  }
}

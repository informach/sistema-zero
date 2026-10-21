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
      {
        first: 38,
        last: 38,
        replacement: [
          'def close_game_once(screen):',
          '    if getattr(screen, "_pacman_close_scheduled", False):',
          '        return',
          '    screen.ontimer(screen.bye, 3000)',
          '    screen._pacman_close_scheduled = True',
          '',
          '',
          'def game_loop(screen, player, score_pen, lives_pen, pellet_pen, power_pen, player_start_x, player_start_y, enemies):',
        ],
      },
      { first: 46, last: 46, replacement: ['            sz_audio.play("eat.wav")'] },
      { first: 57, last: 57, replacement: ['            sz_audio.play("eat.wav")'] },
      { first: 74, last: 74, replacement: ['            sz_audio.play("death.wav")'] },
      { first: 88, last: 88, replacement: ['        close_game_once(screen)'] },
      { first: 95, last: 95, replacement: ['        close_game_once(screen)'] },
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

function modernizeSpaceArenaEventLoop(source: string) {
  const start = '\nwhile True:\n'
  const playing = '    if game.state == "playing":\n'
  const end = '\n# wn.mainloop()'
  assert.equal(source.split(start).length, 2)
  assert.equal(source.split(end).length, 2)
  const [prefix, loopAndTail] = source.split(start)
  const [loop, tail] = loopAndTail!.split(end)
  assert.equal(loop!.split(playing).length, 2)
  const previousClear = '        # Clear everything\n        pen.clear()'
  const body = loop!.split(playing)[1]!
  assert.equal(body.split(previousClear).length, 2)
  assert.equal(body.split(previousClear)[1]!.trim(), '')
  const unchangedBody = body.split(previousClear)[0]!.trimEnd()
  return (
    prefix +
    '\n\ndef _space_arena_tick():\n' +
    '    frame_started = time.monotonic()\n' +
    '    if game.state == "playing":\n' +
    '        # Clear the previous frame before drawing the next one.\n' +
    '        pen.clear()\n' +
    unchangedBody +
    '\n' +
    '    else:\n' +
    '        # Dispatch input/timers while splash or paused, without simulation.\n' +
    '        wn.update()\n' +
    '    # Schedule after dispatch returns: no overlapping tick or catch-up steps.\n' +
    '    elapsed_ms = (time.monotonic() - frame_started) * 1000\n' +
    '    wn.ontimer(_space_arena_tick, max(1, math.ceil(1000 / 60 - elapsed_ms)))\n' +
    '\n# Complete setup and expose the unchanged splash before scheduling play.\n' +
    'wn.update()\nwn.ontimer(_space_arena_tick, 1)\nwn.mainloop()' +
    tail
  )
}

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
  const patched = lines.join('\n')
  const content = game === 'space-arena' ? modernizeSpaceArenaEventLoop(patched) : patched
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
              'official Turtle timer/mainloop, one unchanged playing tick per callback; event-driven source candidate requires fresh native/browser qualification',
          }
        : {}),
    },
  }
}

"""Plays a Pygame-ce gallery game frame by frame on desktop pygame-ce 2.5.7 (SDL dummy driver).

The game runs through the same host bridge as in the browser (_szpygame: input, clocks, timers,
mixer) with a scripted transport instead of the canvas: every frame advances a virtual clock by
1000/60 ms and delivers the input the script asks for. Deterministic, so a script can play a
whole game to its end; screenshots and sound commands are recorded.

    python -I pygame-playtest.py <game folder> <script.json> <output folder>

Script: {"frames": 600, "seed": 1, "shots": [10, 300],
         "steps": [{"at": 30, "down": ["space"]}, {"at": 40, "up": ["space"]},
                   {"at": 50, "tap": ["right"]}, {"at": 60, "click": [640, 360]},
                   {"at": 70, "move": [100, 200]}],
         "expect": {"stdout": ["text that must be printed"], "alive_at_end": true}}
Keys are pygame key names (pygame.key.key_code). Output: report.json and frame-N.png.
`click` presses and releases in the same frame: code that reads mouse.get_pressed() while it
handles the event never sees the button down; use `press`/`release` in different frames for that.
expect.sounds lists project paths, as the report does: "assets/pulo.wav".
"""
import io
import json
import os
import random
import runpy
import shutil
import sys
import traceback
from contextlib import redirect_stdout
from pathlib import Path

os.environ['SDL_VIDEODRIVER'] = 'dummy'
os.environ['SDL_AUDIODRIVER'] = 'dummy'
os.environ.setdefault('PYGAME_HIDE_SUPPORT_PROMPT', '1')
RUNTIME = Path(__file__).resolve().parents[2] / 'src/runtime/python'
FRAME_MS = 1000 / 60


class _Finished(BaseException):
    """Ends the game loop after the scripted frames (not an Exception: games catch those)."""


def main():
    game, script_path, output = Path(sys.argv[1]).resolve(), Path(sys.argv[2]), Path(sys.argv[3])
    script = json.loads(script_path.read_text(encoding='utf-8'))
    output.mkdir(parents=True, exist_ok=True)
    # The game may write files (scores): it runs on a copy, never on the gallery source.
    shutil.rmtree(output / 'game', ignore_errors=True)
    game = Path(shutil.copytree(game, output / 'game'))
    # The platform fonts sit in fontes/, as a desktop export lays them out.
    shutil.copytree(RUNTIME / 'pygame/py/fontes', game / 'fontes', dirs_exist_ok=True)
    random.seed(script.get('seed', 1))
    sys.path[:0] = [str(game), str(RUNTIME / 'pygame/py'), str(RUNTIME / 'pgzero/py')]
    os.chdir(game)
    import pygame
    from pgzero import _sz
    import _szpygame

    clock = {'now': 0.0}
    pygame.time.get_ticks = lambda: int(clock['now'])
    frames = {'count': 0}
    audio = []
    steps = {}
    for step in script.get('steps', ()):
        steps.setdefault(int(step['at']), []).append(step)
    held = {}
    shots = set(script.get('shots', ()))
    mouse = [0, 0]

    def key(name):
        return pygame.key.key_code(name)

    def events_for(frame):
        events = []
        for step in steps.get(frame, ()):
            for name in step.get('down', ()):
                events.append(['kd', key(name), 0, name if len(name) == 1 else ''])
                held[name] = True
            for name in step.get('up', ()):
                events.append(['ku', key(name), 0])
                held.pop(name, None)
            for name in step.get('tap', ()):
                events.append(['kd', key(name), 0, name if len(name) == 1 else ''])
                events.append(['ku', key(name), 0])
            if 'move' in step:
                x, y = step['move']
                events.append(['mm', x, y, x - mouse[0], y - mouse[1], 0])
                mouse[:] = [x, y]
            if 'click' in step:
                x, y = step['click']
                button = step.get('button', 1)
                events.append(['md', x, y, button])
                events.append(['mu', x, y, button])
                mouse[:] = [x, y]
            if 'press' in step:
                x, y = step['press']
                events.append(['md', x, y, step.get('button', 1)])
                mouse[:] = [x, y]
            if 'release' in step:
                x, y = step['release']
                events.append(['mu', x, y, step.get('button', 1)])
        return events

    def transport(header, payload, pixels=None):
        data = json.loads(header)
        audio.extend(data.get('audio', ()))
        if not data['keep']:
            frames['count'] += 1
            if frames['count'] in shots:
                pygame.image.save(pygame.display.get_surface(),
                                  str(output / f'frame-{frames["count"]}.png'))
            if frames['count'] >= script.get('frames', 600):
                raise _Finished()
        clock['now'] += FRAME_MS
        ended = [command[1] for command in data.get('audio', ())
                 if command[0] == 'play' and command[3] == 0]
        reply = {'events': events_for(frames['count']), 'now': clock['now']}
        if data.get('watch') and ended:
            reply['ended'] = ended[:64]
        return json.dumps(reply), None

    _sz.configure(transport, None, str(game))
    _szpygame.install()
    stdout = io.StringIO()
    report = {'game': game.name, 'frames': 0, 'error': None, 'finished': False}
    try:
        with redirect_stdout(stdout):
            runpy.run_path(str(game / 'main.py'), run_name='__main__')
        report['exited'] = True
    except _Finished:
        report['finished'] = True
    except SystemExit as error:
        report['exited'] = True
        report['exit_code'] = error.code
    except BaseException:
        report['error'] = traceback.format_exc()
    report['frames'] = frames['count']
    report['stdout'] = stdout.getvalue()[-4000:]
    report['sounds'] = sorted({command[2] for command in audio if command[0] == 'play'})
    expect = script.get('expect', {})
    problems = [f'stdout sem {text!r}' for text in expect.get('stdout', ())
                if text not in report['stdout']]
    if expect.get('alive_at_end', True) and not report['finished']:
        problems.append('o jogo terminou antes do fim do roteiro')
    for name in expect.get('sounds', ()):
        if name not in report['sounds']:
            problems.append(f'o som {name} não tocou')
    if report['error']:
        problems.append('erro: ' + report['error'].strip().splitlines()[-1])
    report['problems'] = problems
    (output / 'report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False),
                                        encoding='utf-8')
    print(json.dumps({'game': game.name, 'frames': report['frames'], 'problems': problems},
                     ensure_ascii=False))
    sys.exit(1 if problems else 0)


main()

"""Plays the gallery's Pygame Zero examples on the real pgzero 1.2.1 + pygame-ce.

usage: python scripts/python/pgzero-playtest/run.py [game ...]

Needs a Python with `pygame-ce==2.5.8` and `pgzero==1.2.1` (installed with --no-deps). Each
game in src/examples/python/pgzero that has a script here is copied to a temporary folder, its
SVG images become PNG (the desktop pgzero opens PNG), and harness.py plays the script: real
key presses, frame by frame, checking the game's own variables. Screenshots go to
.cache/pgzero-playtest/<game>/.
"""
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile

here = pathlib.Path(__file__).resolve().parent
studio = here.parents[2]
games = studio / 'src' / 'examples' / 'python' / 'pgzero'
shots = studio.parents[1] / '.cache' / 'pgzero-playtest'
chosen = sys.argv[1:] or sorted(p.stem for p in here.glob('*.py') if p.stem not in ('harness', 'run'))

os.environ['SDL_VIDEODRIVER'] = 'dummy'
import pygame  # noqa: E402

failed = []
for key in chosen:
    with tempfile.TemporaryDirectory() as folder:
        copy = pathlib.Path(folder) / key
        shutil.copytree(games / key, copy)
        for svg in copy.glob('images/*.svg'):
            pygame.image.save(pygame.image.load(str(svg)), str(svg.with_suffix('.png')))
            svg.unlink()
        print(f'== {key}', flush=True)
        result = subprocess.run(
            [sys.executable, str(here / 'harness.py'), str(copy), str(here / f'{key}.py'), str(shots / key)],
            env={**os.environ, 'PYTHONIOENCODING': 'utf-8'},
        )
        if result.returncode:
            failed.append(key)
print('\nTodos os roteiros passaram.' if not failed else f'\nFalharam: {", ".join(failed)}')
sys.exit(1 if failed else 0)

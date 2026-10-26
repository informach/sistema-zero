"""The pixels pygame-ce 2.5.8 draws for each pygame.draw shape, as the Studio's tests read them.

Run with pygame-ce 2.5.8 (the desktop export's reference):

    python scripts/python/pgzero-draw-reference.py

It writes src/runtime/python/pgzero/__tests__/drawReference.json: for each case, the call and
the screen it leaves, one bit per pixel. Hand-picked cases cover the rules of each function
(widths, corners, quarters, angles, shapes off the screen); seeded random cases cover the rest.
"""
import json
import math
import os
import random
import subprocess
import sys

os.environ.setdefault('SDL_VIDEODRIVER', 'dummy')
import pygame  # noqa: E402

assert pygame.version.ver == '2.5.8', f'Use o pygame-ce 2.5.8, não {pygame.version.ver}.'
W, H = 48, 36
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'runtime', 'python', 'pgzero',
                   '__tests__', 'drawReference.json')


def draw(fn, args, kwargs):
    surface = pygame.Surface((W, H))
    surface.fill((0, 0, 0))
    if fn == 'lines':
        pygame.draw.lines(surface, (255, 255, 255), *args, **kwargs)
    else:
        getattr(pygame.draw, fn)(surface, (255, 255, 255), *args, **kwargs)
    bits = 0
    for y in range(H):
        for x in range(W):
            bits = (bits << 1) | (surface.get_at((x, y))[0] == 255)
    return format(bits, f'0{W * H // 4}x')


cases = []


def case(fn, *args, **kwargs):
    cases.append({'fn': fn, 'args': list(args), 'kwargs': kwargs, 'pixels': draw(fn, args, kwargs)})


# Hand-picked: each rule of each function.
for width in (0, 1, 2, 3, 5, 9, 17, 18, -1):
    case('rect', [4, 3, 30, 22], width)
case('rect', [40, 30, 20, 20], 3)          # leaves the screen: the border is measured clipped
case('rect', [-5, -4, 20, 14], 4)
case('rect', [10, 10, -6, 8], 0)           # negative width: nothing
case('rect', [10, 10, 1, 8], 2)
for radius in (1, 3, 6, 11, 40):
    case('rect', [3, 2, 40, 30], 0, radius)
    case('rect', [3, 2, 40, 30], 3, radius)
case('rect', [3, 2, 40, 30], 2, 8, 2, -1, 15, 0)
case('rect', [3, 2, 40, 30], 0, 0, 12, 5, -1, 20)
case('rect', [20, 20, -15, -12], 2, 4)
for radius in (1, 2, 3, 7, 12, 16, 30):
    for width in (0, 1, 2, 5, radius):
        case('circle', [24, 18], radius, width)
case('circle', [24.9, 17.5], 9.9, 0)
case('circle', [-0.5, 5], 6, 2)
case('circle', [50, 40], 7, 0)
for quarters in ((1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 1, 0), (0, 0, 0, 1), (1, 0, 1, 0), (1, 1, 1, 1)):
    for width in (0, 1, 3):
        case('circle', [24, 18], 14, width, *quarters)
case('circle', [24, 18], 1, 0, 1, 1, 0, 1)
for size in ((1, 9), (9, 1), (2, 2), (7, 5), (30, 20), (31, 21), (44, 33)):
    for width in (0, 1, 2, 4, 30):
        case('ellipse', [2, 1, size[0], size[1]], width)
case('ellipse', [-10, -6, 40, 30], 3)
case('line', [3, 4], [40, 30])
case('line', [3, 4], [3, 30])
case('line', [3, 4], [40, 4])
case('line', [7, 7], [7, 7], 5)
case('line', [2.9, 3.7], [44.2, 9.9], 2)
case('line', [-0.5, 20], [-0.5, 3], 1)
for width in (2, 3, 4, 7, 10):
    case('line', [3, 30], [44, 5], width)
    case('line', [10, 2], [20, 34], width)
case('line', [-10, 18], [60, 18], 6)
case('lines', True, [[3, 3], [44, 6], [30, 32], [6, 25]], 3)
case('lines', False, [[3, 3], [44, 6], [30, 32]], 1)
case('lines', True, [[3, 3], [44, 30]], 4)
case('polygon', [[4, 4], [40, 8], [20, 32]])
case('polygon', [[4, 4], [40, 4], [40, 30], [4, 30]])
case('polygon', [[24, 2], [44, 30], [24, 20], [4, 30]])
case('polygon', [[5, 10], [40, 10], [20, 10]])
case('polygon', [[3, 3], [44, 3], [44, 18], [24, 18], [24, 32], [3, 32]])
case('polygon', [[3.7, 3.2], [44.9, 8.1], [20.5, 33.9]])
case('polygon', [[-8, -4], [60, 10], [10, 50]])
# Triangles whose edge needs pygame-ce's single precision (float) to land on the same pixel.
case('polygon', [[0, 0], [31, 7], [0, 7]])
case('polygon', [[3, 0], [34, 7], [40, 1]])
case('polygon', [[33, 0], [2, 7], [44, 7]])
case('polygon', [[4, 4], [40, 8], [20, 32]], 2)
case('polygon', [[4, 4], [40, 8], [20, 32], [8, 20]], 5)
for start, stop in ((0, math.pi / 2), (0.3, 2.5), (math.pi, 0), (1, 1), (-1, 4), (0, 2 * math.pi),
                    (2.0, 7.5)):
    for width in (0, 1, 3, 20):
        case('arc', [2, 2, 44, 32], start, stop, width)
case('arc', [10, 6, 20, 20], 0.5, 5.5, 2)
case('arc', [-12, -8, 40, 30], 0, math.pi, 4)

# Seeded random cases: the same file every time.
rand = random.Random(20261025)


def number():
    value = rand.randint(-12, W + 12)
    return value + rand.choice((0, 0, 0, 0.5, 0.25, 0.9)) * rand.choice((1, -1))


def point():
    return [number(), number()]


def size():
    return rand.randint(-4, 44)


for _ in range(80):
    case('rect', [rand.randint(-10, W), rand.randint(-10, H), size(), size()],
         rand.randint(-1, 12), rand.choice((0, 0, rand.randint(1, 20))),
         rand.choice((-1, rand.randint(0, 15))), rand.choice((-1, rand.randint(0, 15))),
         rand.choice((-1, rand.randint(0, 15))), rand.choice((-1, rand.randint(0, 15))))
for _ in range(80):
    quarters = [rand.choice((0, 0, 1)) for _ in range(4)] if rand.random() < 0.3 else [0, 0, 0, 0]
    case('circle', point(), rand.randint(0, 30) + rand.choice((0, 0.5)), rand.randint(-1, 14),
         *quarters)
for _ in range(80):
    case('ellipse', [rand.randint(-10, W), rand.randint(-10, H), size(), size()],
         rand.randint(-1, 16))
for _ in range(80):
    case('line', point(), point(), rand.randint(-1, 11))
for _ in range(80):
    count = rand.randint(3, 9)
    case('polygon', [point() for _ in range(count)], rand.choice((0, 0, 0, rand.randint(1, 6))))
for _ in range(80):
    case('arc', [rand.randint(-10, W), rand.randint(-10, H), size(), size()],
         rand.uniform(-7, 7), rand.uniform(-7, 7), rand.randint(-1, 16))
for _ in range(30):
    case('lines', rand.random() < 0.5, [point() for _ in range(rand.randint(2, 6))],
         rand.randint(1, 7))

with open(OUT, 'w', encoding='utf-8', newline='\n') as file:
    json.dump({'pygame': pygame.version.ver, 'width': W, 'height': H, 'cases': cases}, file,
              ensure_ascii=False, separators=(',', ':'))
    file.write('\n')
# The repository keeps the file as Biome formats it.
ROOT = os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')
BIOME = os.path.join(ROOT, 'node_modules', '.bin', 'biome.exe' if os.name == 'nt' else 'biome')
subprocess.run([BIOME, 'format', '--write', os.path.abspath(OUT)], check=True, cwd=ROOT,
               stdout=subprocess.DEVNULL)
print(f'{len(cases)} casos em {os.path.relpath(OUT)}', file=sys.stderr)

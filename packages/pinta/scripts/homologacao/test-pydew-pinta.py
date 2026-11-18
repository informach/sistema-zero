"""Executa o PyDew real com o leitor atual do Pinta e SDL, sem janela física."""
import json
import os
from pathlib import Path
import sys

os.environ['SDL_VIDEODRIVER'] = 'dummy'
os.environ['SDL_AUDIODRIVER'] = 'dummy'
os.environ['PYGAME_HIDE_SUPPORT_PROMPT'] = '1'
repo = Path(__file__).resolve().parents[4]
game = repo / 'packages/studio/src/examples/python/pygame/pydew-valley'
output = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else repo / '.tmp/pinta-pydew.png'
sys.path.insert(0, str(repo / 'packages/studio/src/runtime/python/pygame/py'))
sys.path.insert(1, str(game))
os.chdir(game)

import pygame
import pinta
from farm import Farm

pygame.init()
try:
    screen = pygame.display.set_mode((1280, 720))
    world = Farm()
    drawing = pinta.carregar_mapa('fazenda')
    assert len(drawing.camadas) == 16, 'PyDew perdeu camadas'
    assert len(world.solid_sprites) > 0, 'PyDew perdeu colisões'
    for frame in range(60):
        pygame.event.pump()
        world.run(1 / 60)
        pygame.display.flip()
    rgba = pygame.image.tobytes(screen, 'RGBA')
    colors = {rgba[i:i + 4] for i in range(0, len(rgba), 4)}
    assert len(colors) > 16, 'O jogo não desenhou o mapa'
    output.parent.mkdir(parents=True, exist_ok=True)
    pygame.image.save(screen, output)
    print(json.dumps({'game': 'PyDew Valley', 'frames': 60, 'layers': len(drawing.camadas),
                      'solids': len(world.solid_sprites), 'colors': len(colors),
                      'pygame': pygame.version.ver, 'screenshot': str(output)}))
finally:
    pygame.quit()

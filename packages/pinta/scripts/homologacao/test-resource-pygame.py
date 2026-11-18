"""Actual portable package, pixel samples at deterministic animation times."""
import json
from pathlib import Path
import sys
import pygame

root = Path(sys.argv[1])
sys.path.insert(0, str(root))
from pinta_cenario import Mundo

pygame.init()
pygame.display.set_mode((160, 128))
world = Mundo(root, 'recursos-qa')
original_clock = pygame.time.get_ticks
screen = pygame.Surface((160, 128), pygame.SRCALPHA)
samples = []
try:
    for elapsed in [0, 300, 600, 10000]:
        pygame.time.get_ticks = lambda: world.inicio_animacao + elapsed
        screen.fill((0, 0, 0, 0))
        world.desenhar(screen, camera=(0, 0), personagem=False)
        samples.append(list(screen.get_at((24, 24))))
finally:
    pygame.time.get_ticks = original_clock
    pygame.quit()
assert samples == [[255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 255, 255], [0, 0, 255, 255]], samples
print(json.dumps({'pygame_frames': samples, 'version': world.dados['version']}))

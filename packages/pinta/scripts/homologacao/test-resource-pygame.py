"""Actual portable package, pixel samples at deterministic animation times."""
import json
from pathlib import Path
import sys
import pygame

root = Path(sys.argv[1])
sys.path.insert(0, str(root))
from pinta_cenario import carregar_cenario

pygame.init()
pygame.display.set_mode((160, 128))
world = carregar_cenario(root / 'cenario.png')
layer_id = world.cena._scene['layers'][0]['id']
assert world.propriedade_camada(layer_id, 'score') == 0
ref = world.propriedade_camada(layer_id, 'resource')
path = world.recurso_imagem(ref)
assert path.get_at((8, 8)) == (255, 255, 0, 255)
tileset_id = world.cena._scene['tilesets'][0]['id']
assert world.propriedade_peca(tileset_id, 0, 'allowed') is False
assert world.propriedade_peca(tileset_id, 0, 'empty') == ''
assert world.objeto_por_id(world.propriedade_peca(tileset_id, 0, 'related'))['name'] == 'Árvore QA'
assert world.objeto_por_id('missing') is None
assert world.recurso_imagem('missing') is None
assert world.propriedade_peca(tileset_id, -1, 'allowed') is None
assert world.propriedade_peca(tileset_id, 0.5, 'allowed') is None
scene_version = world.cena._scene['version']
original_clock = pygame.time.get_ticks
screen = pygame.Surface((160, 128), pygame.SRCALPHA)
samples = []
try:
    for elapsed in [0, 300, 600, 10000]:
        screen.fill((0, 0, 0, 0))
        world.desenhar(screen, tempo=elapsed)
        samples.append(list(screen.get_at((24, 24))))
finally:
    pygame.time.get_ticks = original_clock
    world.descartar()
    pygame.quit()
assert samples == [[255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 255, 255], [0, 0, 255, 255]], samples
print(json.dumps({'pygame_frames': samples, 'references': True, 'version': scene_version}))

"""Real pygame-ce: the same body/outline probes in PNG 4 and the portable package."""
import copy
import importlib.util
import json
import os
import sys
from pathlib import Path
from unittest.mock import patch

os.environ['SDL_VIDEODRIVER'] = 'dummy'
os.environ['SDL_AUDIODRIVER'] = 'dummy'
os.environ['PYGAME_HIDE_SUPPORT_PROMPT'] = '1'
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'src/runtime/python/pygame/py'))
import pygame
import pinta

pygame.init()
screen = pygame.display.set_mode((640, 480))
folder = Path(sys.argv[1]).resolve()
fixture = json.loads((folder / 'physics-probes.json').read_text(encoding='utf-8'))
results = []
for scale in (1, 2):
    path = folder / f'physics-{scale}x.png'
    data = pinta.ler_dados(path)
    assert data['version'] == 4 and data['scene']['version'] == 3
    world = pinta.Mapa(path)
    assert world.versao == 4
    assert world.objeto_por_id('ellipse').colisao is True
    reference = world.objeto_por_id('affine/reference')
    assert reference.propriedades['alvo'] == 'affine/inner-ellipse'
    assert world.objeto_por_id(reference.propriedades['alvo']).colisao is True
    for probe in fixture['probes']:
        b = probe['box']
        rect = pygame.FRect(*(b[key] * scale for key in ('x', 'y', 'width', 'height')))
        actual = world.bloqueado(rect)
        assert actual is probe['blocked'], (scale, probe['name'], actual)
    screen.fill('#152238')
    world.desenhar(screen)
    pygame.image.save(screen, str(folder / f'physics-native-{scale}x.png'))
    results.append({'scale': scale, 'probes': len(fixture['probes']), 'scene': world.cena['version']})

spec = importlib.util.spec_from_file_location('pinta_cenario', folder / 'pygame/pinta_cenario.py')
portable = importlib.util.module_from_spec(spec)
spec.loader.exec_module(portable)
game = portable.Mundo(folder / 'pygame', fixture['scene']['name'])
for probe in fixture['probes']:
    b = probe['box']
    assert game.bloqueado(pygame.FRect(*(b[key] for key in ('x', 'y', 'width', 'height')))) is probe['blocked'], probe['name']
game.jogador = pygame.FRect(45, 20, 10, 10)
game.mover(70, 0)
assert 59 < game.jogador.right <= 64.01, game.jogador
game.desenhar(screen)
pygame.image.save(screen, str(folder / 'physics-portable.png'))

# Reject future/mislabelled versions and malformed geometry before native image decoding.
original = pinta.ler_dados(folder / 'physics-1x.png')
for change in (
    lambda data: data.update(version=5),
    lambda data: data.update(version=2),
    lambda data: data['scene'].update(version=4),
    lambda data: data['scene']['layers'][1]['objects'][2].update(collision=False),
    lambda data: data['scene']['layers'][1]['objects'][2].update(points=[{'x': 0, 'y': 0}] * 257),
):
    data = copy.deepcopy(original)
    change(data)
    with patch.object(pinta, '_ler_dados_png', return_value=data), patch.object(pygame.image, 'load') as decoding:
        try:
            pinta.Mapa(folder / 'physics-1x.png')
        except ValueError:
            pass
        else:
            raise AssertionError('Malformed geometry was accepted')
        decoding.assert_not_called()

print(json.dumps({'pygame': pygame.version.ver, 'platform': sys.platform, 'png': results, 'portableProbes': len(fixture['probes']), 'portableMovement': True, 'predecodeRefusals': 5}))
pygame.quit()

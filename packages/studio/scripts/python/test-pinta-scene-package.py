"""Regressão real do PNG v2 e do pacote portátil, gerados pela homologação do Pinta."""
import os
import sys
import shutil
import tempfile
from pathlib import Path

os.environ['SDL_VIDEODRIVER'] = 'dummy'
os.environ['SDL_AUDIODRIVER'] = 'dummy'
repo = Path(__file__).resolve().parents[4]
output = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else repo / 'output/pinta-cenarios'
sys.path.insert(0, str(repo / 'packages/studio/src/runtime/python/pygame/py'))
sys.path.insert(0, str(output / 'pygame'))
import pygame
import pinta
from pinta_cenario import Mundo

pygame.init()
pygame.display.set_mode((640, 480))
with tempfile.TemporaryDirectory() as directory:
    previous = Path.cwd()
    try:
        os.chdir(directory)
        Path('assets').mkdir()
        shutil.copyfile(output / 'vila-e-floresta.png', 'assets/vila.png')
        image = pinta.carregar_mapa('vila')
        world = Mundo(output / 'pygame', 'vila-e-floresta')
        assert len(image.camadas) == 18
        assert len(image.conjuntos) == 2
        assert image.cena['sets'] and image.cena['art']
        assert image.camada('Lugares').com_nome('Morador').propriedades['vida'] == 5
        assert len(image.solidos()) == len(world.solidos) > 0
        png = pygame.Surface((512, 384), pygame.SRCALPHA)
        portable = pygame.Surface((512, 384), pygame.SRCALPHA)
        clock = pygame.time.get_ticks
        pygame.time.get_ticks = lambda: 1234
        try:
            image.desenhar(png)
            image.desenhar(png, frente=True)
            world.desenhar(portable, camera=(0, 0), personagem=False)
            world.desenhar(portable, frente=True, camera=(0, 0), personagem=False)
        finally:
            pygame.time.get_ticks = clock
        assert pygame.image.tobytes(png, 'RGBA') == pygame.image.tobytes(portable, 'RGBA')
        pygame.image.save(portable, str(output / 'pygame-completo.png'))
        world.jogador.topleft = (96, 96)
        world.mover(0, 0)
        assert world.nome == 'cabana'
        world.jogador.topleft = (80, 32)
        world.mover(0, 0)
        assert world.nome == 'vila-e-floresta'
        print('Pinta cena: PNG v2 e pacote iguais; 18 camadas, 2 folhas, arte, conjunto e portas nos dois sentidos.')
    finally:
        os.chdir(previous)
pygame.quit()

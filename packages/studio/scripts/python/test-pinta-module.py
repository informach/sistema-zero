"""Checks the learner module ``pinta`` against PNGs carrying Pinta data (iTXt ``pinta``).

Run with a desktop pygame-ce 2.5.7 (SDL dummy driver):
    python -I packages/studio/scripts/python/test-pinta-module.py
"""
import json
import os
import struct
import sys
import tempfile
import zlib
from pathlib import Path

os.environ['SDL_VIDEODRIVER'] = 'dummy'
os.environ['SDL_AUDIODRIVER'] = 'dummy'
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'src/runtime/python/pygame/py'))

import pygame  # noqa: E402
import pinta  # noqa: E402


def with_pinta_data(png, data):
    """Insert the iTXt chunk right after IHDR, as the Studio derivation writes it."""
    return with_pinta_text(png, zlib.compress(json.dumps(data).encode('utf-8')))


def with_pinta_text(png, text):
    """An iTXt ``pinta`` chunk with these compressed bytes as they are (also broken data)."""
    body = b'pinta\0' + b'\x01\x00' + b'\0' + b'\0' + text
    chunk = struct.pack('>I', len(body)) + b'iTXt' + body
    chunk += struct.pack('>I', zlib.crc32(b'iTXt' + body) & 0xFFFFFFFF)
    ihdr_end = 8 + 8 + 13 + 4
    return png[:ihdr_end] + chunk + png[ihdr_end:]


def expect_error(action, kind, text):
    try:
        action()
    except kind as error:
        assert text in str(error), error
    else:
        raise AssertionError(f'expected {kind.__name__} with {text!r}')


def save(surface, name, data=None):
    path = Path('assets') / f'{name}.png'
    pygame.image.save(surface, str(path))
    if data is not None:
        path.write_bytes(with_pinta_data(path.read_bytes(), data))


def main():
    os.chdir(tempfile.mkdtemp())
    os.mkdir('assets')
    pygame.init()
    screen = pygame.display.set_mode((320, 240))
    # Sprite: 2 animations (3 and 2 frames) of 16x16, row per animation.
    sheet = pygame.Surface((48, 32), pygame.SRCALPHA)
    for column in range(3):
        sheet.fill((column * 80, 0, 0, 255), (column * 16, 0, 16, 16))
    for column in range(2):
        sheet.fill((0, column * 80 + 50, 0, 255), (column * 16, 16, 16, 16))
    save(sheet, 'heroi', {
        'format': 'pinta', 'version': 1, 'kind': 'sprite', 'name': 'heroi', 'scale': 2,
        'frameWidth': 16, 'frameHeight': 16, 'columns': 3, 'rows': 2,
        'animations': [{'name': 'correr', 'row': 0, 'frames': 3, 'fps': 10, 'loop': True},
                       {'name': 'pular', 'row': 1, 'frames': 2, 'fps': 6, 'loop': False}],
        'hitbox': {'x': 2, 'y': 1, 'width': 12, 'height': 15}})
    hero = pinta.carregar_sprite('heroi')
    assert hero.nomes == ['correr', 'pular'], hero.nomes
    frames = hero.animacao('correr')
    assert len(frames) == 3 and frames[2].get_at((0, 0))[:3] == (160, 0, 0)
    assert hero.animacao('pular')[1].get_at((5, 5))[:3] == (0, 130, 0)
    assert hero.fps('correr') == 10 and not hero.repete('pular')
    assert hero.caixa == pygame.Rect(2, 1, 12, 15)
    flipped = hero.animacao('correr', virar_x=True)
    assert flipped[0].get_size() == (16, 16) and flipped is not hero.animacao('correr', True)
    try:
        hero.animacao('voar')
    except KeyError as error:
        assert 'correr' in str(error)
    else:
        raise AssertionError('missing animation must fail')

    # Tileset of 3 tiles (8 px), columns 2.
    tiles = pygame.Surface((16, 16))
    tiles.fill((10, 10, 10))
    tiles.fill((200, 0, 0), (8, 0, 8, 8))
    tiles.fill((0, 0, 200), (0, 8, 8, 8))
    save(tiles, 'terreno', {'format': 'pinta', 'version': 1, 'kind': 'tileset', 'name': 'terreno',
                            'scale': 1, 'tileSize': 8, 'columns': 2, 'count': 3,
                            'solid': [1], 'platform': [2]})
    tileset = pinta.carregar_pecas('terreno')
    assert len(tileset) == 3 and tileset.solida(1) and tileset.plataforma(2)
    assert tileset[2].get_at((1, 1))[:3] == (0, 0, 200)

    # Map: atlas of two tilesets (second at y=16), a tile layer each and an object layer.
    atlas = pygame.Surface((16, 24))
    atlas.blit(tiles, (0, 0))
    atlas.fill((0, 200, 0), (0, 16, 8, 8))
    save(atlas, 'fase', {
        'format': 'pinta', 'version': 1, 'kind': 'map', 'name': 'fase', 'scale': 1,
        'tileSize': 8, 'cols': 3, 'rows': 2,
        'tilesets': [{'name': 'terreno', 'y': 0, 'columns': 2, 'count': 3, 'solid': [1],
                      'platform': [2]},
                     {'name': 'mato', 'y': 16, 'columns': 1, 'count': 1, 'solid': [],
                      'platform': []}],
        'layers': [
            {'type': 'tiles', 'name': 'Terreno', 'visible': True, 'front': False, 'tileset': 0,
             'cells': [1, -1, 2, 0, 1, -1]},
            {'type': 'tiles', 'name': 'Mato', 'visible': True, 'front': True, 'tileset': 1,
             'cells': [-1, 0, -1, -1, -1, -1]},
            {'type': 'objects', 'name': 'Entidades', 'visible': True, 'objects': [
                {'id': 'a', 'name': 'jogador', 'type': 'jogador', 'x': 4, 'y': 4, 'width': 0,
                 'height': 0, 'properties': {'vida': 3}},
                {'id': 'b', 'name': 'porta', 'type': 'saida', 'x': 16, 'y': 0, 'width': 8,
                 'height': 16, 'properties': {'destino': 'casa', 'aberta': True}}]}]})
    level = pinta.carregar_mapa('fase')
    assert level.tamanho == (24, 16) and len(level.camadas) == 3
    ground = level.camada('Terreno')
    cells = list(ground.tiles())
    assert [(x, y) for x, y, _ in cells] == [(0, 0), (2, 0), (0, 1), (1, 1)]
    assert cells[0][2].get_at((1, 1))[:3] == (200, 0, 0)
    assert ground.solidos() == [pygame.Rect(0, 0, 8, 8), pygame.Rect(8, 8, 8, 8)]
    assert ground.plataformas() == [pygame.Rect(16, 0, 8, 8)]
    grass = level.camada('Mato')
    assert grass.frente and next(grass.tiles())[2].get_at((0, 0))[:3] == (0, 200, 0)
    objects = level.camada('Entidades')
    player = objects.com_nome('jogador')
    assert (player.x, player.y, player.propriedades['vida']) == (4, 4, 3)
    door = level.objetos('saida')[0]
    assert door.properties['aberta'] is True and door.rect == pygame.FRect(16, 0, 8, 16)
    assert door.name == 'porta' and door.width == 8
    screen.fill('black')
    level.desenhar(screen, (10, 10))
    level.desenhar(screen, (10, 10), frente=True)
    assert screen.get_at((10 + 1, 10 + 1))[:3] == (200, 0, 0)  # cell (0, 0): solid tile 1
    assert screen.get_at((10 + 9, 10 + 1))[:3] == (0, 200, 0)  # cell (1, 0): front grass
    assert screen.get_at((10 + 17, 10 + 9))[:3] == (0, 0, 0)  # cell (2, 1): empty

    # A plain PNG has no Pinta data; the loaders explain what is expected.
    save(pygame.Surface((4, 4)), 'fundo')
    assert pinta.ler_dados('fundo') is None
    assert pinta.carregar_imagem('fundo').get_size() == (4, 4)
    try:
        pinta.carregar_mapa('fundo')
    except ValueError as error:
        assert 'Mapa com camadas e objetos' in str(error)
    else:
        raise AssertionError('a plain PNG is not a map')

    # An animation without frames, data that is not an object and a decompression bomb are
    # untrusted data: each fails with a clear message, never ZeroDivisionError or a huge buffer.
    save(sheet, 'vazio', {
        'format': 'pinta', 'version': 1, 'kind': 'sprite', 'name': 'vazio', 'scale': 1,
        'frameWidth': 16, 'frameHeight': 16, 'columns': 3, 'rows': 2,
        'animations': [{'name': 'parado', 'row': 0, 'frames': 0, 'fps': 1, 'loop': True}]})
    empty = pinta.carregar_sprite('vazio')
    assert empty.animacao('parado') == []
    expect_error(lambda: empty.quadro('parado', 3), ValueError, 'não tem quadros')
    plain = Path('assets/fundo.png').read_bytes()
    Path('assets/lista.png').write_bytes(with_pinta_text(plain, zlib.compress(b'[1, 2]')))
    expect_error(lambda: pinta.ler_dados('lista'), ValueError, 'estragados')
    Path('assets/quebrado.png').write_bytes(with_pinta_text(plain, b'nada disso e zlib'))
    expect_error(lambda: pinta.ler_dados('quebrado'), ValueError, 'estragados')
    bomb = zlib.compress(b'"' + b' ' * (pinta.MAXIMO_DE_DADOS + 1) + b'"', 9)
    Path('assets/bomba.png').write_bytes(with_pinta_text(plain, bomb))
    expect_error(lambda: pinta.ler_dados('bomba'), ValueError, 'grandes demais')
    print('pinta module ok')


main()

"""Checks the learner module ``pinta`` against PNGs carrying Pinta data (iTXt ``pinta``).

Run with a desktop pygame-ce 2.5.7 (SDL dummy driver):
    python -I packages/studio/scripts/python/test-pinta-module.py

Sem pygame instalado, as partes de lógica pura (versão dos dados, giros e espelhos da célula,
escolha do quadro da animação, compatibilidade dos dados versão 1) rodam com um ``pygame`` de
mentira, que só anota as chamadas:
    python3 -I packages/studio/scripts/python/test-pinta-module.py --sem-pygame
Os casos com pygame de verdade (pixels, fontes, janela) continuam só no modo normal.
"""
import base64
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

SEM_PYGAME = '--sem-pygame' in sys.argv


class _Superficie:
    """Uma Surface de mentira: guarda o tamanho e a lista de transformações que sofreu."""

    def __init__(self, tamanho=(16, 16), historia=()):
        self.tamanho, self.historia, self.desenhos = tuple(tamanho), tuple(historia), []

    def get_size(self):
        return self.tamanho

    def get_width(self):
        return self.tamanho[0]

    def get_height(self):
        return self.tamanho[1]

    def get_bitsize(self):
        return 32

    def subsurface(self, area):
        return _Superficie(tuple(area)[2:], self.historia + (('recorte', tuple(area)),))

    def fblits(self, itens):
        self.desenhos.extend(itens)

    def com(self, passo):
        return _Superficie(self.tamanho, self.historia + (passo,))


class _Retangulo(tuple):
    def __new__(cls, *valores):
        return super().__new__(cls, valores[0] if len(valores) == 1 else valores)


def _pygame_de_mentira():
    """Só o que as partes de lógica pura do ``pinta`` tocam; o resto falha alto se for chamado."""
    import types
    modulo = types.ModuleType('pygame')
    modulo.relogio = 0
    modulo.SRCALPHA = 65536
    modulo.Rect = modulo.FRect = _Retangulo
    modulo.Surface = _Superficie
    # Só a decodificação da imagem é substituída; o PNG iTXt e o módulo do aluno são reais.
    modulo.image = types.SimpleNamespace(load=lambda _caminho: _Superficie((32, 32)))
    modulo.time = types.SimpleNamespace(get_ticks=lambda: modulo.relogio)
    modulo.display = types.SimpleNamespace(get_init=lambda: False, get_surface=lambda: None)
    modulo.transform = types.SimpleNamespace(
        flip=lambda imagem, x, y: imagem.com(('espelho', bool(x), bool(y))) if x or y else imagem,
        rotate=lambda imagem, graus: imagem.com(('giro', graus)))
    return modulo


if SEM_PYGAME:
    sys.modules['pygame'] = _pygame_de_mentira()

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


def plataformas_de_mao_unica(atlas):
    """Formato 1, sem cena: a peça de plataforma segura por cima, como no Pinta e no JS (23/11)."""
    sheet = {'name': 'terreno', 'y': 0, 'columns': 2, 'count': 3, 'solid': [1], 'platform': [2]}
    hidden = [-1] * 20
    hidden[3 * 4] = 2
    save(atlas, 'plataformas', {
        'format': 'pinta', 'version': 1, 'kind': 'map', 'name': 'plataformas', 'scale': 1,
        'tileSize': 8, 'cols': 4, 'rows': 5,
        'tilesets': [sheet],
        'layers': [
            # Plataforma em x 8–24, y 16–24; chão sólido na última linha (y 32–40).
            {'type': 'tiles', 'name': 'Terreno', 'visible': True, 'front': False, 'tileset': 0,
             'cells': [-1] * 8 + [-1, 2, 2, -1] + [-1] * 4 + [1, 1, 1, 1]},
            # Uma camada escondida não joga, como no compositor das cenas (x 0–8, y 24–32).
            {'type': 'tiles', 'name': 'Escondida', 'visible': False, 'front': False, 'tileset': 0,
             'cells': hidden},
        ]})
    world = pinta.carregar_mapa('plataformas')
    body = pygame.FRect
    before, after = body(10, 4, 4, 4), body(10, 14, 4, 4)
    support = world.pouso(before, after)
    assert support == body(10, 12, 4, 4), support
    assert before == body(10, 4, 4, 4) and after == body(10, 14, 4, 4)
    for _ in range(20):
        support = world.pouso(support, support.move(0, 0.5))
        assert support == body(10, 12, 4, 4), support
    assert world.pouso(body(10, 20, 4, 4), body(10, 6, 4, 4)) is None  # subindo, atravessa
    assert world.pouso(body(10, 17, 4, 4), body(10, 19, 4, 4)) is None  # começou abaixo do topo
    assert world.pouso(before, after, 0) is None  # vista de cima
    assert world.pouso(body(26, 4, 4, 4), body(26, 14, 4, 4)) is None  # fora da plataforma
    assert world.pouso(body(2, 18, 4, 4), body(2, 26, 4, 4)) is None  # a camada escondida não segura
    assert not world.bloqueado(body(10, 17, 4, 4))  # a plataforma não é parede
    inverted = world.pouso(body(10, 26, 4, 4), body(10, 20, 4, 4), -1)
    assert inverted == body(10, 24, 4, 4), inverted


def objetos_do_mapa_com_conjuntos(salvar):
    """O wrapper público deve expor os objetos que o compositor realmente executa."""
    import copy
    for escala in (1, 2):
        objetos = [
            {'id': 'copy', 'name': 'Casa', 'type': 'casa', 'shape': 'set', 'setId': 'house',
             'x': 0, 'y': 0, 'width': 16, 'height': 16, 'flipX': True, 'properties': {}},
            {'id': 'outside', 'name': 'Fora', 'type': 'item', 'x': 20, 'y': 20,
             'width': 2, 'height': 2, 'properties': {}}]
        layers = [
            {'id': 'ground', 'kind': 'tiles', 'name': 'Chão', 'tilesetId': 't', 'cells': [-1] * 4},
            {'id': 'group', 'kind': 'group', 'name': 'Vila', 'offsetX': 3, 'offsetY': 5},
            {'id': 'objects', 'kind': 'objects', 'name': 'Objetos', 'parentId': 'group', 'objects': objetos},
            {'id': 'hidden', 'kind': 'objects', 'name': 'Escondidos', 'visible': False, 'objects': [
                {'id': 'hidden', 'name': 'Escondido', 'type': 'item', 'x': 1, 'y': 1,
                 'width': 1, 'height': 1, 'properties': {}}]}]
        # The original scene-v1 exporter already wrote an ID and embedded PNGs.
        # Keep this legacy fixture on that real wire contract, including unused art.
        image = 'data:image/png;base64,' + base64.b64encode(png_minimo(None, 16, 16)).decode()
        scene = {'version': 1, 'id': 'vila', 'name': 'vila', 'cols': 2, 'rows': 2, 'tileSize': 16,
                 'tilesets': [{'id': 't', 'name': 'pecas', 'columns': 1, 'count': 1,
                               'solid': [], 'platform': [], 'image': image}],
                 'layers': layers, 'sets': [{'id': 'house', 'name': 'Casa', 'cols': 1, 'rows': 1,
                    'layers': [{'id': 'inside', 'kind': 'objects', 'name': 'Dentro', 'objects': [
                        {'id': 'a', 'name': 'Chave', 'type': 'item', 'x': 2, 'y': 0,
                         'width': 4, 'height': 4, 'properties': {
                             'local': {'type': 'object', 'value': 'b'},
                             'external': {'type': 'object', 'value': 'outside'},
                             'vida': {'type': 'int', 'value': 3}}},
                        {'id': 'b', 'name': 'Baú', 'type': 'item', 'x': 8, 'y': 8,
                         'width': 2, 'height': 2, 'properties': {}}]}]}]}
        # As camadas legadas do PNG já vêm na escala de apresentação; a cena conserva a autoral.
        legacy = copy.deepcopy(layers)
        for layer in legacy:
            layer['type'] = layer.pop('kind')
            if layer['type'] == 'tiles':
                layer['tileset'] = 0
            for key in ('offsetX', 'offsetY'):
                if key in layer:
                    layer[key] *= escala
            for obj in layer.get('objects', []):
                for key in ('x', 'y', 'width', 'height'):
                    obj[key] *= escala
        data = {'format': 'pinta', 'version': 2, 'kind': 'map', 'name': 'vila', 'scale': escala,
                'tileSize': 16 * escala, 'cols': 2, 'rows': 2,
                'tilesets': [{'name': 'pecas', 'y': 0, 'columns': 1, 'count': 1, 'solid': [], 'platform': []}],
                'layers': legacy, 'scene': scene}
        nome = f'conjunto-{escala}'
        salvar(nome, data)
        mapa = pinta.carregar_mapa(nome)
        publicos = mapa.objetos()
        ids = [obj.id for obj in publicos]
        assert ids == ['copy', 'outside', 'copy/a', 'copy/b'], ids
        assert ids == [obj['id'] for obj in mapa._cena.objetos]
        assert [obj.id for obj in mapa.objetos('item')] == ['outside', 'copy/a', 'copy/b']
        assert mapa.objetos('inexistente') == []
        a, b = publicos[2:]
        assert (a.x, a.y, a.largura, a.altura, a.giro) == (17 * escala, 9 * escala, 4 * escala, 4 * escala, 180)
        assert (b.x, b.y, b.largura, b.altura, b.giro) == (11 * escala, 15 * escala, 2 * escala, 2 * escala, 180)
        assert a.propriedades == {'local': 'copy/b', 'external': 'outside', 'vida': 3}
        assert a.tipos_das_propriedades == {'local': 'object', 'external': 'object', 'vida': 'int'}
        assert a is mapa.objetos('item')[1], 'consultar novamente conserva a identidade do objeto'
        for change in ('id', 'image', 'atlas'):
            broken = copy.deepcopy(data)
            if change == 'id':
                broken['scene'].pop('id')
            elif change == 'image':
                broken['scene']['tilesets'][0]['image'] = 'unused.png'
            else:
                broken['tilesets'][0]['y'] = 100000
            salvar(nome, broken)
            expect_error(lambda: pinta.carregar_mapa(nome), ValueError, 'cenário')
        # v1 e v2 sem cena continuam lendo as camadas e devolvendo as mesmas instâncias.
        for versao in (1, 2):
            antigo = dict(data, version=versao)
            antigo.pop('scene')
            salvar(nome, antigo)
            mapa_antigo = pinta.carregar_mapa(nome)
            assert mapa_antigo._cena is None
            assert [obj.id for obj in mapa_antigo.objetos()] == ['copy', 'outside', 'hidden']
            assert mapa_antigo.objetos('item')[0] is mapa_antigo.camada('Objetos')[1]
    return 12


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
    plataformas_de_mao_unica(atlas)

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

    # Format 2: sixteen layers, a group, offset/opacity, all Tiled flags and typed objects.
    asymmetric = pygame.Surface((8, 8), pygame.SRCALPHA)
    asymmetric.fill((255, 0, 0), (0, 0, 4, 4))
    asymmetric.fill((0, 255, 0), (4, 0, 4, 4))
    asymmetric.fill((0, 0, 255), (0, 4, 4, 4))
    asymmetric.fill((255, 255, 255), (4, 4, 4, 4))
    layers = [{'id': 'g', 'type': 'group', 'name': 'Vila', 'visible': True, 'opacity': 0.5, 'offsetX': 2}]
    for n in range(14):
        layers.append({'id': str(n), 'parentId': 'g', 'type': 'tiles', 'name': f'Camada {n}', 'visible': True, 'tileset': 0, 'cells': [4096 if n == 0 else -1], 'front': False})
    layers.append({'id': 'o', 'type': 'objects', 'name': 'Objetos', 'parentId': 'g', 'objects': [{'id': 'porta', 'name': 'Porta', 'type': 'porta', 'shape': 'ellipse', 'rotation': 45, 'role': 'door', 'width': 8, 'height': 8, 'x': 1, 'y': 2, 'properties': {'vidas': {'type': 'int', 'value': 3}}}]})
    save(asymmetric, 'v2', {'format': 'pinta', 'version': 2, 'kind': 'map', 'name': 'v2', 'tileSize': 8, 'cols': 1, 'rows': 1, 'tilesets': [{'name': 'arte', 'columns': 1, 'count': 1, 'solid': [], 'platform': [], 'animations': {'0': [{'tile': 0, 'duration': 100}]}}], 'layers': layers})
    modern = pinta.carregar_mapa('v2')
    assert len(modern.camadas) == 16
    assert modern.camada('Camada 0').peca(0, 0) == 0
    assert modern.camada('Camada 0').opacidade == 0.5
    assert modern.camada('Camada 0').deslocamento == (2, 0)
    flipped = next(modern.camada('Camada 0').tiles())[2]
    assert flipped.get_at((0, 0))[:3] == (0, 255, 0)
    door = modern.camada('Objetos').com_nome('Porta')
    assert door.forma == 'ellipse' and door.giro == 45 and door.papel == 'door'
    assert door.x == 3 and door.propriedades['vidas'] == 3
    pixels = pygame.Surface((16, 16), pygame.SRCALPHA)
    modern.desenhar(pixels)
    assert 120 <= pixels.get_at((2, 0)).a <= 130, pixels.get_at((2, 0))

    objetos_do_mapa_com_conjuntos(lambda nome, dados: save(
        pygame.Surface((32, 32), pygame.SRCALPHA), nome, dados))

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



def png_minimo(dados, largura=1, altura=1):
    """PNG RGBA transparente real, sem depender do decoder ou do pygame de teste."""
    def bloco(tipo, corpo):
        return struct.pack('>I', len(corpo)) + tipo + corpo + struct.pack('>I', zlib.crc32(tipo + corpo) & 0xFFFFFFFF)
    png = (b'\x89PNG\r\n\x1a\n'
           + bloco(b'IHDR', struct.pack('>IIBBBBB', largura, altura, 8, 6, 0, 0, 0))
           + bloco(b'IDAT', zlib.compress(bytes((1 + largura * 4) * altura)))
           + bloco(b'IEND', b''))
    return with_pinta_data(png, dados) if dados is not None else png


def logica_sem_pygame():
    """Casos que não precisam de pixels: rodam com o pygame de mentira (e nada de janela)."""
    os.chdir(tempfile.mkdtemp())
    os.mkdir('assets')
    conferidos = 0

    # 1. Versão dos dados: 1 e 2 entram; 3 é de um Pinta mais novo; PNG comum devolve None.
    for versao in (1, 2):
        Path('assets/v.png').write_bytes(png_minimo({'format': 'pinta', 'version': versao, 'kind': 'map'}))
        assert pinta.ler_dados('v')['version'] == versao
        conferidos += 1
    for errado in ({'format': 'pinta', 'version': 3}, {'format': 'pinta'}, {'format': 'outro', 'version': 1}):
        Path('assets/v.png').write_bytes(png_minimo(errado))
        expect_error(lambda: pinta.ler_dados('v'), ValueError, 'foi feito por um Pinta mais novo')
        conferidos += 1
    Path('assets/comum.png').write_bytes(png_minimo(None))
    assert pinta.ler_dados('comum') is None
    Path('assets/texto.png').write_bytes(b'nada de PNG')
    expect_error(lambda: pinta.ler_dados('texto'), ValueError, 'não é um PNG')
    conferidos += 2

    # 2. Giros e espelhos: bits 12, 13 e 14 da célula, os mesmos do Tiled.
    folha = _Superficie((64, 32))
    pecas = pinta.Pecas(folha, 16, 4, 8, [1], [2], 'chao')
    assert len(pecas.pecas) == 8 and pecas.pecas[5].historia == (('recorte', (16, 16, 16, 16)),)
    H, V, D = 4096, 8192, 16384
    base = pecas.pecas[3].historia
    assert pecas.imagem(3) is pecas.pecas[3]
    esperado = {
        H: (('espelho', True, False),),
        V: (('espelho', False, True),),
        H | V: (('espelho', True, True),),
        D: (('giro', 90), ('espelho', False, True)),
        D | H: (('giro', 90), ('espelho', False, True), ('espelho', True, False)),
        D | V: (('giro', 90), ('espelho', False, True), ('espelho', False, True)),
        D | H | V: (('giro', 90), ('espelho', False, True), ('espelho', True, True)),
    }
    for flags, passos in esperado.items():
        virada = pecas.imagem(3 | flags)
        assert virada.historia == base + passos, (flags, virada.historia)
        assert pecas.imagem(3 | flags) is virada, 'a peça virada fica guardada'
        conferidos += 1
    assert pecas.solida(1) and not pecas.solida(3) and pecas.plataforma(2)

    # 3. Animação: o quadro sai do tempo; duração total zero não divide por zero.
    pecas.animacoes = {'0': [{'tile': 4, 'duration': 100}, {'tile': 5, 'duration': 200}]}
    for tempo, quadro in ((0, 4), (99, 4), (100, 5), (299, 5), (300, 4), (650, 4), (710, 5)):
        assert pecas.imagem(0, tempo) is pecas.pecas[quadro], (tempo, quadro)
        conferidos += 1
    pygame.relogio = 150
    assert pecas.imagem(0) is pecas.pecas[5], 'sem tempo dado, vale o relógio do pygame'
    assert pecas.imagem(0 | H, 150).historia == pecas.pecas[5].historia + (('espelho', True, False),)
    assert pecas.imagem(1, 150) is pecas.pecas[1], 'peça sem animação fica como está'
    pecas.animacoes = {'0': [{'tile': 4, 'duration': 0}, {'tile': 5, 'duration': 0}], '1': []}
    assert pecas.imagem(0, 123) is pecas.pecas[0], 'animação de duração zero fica parada'
    assert pecas.imagem(1, 123) is pecas.pecas[1]
    conferidos += 5

    # 4. Dados versão 1: a camada escondida, chamada direto, desenha como sempre desenhou.
    class MapaDeTeste:
        colunas, linhas = 2, 2

    def camada(versao, **extra):
        mapa = MapaDeTeste()
        if versao is not None:
            mapa.versao = versao
        return pinta.CamadaDePecas(dict({'name': 'Chão', 'cells': [0, 1, -1, 3 | H]}, **extra), mapa, pecas)

    pecas.animacoes = {}
    for versao in (None, 1):
        escondida = camada(versao, visible=False)
        tela = _Superficie((64, 64))
        escondida.desenhar(tela, (3.9, -2.2))
        # Exatamente a conta de antes: int() do deslocamento, sem parallax nem deslocamento da camada.
        assert [lugar for _imagem, lugar in tela.desenhos] == [(3, -2), (19, -2), (19, 14)], tela.desenhos
        assert tela.desenhos[0][0] is pecas.pecas[0] and tela.desenhos[1][0] is pecas.pecas[1]
        conferidos += 1
    for extra in ({'visible': False}, {'collision': True}, {'opacity': 0}):
        tela = _Superficie((64, 64))
        camada(2, **extra).desenhar(tela)
        assert tela.desenhos == [], extra
        conferidos += 1
    tela = _Superficie((64, 64))
    camada(2, offsetX=4, offsetY=6, parallaxX=0.5, parallaxY=2).desenhar(tela, (10, 10))
    assert [lugar for _imagem, lugar in tela.desenhos] == [(9, 26), (25, 26), (25, 42)], tela.desenhos
    visivel = camada(1)
    assert visivel.peca(1, 1) == 3 and visivel.peca(0, 1) == -1 and visivel.peca(9, 9) == -1
    assert [x for x, _y, _imagem in visivel.tiles()] == [0, 1, 1]
    assert visivel.solidos() == [(16, 0, 16, 16)] and visivel.plataformas() == []
    assert camada(2, collision=True, offsetX=2).solidos() == [(2, 0, 16, 16), (18, 0, 16, 16), (18, 16, 16, 16)]
    conferidos += 5

    # 5. A cena completa (o mesmo código do pacote portátil): camada efetiva e animação parada.
    cena = pinta._CenaCompleta.__new__(pinta._CenaCompleta)
    camadas = [{'id': 'g', 'kind': 'group', 'visible': False, 'opacity': 0.5, 'offsetX': 4, 'parallaxY': 2},
               {'id': 'c', 'kind': 'tiles', 'parentId': 'g', 'opacity': 0.5, 'offsetX': 1, 'offsetY': 3}]
    assert cena.efetiva(camadas, camadas[1]) == {'visible': False, 'opacity': 0.25, 'x': 5, 'y': 3, 'px': 1, 'py': 2}
    cena.tamanho, cena.pecas = 16, {}
    cena.imagem = lambda caminho: folha
    parado = {'id': 't', 'image': 'x.png', 'columns': 4, 'animations': {'2': [{'tile': 6, 'duration': 0}]}}
    assert cena.peca(parado, 2, 500).historia == (('recorte', (32, 0, 16, 16)),)
    vivo = {'id': 'u', 'image': 'x.png', 'columns': 4, 'animations': {'2': [{'tile': 6, 'duration': 50}]}}
    assert cena.peca(vivo, 2 | D, 500).historia == (('recorte', (32, 16, 16, 16)), ('giro', 90), ('espelho', False, True))
    assert pinta.Objeto({'name': 'bau', 'properties': {'ouro': {'type': 'int', 'value': 3}, 'aberto': True}}).propriedades == {'ouro': 3, 'aberto': True}
    conferidos += 4
    conferidos += objetos_do_mapa_com_conjuntos(
        lambda nome, dados: Path('assets', nome + '.png').write_bytes(png_minimo(dados, 32, 32)))
    print(f'pinta (sem pygame): {conferidos} conferências de lógica pura passaram.')


if SEM_PYGAME:
    logica_sem_pygame()
else:
    main()

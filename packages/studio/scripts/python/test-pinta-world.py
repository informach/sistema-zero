"""Real pygame-ce: the captured world survives transitions, without resolving door text as paths."""
import json
import base64
import copy
import os
import sys
import struct
import tempfile
import zlib
from pathlib import Path
from unittest.mock import patch

os.environ['SDL_VIDEODRIVER'] = 'dummy'
os.environ['SDL_AUDIODRIVER'] = 'dummy'
os.environ['PYGAME_HIDE_SUPPORT_PROMPT'] = '1'
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'src/runtime/python/pygame/py'))
if len(sys.argv) > 2:
    # Run the exact module exported by the browser proof, rather than the source checkout.
    sys.path.insert(0, str(Path(sys.argv[2]).resolve()))
import pygame
import pinta

pygame.init()
pygame.display.set_mode((640, 480))
folder = Path(sys.argv[1]).resolve()
results = []

def with_data(png, data):
    body = b'pinta\0\1\0\0\0' + zlib.compress(json.dumps(data).encode('utf-8'))
    typed = b'iTXt' + body
    chunk = struct.pack('>I', len(body)) + typed + struct.pack('>I', zlib.crc32(typed))
    # The producer always puts exactly one data chunk immediately after IHDR.
    old_size = struct.unpack_from('>I', png, 33)[0]
    return png[:33] + chunk + png[45 + old_size:]

def refusals(path):
    png = path.read_bytes()
    original = pinta.ler_dados(path)
    failures = []
    def invalid(change):
        data = copy.deepcopy(original)
        change(data)
        failures.append(data)
    invalid(lambda d: d.update(version=4))
    invalid(lambda d: d['world'].update(version=2))
    invalid(lambda d: d['world'].update(rootId='outro'))
    invalid(lambda d: d['world']['maps'].append(copy.deepcopy(d['world']['maps'][0])))
    invalid(lambda d: d['world']['maps'][0].update(png='data:image/png;base64,???'))
    invalid(lambda d: d.update(scale=float('nan')))
    invalid(lambda d: d['scene'].pop('tileSize'))
    invalid(lambda d: d['tilesets'][0].update(y=100000))
    invalid(lambda d: d['tilesets'][1].update(y=0))
    invalid(lambda d: next(obj for layer in d['scene']['layers'] for obj in layer.get('objects', []) if obj.get('setId')).update(width=12288, height=12288))
    invalid(lambda d: next(obj for layer in d['scene']['layers'] for obj in layer.get('objects', []) if obj.get('setId')).update(width=2048, height=2048, rotation=45))
    def many_buffers(data):
        layer = next(layer for layer in data['scene']['layers'] if any(obj.get('setId') for obj in layer.get('objects', [])))
        instance = next(obj for obj in layer['objects'] if obj.get('setId'))
        layer['objects'].extend(dict(copy.deepcopy(instance), id=f'copy-{index}', width=1024, height=1024) for index in range(9))
    invalid(many_buffers)
    invalid(lambda d: next(layer for layer in d['scene']['layers'] if layer['kind'] == 'tiles').update(cells=[]))
    child_png = base64.b64decode(original['world']['maps'][0]['png'].split(',')[1])
    child_data = pinta._ler_dados_png(child_png, 'cabana')
    child_data['world'] = {'version': 1, 'rootId': child_data['scene']['id'], 'maps': []}
    invalid(lambda d: d['world']['maps'][0].update(png='data:image/png;base64,' + base64.b64encode(with_data(child_png, child_data)).decode()))
    with tempfile.TemporaryDirectory() as directory:
        for index, data in enumerate(failures):
            target = Path(directory) / f'bad-{index}.png'
            target.write_bytes(with_data(png, data))
            # Every case must be refused by the public loader before decoding an image.
            with patch.object(pinta, '_imagem_em_memoria', side_effect=AssertionError('decoded an invalid world')):
                try:
                    pinta.carregar_mapa(target)
                except ValueError:
                    pass
                except AssertionError as error:
                    raise AssertionError(f'Invalid world {index} reached the decoder') from error
                else:
                    raise AssertionError(f'Invalid world {index} was accepted')
    encoded = b'{ "value": 1.000 }'
    budget = [len(encoded)]
    assert pinta._ler_json(zlib.compress(encoded), True, 'budget', orcamento=budget) == {'value': 1}
    assert budget == [0], budget  # Actual inflated bytes, not reserialized JSON length.
    for compressed, limit in [(zlib.compress(encoded), len(encoded)-1), (zlib.compress(encoded)[:-1], 100), (zlib.compress(encoded)+b'trailing', 100)]:
        try:
            pinta._ler_json(compressed, True, 'budget', limite=limit)
        except ValueError:
            pass
        else:
            raise AssertionError('An oversized or truncated compressed stream was accepted')
    def inflated_size(image):
        length = struct.unpack_from('>I', image, 33)[0]
        return len(zlib.decompress(image[51:41 + length]))
    # Each JSON fits on its own; only their combined size exceeds the supplied world budget.
    total = inflated_size(png) + inflated_size(child_png)
    with patch.object(pinta, 'MUNDO_MAX_DADOS', total - 1), patch.object(pinta, '_imagem_em_memoria', side_effect=AssertionError('decoded an oversized world')):
        try:
            pinta.carregar_mapa(path)
        except ValueError:
            pass
        else:
            raise AssertionError('The child ignored the remaining metadata budget')
    return len(failures) + 5

def colliding_names(path):
    png = path.read_bytes()
    data = pinta.ler_dados(path)
    child_png = base64.b64decode(data['world']['maps'][0]['png'].split(',')[1])
    child = pinta._ler_dados_png(child_png, 'cabana')
    # The root's ID equals the destination's NAME. Typed references must still choose the ID.
    data['scene']['id'] = data['world']['rootId'] = 'cabana'
    child['scene']['id'] = 'interior'
    data['world']['maps'][0].update(id='interior', png='data:image/png;base64,' + base64.b64encode(with_data(child_png, child)).decode())
    with tempfile.TemporaryDirectory() as directory:
        target = Path(directory) / 'collision.png'
        target.write_bytes(with_data(png, data))
        root = pinta.carregar_mapa(target)
        door = next(obj for obj in root.objetos() if obj.id == 'door')
        with patch('builtins.open', side_effect=AssertionError('A destination tried to read a file')):
            assert root.abrir_destino(door).nome == 'cabana'
            door.tipos_das_propriedades['destino'] = 'asset'
            assert root.abrir_destino(door).nome == 'vila-e-floresta'
            assert root.abrir_lugar('cabana').nome == 'vila-e-floresta'
            door.propriedades.clear()
            assert root.abrir_destino(door) is None
    return 4


def memory_images(path):
    png = path.read_bytes()
    reference = pinta._imagem_em_memoria(png)
    decoded_paths = []
    original_load = pygame.image.load
    def load_temporary(path):
        decoded_paths.append(Path(path))
        assert Path(path).is_absolute()
        assert Path(path).name == 'image.png'
        assert Path(path).read_bytes() == png
        return original_load(path)
    with patch.object(sys, 'platform', 'emscripten'), patch.object(pygame.image, 'load', side_effect=load_temporary):
        actual = pinta._imagem_em_memoria(png)
    assert pygame.image.tobytes(actual, 'RGBA') == pygame.image.tobytes(reference, 'RGBA')
    assert decoded_paths and all(not path.parent.exists() for path in decoded_paths)
    failed_paths = []
    def invalid_image(path):
        failed_paths.append(Path(path))
        return original_load(path)
    with patch.object(sys, 'platform', 'emscripten'), patch.object(pygame.image, 'load', side_effect=invalid_image):
        try:
            pinta._imagem_em_memoria(b'not a PNG')
        except pygame.error:
            pass
        else:
            raise AssertionError('SDL must reject a corrupt image')
    assert failed_paths and all(not path.parent.exists() for path in failed_paths)
    return 2

try:
    for scale, name in [(1, 'vila-mundo'), (2, 'vila-mundo-2x')]:
        root = pinta.carregar_mapa(str(folder / f'{name}.png'))
        assert len(root.camadas) == 18
        assert root.ponto_inicial() == (32 * scale, 32 * scale)
        assert root.solidos(), 'The exported scene must contain real collision geometry'
        frames = []
        for time in [0, 200]:
            surface = pygame.Surface((640, 480), pygame.SRCALPHA)
            with patch('pygame.time.get_ticks', return_value=root._cena.inicio_animacao + time):
                root.desenhar(surface)
            frames.append(pygame.image.tobytes(surface, 'RGBA'))
        assert frames[0] != frames[1], 'The water animation must change real rendered pixels'
        door = next(obj for obj in root.objetos() if obj.id == 'door')
        # Neither a valid destination nor an invalid door can read an arbitrary file.
        with patch('builtins.open', side_effect=AssertionError('A door tried to read a file')):
            child = root.abrir_destino(door)
            assert child.nome == 'cabana'
            assert child.tamanho == (128 * scale, 128 * scale)
            assert child.ponto_inicial() == (32 * scale, 32 * scale)
            back = child.abrir_destino(next(obj for obj in child.objetos() if obj.papel == 'door'))
            assert back.tamanho == root.tamanho
            assert len(back.camadas) == 18
            assert root.nome == 'vila-e-floresta'
            door.propriedades['destino'] = '../outro-arquivo'
            try:
                root.abrir_destino(door)
            except (KeyError, ValueError):
                pass
            else:
                raise AssertionError('A missing destination must be rejected')
        surface = pygame.Surface((640, 480), pygame.SRCALPHA)
        back.desenhar(surface)
        back.desenhar(surface, frente=True)
        pixels = pygame.image.tobytes(surface, 'RGBA')
        colors = len(set(pixels[offset:offset+4] for offset in range(0, len(pixels), 4)))
        assert colors > 16, colors
        pygame.image.save(surface, str(folder / f'{name}-render.png'))
        results.append({'scale': scale, 'layers': len(root.camadas), 'destinationLayers': len(child.camadas),
                        'solids': len(root.solidos()), 'colors': colors, 'door': child.nome})
    memory = memory_images(folder / 'vila-mundo.png')
    rejected = refusals(folder / 'vila-mundo.png')
    resolution = colliding_names(folder / 'vila-mundo.png')
    if len(sys.argv) > 2:
        exported = pinta.carregar_mapa(Path(sys.argv[2]).resolve() / 'assets/vila.png')
        assert len(exported.camadas) == 18
        assert exported.abrir_destino(next(o for o in exported.objetos() if o.id == 'door')).nome == 'cabana'
    print(json.dumps({'pygame': pygame.version.ver, 'worlds': results, 'refusalsAndBudgets': rejected, 'resolutionChecks': resolution,
                      'exportedModule': len(sys.argv) > 2, 'memoryImageChecks': memory}, ensure_ascii=False))
finally:
    pygame.quit()

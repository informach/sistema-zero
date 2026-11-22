"""Contrato do cenário compilado com o motor Python real do Estúdio, sem janela nativa."""
import copy
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import struct
import sys
import tempfile
import unittest

sys.path.insert(0, sys.argv.pop(1))
import _szraylib
from _szraylib import _rt

ROOT = Path(tempfile.mkdtemp(prefix='sz-cenario-raylib-')).resolve()
MODEL = Path(__file__).resolve().parents[5] / 'scripts/raylib/scenes/assets/models/molda-pesos.glb'
os.chdir(ROOT)
FRAMES = []


def transport(header, payload):
    FRAMES.append((json.loads(header), bytes(payload)))
    return json.dumps({'now': 1000, 'events': []}), None


_szraylib.configure(transport, None, str(ROOT), '3d')
import pyray as P
import cenario

P.init_window(320, 200, 'Cenário')
IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]


def fixture(folder):
    folder.mkdir()
    (folder / 'models').mkdir()
    original = MODEL.read_bytes()
    n = struct.unpack_from('<I', original, 12)[0]
    d = json.loads(original[20:20 + n])
    d['skins'] = d['skins'][:1]
    for no in d['nodes']:
        if no.get('skin', 0) > 0:
            no.pop('mesh', None)
            no.pop('skin', None)
    body = json.dumps(d).encode()
    body += b' ' * (-len(body) % 4)
    restante = original[20 + n:]
    novo = struct.pack('<5I', 0x46546c67, 2, 20 + len(body) + len(restante), len(body), 0x4e4f534a) + body + restante
    (folder / 'models/pessoa.glb').write_bytes(novo)
    b = (folder / 'models/pessoa.glb').read_bytes()
    box = {'min': {'x': -1, 'y': 0, 'z': -1}, 'max': {'x': 1, 'y': 2, 'z': 1}}
    return {
        'formato': 'molda-cena-compilada', 'versao': 1, 'nome': 'Praça',
        'unidade': 'metro', 'eixoVertical': 'y',
        'fonte': {'cenario': 'c', 'revisao': 1, 'digest': 'a' * 64},
        'arquivos': [{'caminho': 'models/pessoa.glb', 'bytes': len(b),
                      'digest': hashlib.sha256(b).hexdigest(), 'mime': 'model/gltf-binary',
                      'papel': 'modelo'}],
        'nos': [{'id': 'pessoa', 'entidade': 'pessoa', 'arquivo': 'models/pessoa.glb',
                 'matriz': IDENTITY[:], 'volume': box, 'preservarHierarquia': True}],
        'entidades': [{'id': 'pessoa', 'nome': 'Morador', 'tipo': 'objeto', 'grupo': None,
                       'oculto': False, 'propriedades': {'conversa': 'Olá'}}],
        'colisoes': [{'id': 'parede', 'entidade': 'pessoa', 'tipo': 'caixa',
                      'arquivo': 'models/pessoa.glb', 'matriz': IDENTITY[:], 'volume': box}],
        'marcadores': [{'id': 'inicio', 'nome': 'Início', 'posicao': {'x': 3, 'y': 0, 'z': 4},
                        'giro': 0, 'objeto': None, 'configuracao': {'tipo': 'inicio', 'principal': True}}],
        'aguas': [], 'caminhos': [], 'licencas': [], 'texturas': [],
        'fontes': {'modelos': [], 'texturas': [], 'conjuntos': []}, 'ambiente': {},
        'plano': {'largura': 20, 'comprimento': 30, 'colisao': 'parede'},
    }


class CenarioTest(unittest.TestCase):
    def setUp(self):
        self.folder = ROOT / f'caso-{len(list(ROOT.iterdir()))}'
        self.data = fixture(self.folder)

    def guardar(self):
        p = self.folder / 'cenario.json'
        p.write_text(json.dumps(self.data), encoding='utf-8')
        return str(p)

    def test_load_draw_and_dispose_with_complete_matrix(self):
        m = [2, 0, 0, 0, 0.3, 1, 0, 0, 0, 0, -1, 0, 8, 2, 5, 1]
        self.data['nos'][0]['matriz'] = m
        s = cenario.carregar(self.guardar())
        try:
            self.assertEqual(s.dados['fonte'], self.data['fonte'])
            self.assertEqual(s.dados['entidades'][0]['propriedades'], {'conversa': 'Olá'})
            P.begin_drawing()
            s.desenhar()
            self.assertIn(_rt.OP_MESH, _rt.ops)
            i = _rt.ops.index(_rt.OP_MESH)
            self.assertEqual(list(_rt.ops[i + 6:i + 22]), [P.Vector3(v, 0, 0).x for v in m])
            P.end_drawing()
            self.assertEqual(s.altura(0, 0), 0)
            self.assertIsNone(s.altura(100, 100))
            self.assertTrue(s.colide_caixa((-0.5, 0.1, -0.5), (0.5, 1, 0.5)))
            self.assertFalse(s.colide_caixa((2, 0, 2), (3, 1, 3)))
            self.assertFalse(s.colide_caixa((-0.5, 0, -0.5), (0.5, 1, 0.5), ignorar=('pessoa',)))
        finally:
            s.descartar()
            s.descartar()
        with self.assertRaises(RuntimeError):
            s.desenhar()

    def test_scene_with_regions_loads_and_draws_everything(self):
        # Regiões na cena compilada (lote 5 da conclusão, 22/11/2026): o leitor de hoje aceita o
        # campo e desenha a cena inteira; a carga por regiões no Python é o lote 7b.
        self.data['regioes'] = [
            {'id': 'vila', 'nome': 'Vila', 'caixa': {'x0': -10, 'z0': -15, 'x1': 0, 'z1': 15},
             'vizinhas': ['praia'], 'nos': [], 'colisoes': [], 'aguas': []},
            {'id': 'praia', 'nome': 'Praia', 'caixa': {'x0': 0, 'z0': -15, 'x1': 10, 'z1': 15},
             'vizinhas': ['vila'], 'nos': [], 'colisoes': [], 'aguas': []},
        ]
        s = cenario.carregar(self.guardar())
        try:
            self.assertEqual([r['nome'] for r in s.dados['regioes']], ['Vila', 'Praia'])
            P.begin_drawing()
            s.desenhar()
            self.assertIn(_rt.OP_MESH, _rt.ops)
            P.end_drawing()
        finally:
            s.descartar()

    def test_triangular_heights_holes_missing_pieces_and_cutouts(self):
        self.data.pop('plano')
        heights = [0.0] * (129 * 65)
        heights[0], heights[1], heights[129], heights[130] = 0, 4, 8, 20
        b = struct.pack('<' + 'f' * len(heights), *heights)
        holes = bytearray(128 * 64)
        holes[2 * 128 + 2] = 1
        holes[63 * 128 + 10] = 1
        for name, content, role in [('alturas.bin', b, 'alturas'), ('buracos.bin', holes, 'buracos')]:
            (self.folder / name).write_bytes(content)
            self.data['arquivos'].append({'caminho': name, 'bytes': len(content),
                'digest': hashlib.sha256(content).hexdigest(), 'mime': 'application/octet-stream', 'papel': role})
        self.data['terreno'] = {
            'origem': {'x': 0, 'z': 0}, 'passo': 1, 'colunas': 128, 'linhas': 64,
            'min': -1, 'max': 25, 'fundo': -1, 'cobertura': 'pecas',
            'pecas': [{'coluna': 0, 'linha': 0}], 'alturas': 'alturas.bin',
            'buracos': 'buracos.bin', 'pngAlturas': 'alturas.png',
            'recortes': [[{'x': 4, 'z': 4}, {'x': 6, 'z': 4}, {'x': 6, 'z': 6}, {'x': 4, 'z': 6}]],
        }
        s = cenario.carregar(self.guardar())
        try:
            self.assertAlmostEqual(s.altura(0.25, 0.25), 3)
            self.assertAlmostEqual(s.altura(0.75, 0.75), 13)
            for x, z in [(2.5, 2.5), (5, 5), (80, 1), (-1, 0), (200, 0)]:
                self.assertFalse(s.tem_chao(x, z))
                self.assertIsNone(s.altura(x, z))
            self.assertFalse(s.tem_chao(64, 64))  # borda pertence à peça seguinte, ausente
            self.assertTrue(s.tem_chao(63, 64))
            self.assertTrue(s.tem_chao(10, 64))
            self.assertFalse(s.tem_chao(10, 63.8))
        finally:
            s.descartar()

        # A cobertura grade permite chão, mas a altura de peça ausente é fundo,
        # assim como criarFonteDeAlturasCompilada do núcleo TypeScript.
        self.data['terreno']['cobertura'] = 'grade'
        s = cenario.carregar(self.guardar())
        try:
            self.assertTrue(s.tem_chao(80, 1))
            self.assertEqual(s.altura(80, 1), -1)
        finally:
            s.descartar()

    def test_integrity_and_paths_fail_before_gpu_allocation(self):
        before = _rt.next_id
        p = self.folder / 'models/pessoa.glb'
        p.write_bytes(p.read_bytes() + b'alterado')
        with self.assertRaises(ValueError):
            cenario.carregar(self.guardar())
        self.assertEqual(_rt.next_id, before)
        for path in ['../pessoa.glb', '/pessoa.glb', 'https://exemplo.test/a.glb', 'a\\b.glb']:
            self.data['arquivos'][0]['caminho'] = path
            with self.assertRaises(ValueError):
                cenario.carregar(self.guardar())
        self.assertEqual(_rt.next_id, before)

    def test_bad_node_matrix_and_duplicate_ids_are_rejected_before_gpu(self):
        before = _rt.next_id
        self.data['nos'][0]['matriz'][0] = math.nan
        with self.assertRaises(ValueError):
            cenario.carregar(self.guardar())
        self.data['nos'][0]['matriz'] = IDENTITY[:]
        self.data['nos'].append(copy.deepcopy(self.data['nos'][0]))
        with self.assertRaises(ValueError):
            cenario.carregar(self.guardar())
        self.assertEqual(_rt.next_id, before)

    def test_two_cenarios_do_not_share_mutable_models(self):
        path = self.guardar()
        a, b = cenario.carregar(path), cenario.carregar(path)
        try:
            a.descartar()
            P.begin_drawing()
            b.desenhar()
            self.assertIn(_rt.OP_MESH, _rt.ops)
            P.end_drawing()
        finally:
            a.descartar()
            b.descartar()

    def test_animation_uses_native_skeleton_api_and_disposes(self):
        s = cenario.carregar(self.guardar())
        try:
            nomes = s.animacoes('pessoa')
            self.assertGreater(len(nomes), 0)
            s.animar('pessoa', 0, 1.5)
            with self.assertRaises(ValueError):
                s.animar('pessoa', 999, 0)
            with self.assertRaises(ValueError):
                s.animacoes('nao-existe')
        finally:
            s.descartar()

    def test_partial_load_failure_releases_already_uploaded_meshes(self):
        # GLB estruturalmente válido sem malhas: o carregador nativo o recusa como modelo.
        body = json.dumps({'asset': {'version': '2.0'}, 'scenes': [{'nodes': []}], 'scene': 0}).encode()
        body += b' ' * (-len(body) % 4)
        empty = struct.pack('<5I', 0x46546c67, 2, len(body) + 20, len(body), 0x4e4f534a) + body
        (self.folder / 'models/vazio.glb').write_bytes(empty)
        self.data['arquivos'].append({'caminho': 'models/vazio.glb', 'bytes': len(empty),
            'digest': hashlib.sha256(empty).hexdigest(), 'mime': 'model/gltf-binary', 'papel': 'modelo'})
        outro = copy.deepcopy(self.data['nos'][0])
        outro.update(id='vazio', arquivo='models/vazio.glb')
        self.data['nos'].append(outro)
        antes = len(_rt.pending_free)
        with self.assertRaises(ValueError):
            cenario.carregar(self.guardar())
        self.assertGreater(len(_rt.pending_free), antes)

    def test_owned_textures_are_released_without_freeing_the_default(self):
        path = self.folder / 'models/pessoa.glb'
        original = path.read_bytes()
        n = struct.unpack_from('<I', original, 12)[0]
        d = json.loads(original[20:20 + n])
        png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg=='
        d['images'] = [{'uri': 'data:image/png;base64,' + png}]
        d['textures'] = [{'source': 0}]
        d['materials'][0].setdefault('pbrMetallicRoughness', {})['baseColorTexture'] = {'index': 0}
        body = json.dumps(d).encode()
        body += b' ' * (-len(body) % 4)
        restante = original[20 + n:]
        b = struct.pack('<5I', 0x46546c67, 2, 20 + len(body) + len(restante), len(body), 0x4e4f534a) + body + restante
        path.write_bytes(b)
        self.data['arquivos'][0].update(bytes=len(b), digest=hashlib.sha256(b).hexdigest())
        antes = _rt._texture_count
        s = cenario.carregar(self.guardar())
        self.assertGreater(_rt._texture_count, antes)
        s.descartar()
        s.descartar()
        self.assertEqual(_rt._texture_count, antes)
        self.assertNotIn(_rt.DEFAULT_TEXTURE_ID, _rt.pending_free)

    def test_resource_map_preserves_manifest_and_independent_animated_instances(self):
        assets = self.folder / 'assets'
        assets.mkdir()
        physical = assets / 'pessoa-compartilhada.glb'
        (self.folder / 'models/pessoa.glb').rename(physical)
        second = copy.deepcopy(self.data['arquivos'][0])
        second['caminho'] = 'outra/pessoa.glb'
        self.data['arquivos'].append(second)
        no = copy.deepcopy(self.data['nos'][0])
        no.update(id='outra-pessoa', arquivo=second['caminho'])
        self.data['nos'].append(no)
        before = copy.deepcopy(self.data)
        mapping = {a['caminho']: 'assets/pessoa-compartilhada.glb' for a in self.data['arquivos']}
        s = cenario.Cenario(self.folder, self.data, arquivos=mapping)
        try:
            self.assertEqual(s.dados, before)
            self.assertEqual(self.data, before)
            self.assertEqual(len(s._modelos), 2)
            self.assertIsNot(s._nos['pessoa'][1], s._nos['outra-pessoa'][1])
            s.animar('pessoa', 0, 1.5)
            P.begin_drawing()
            s.desenhar()
            P.end_drawing()
        finally:
            s.descartar()

    def test_static_aliases_share_one_physical_model(self):
        data = {'asset': {'version': '2.0'}, 'buffers': [{'byteLength': 36}],
                'bufferViews': [{'buffer': 0, 'byteOffset': 0, 'byteLength': 36}],
                'accessors': [{'bufferView': 0, 'componentType': 5126, 'count': 3,
                               'type': 'VEC3', 'min': [0, 0, 0], 'max': [1, 1, 0]}],
                'meshes': [{'primitives': [{'attributes': {'POSITION': 0}}]}],
                'nodes': [{'mesh': 0}], 'scenes': [{'nodes': [0]}], 'scene': 0}
        body = json.dumps(data).encode()
        body += b' ' * (-len(body) % 4)
        vertices = struct.pack('<9f', 0, 0, 0, 1, 0, 0, 0, 1, 0)
        b = struct.pack('<5I', 0x46546c67, 2, 28 + len(body) + len(vertices), len(body), 0x4e4f534a) + body + struct.pack('<2I', len(vertices), 0x004e4942) + vertices
        (self.folder / 'estatico.glb').write_bytes(b)
        a = {'caminho': 'models/a.glb', 'bytes': len(b), 'digest': hashlib.sha256(b).hexdigest(),
             'mime': 'model/gltf-binary', 'papel': 'modelo'}
        self.data['arquivos'] = [a, {**a, 'caminho': 'models/b.glb'}]
        self.data['nos'][0]['arquivo'] = a['caminho']
        self.data['nos'].append({**copy.deepcopy(self.data['nos'][0]), 'id': 'segunda', 'arquivo': 'models/b.glb'})
        s = cenario.carregar(self.guardar(), arquivos={'models/a.glb': 'estatico.glb', 'models/b.glb': 'estatico.glb'})
        try:
            self.assertEqual(len(s._modelos), 1)
            self.assertIs(s._nos['pessoa'][1], s._nos['segunda'][1])
            P.begin_drawing()
            s.desenhar()
            P.end_drawing()
        finally:
            s.descartar()

    def test_resource_map_is_complete_local_and_rejected_before_gpu(self):
        before = _rt.next_id
        for mapping in [[], {}, {'extra.glb': 'models/pessoa.glb'},
                        {'models/pessoa.glb': '../fora.glb'},
                        {'models/pessoa.glb': '/fora.glb'},
                        {'models/pessoa.glb': 'https://exemplo.test/a.glb'},
                        {'models/pessoa.glb': 'models\\pessoa.glb'},
                        {'models/pessoa.glb': None}]:
            with self.assertRaises(ValueError):
                cenario.Cenario(self.folder, self.data, arquivos=mapping)
            self.assertEqual(_rt.next_id, before)

    def test_terrain_fields_resolve_through_the_same_asset_map(self):
        assets = self.folder / 'assets'
        assets.mkdir()
        heights = struct.pack('<' + 'f' * (65 * 65), *([3.5] * (65 * 65)))
        holes = bytearray(64 * 64)
        holes[0] = 1
        mapping = {'models/pessoa.glb': 'models/pessoa.glb'}
        for name, b, role in [('alturas', heights, 'alturas'), ('buracos', holes, 'buracos')]:
            path = f'assets/{name}-por-id.bin'
            (self.folder / path).write_bytes(b)
            logical = f'terreno/{name}.bin'
            self.data['arquivos'].append({'caminho': logical, 'mime': 'application/octet-stream',
                'papel': role, 'bytes': len(b), 'digest': hashlib.sha256(b).hexdigest()})
            mapping[logical] = path
            self.assertFalse((self.folder / logical).exists())
        self.data.pop('plano')
        self.data['terreno'] = {'origem': {'x': 0, 'z': 0}, 'passo': 1, 'colunas': 64, 'linhas': 64,
            'min': 0, 'max': 4, 'fundo': 0, 'cobertura': 'grade', 'pecas': [{'coluna': 0, 'linha': 0}],
            'alturas': 'terreno/alturas.bin', 'buracos': 'terreno/buracos.bin', 'recortes': []}
        s = cenario.Cenario(self.folder, self.data, arquivos=mapping)
        try:
            self.assertIsNone(s.altura(0.5, 0.5))
            self.assertEqual(s.altura(1.5, 1.5), 3.5)
            self.assertFalse(s.tem_chao(65, 1))
        finally:
            s.descartar()

    def test_aliases_cannot_disguise_incompatible_manifest_entries(self):
        before = _rt.next_id
        a = copy.deepcopy(self.data['arquivos'][0])
        a.update(caminho='dados.bin', mime='application/octet-stream')
        self.data['arquivos'].append(a)
        with self.assertRaisesRegex(ValueError, 'incompatíveis'):
            cenario.Cenario(self.folder, self.data, arquivos={
                'models/pessoa.glb': 'models/pessoa.glb', 'dados.bin': 'models/pessoa.glb'})
        self.assertEqual(_rt.next_id, before)

    def test_node_animation_without_skin_keeps_independent_models(self):
        path = self.folder / 'models/pessoa.glb'
        original = path.read_bytes()
        n = struct.unpack_from('<I', original, 12)[0]
        d = json.loads(original[20:20 + n])
        d.pop('skins', None)
        for no in d['nodes']:
            no.pop('skin', None)
        for mesh in d['meshes']:
            for part in mesh['primitives']:
                part['attributes'].pop('JOINTS_0', None)
                part['attributes'].pop('WEIGHTS_0', None)
        self.assertTrue(d['animations'])
        body = json.dumps(d).encode()
        body += b' ' * (-len(body) % 4)
        tail = original[20 + n:]
        b = struct.pack('<5I', 0x46546c67, 2, 20 + len(body) + len(tail), len(body), 0x4e4f534a) + body + tail
        path.write_bytes(b)
        self.data['arquivos'][0].update(bytes=len(b), digest=hashlib.sha256(b).hexdigest())
        self.data['nos'].append({**copy.deepcopy(self.data['nos'][0]), 'id': 'outra'})
        s = cenario.Cenario(self.folder, self.data)
        try:
            self.assertEqual(len(s._modelos), 2)
            self.assertIsNot(s._nos['pessoa'][1], s._nos['outra'][1])
        finally:
            s.descartar()


if __name__ == '__main__':
    try:
        unittest.main()
    finally:
        P.close_window()
        os.chdir(ROOT.parent)
        if ROOT.is_relative_to(Path(tempfile.gettempdir()).resolve()) and ROOT.name.startswith('sz-cenario-raylib-'):
            shutil.rmtree(ROOT)

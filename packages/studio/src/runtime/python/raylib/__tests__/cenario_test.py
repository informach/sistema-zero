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


if __name__ == '__main__':
    try:
        unittest.main()
    finally:
        P.close_window()
        os.chdir(ROOT.parent)
        if ROOT.is_relative_to(Path(tempfile.gettempdir()).resolve()) and ROOT.name.startswith('sz-cenario-raylib-'):
            shutil.rmtree(ROOT)

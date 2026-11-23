"""Contrato do cenário compilado com o motor Python real do Estúdio, sem janela nativa."""
import base64
import contextlib
import copy
import hashlib
import io
import json
import math
import os
from pathlib import Path
import shutil
import struct
import sys
import tempfile
import unittest
import zlib

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


def static_glb():
    """Um GLB estático mínimo (um triângulo, sem esqueleto nem animação)."""
    data = {'asset': {'version': '2.0'}, 'buffers': [{'byteLength': 36}],
            'bufferViews': [{'buffer': 0, 'byteOffset': 0, 'byteLength': 36}],
            'accessors': [{'bufferView': 0, 'componentType': 5126, 'count': 3,
                           'type': 'VEC3', 'min': [0, 0, 0], 'max': [1, 1, 0]}],
            'meshes': [{'primitives': [{'attributes': {'POSITION': 0}}]}],
            'nodes': [{'mesh': 0}], 'scenes': [{'nodes': [0]}], 'scene': 0}
    body = json.dumps(data).encode()
    body += b' ' * (-len(body) % 4)
    vertices = struct.pack('<9f', 0, 0, 0, 1, 0, 0, 0, 1, 0)
    return (struct.pack('<5I', 0x46546c67, 2, 28 + len(body) + len(vertices), len(body), 0x4e4f534a)
            + body + struct.pack('<2I', len(vertices), 0x004e4942) + vertices)


CASOS = json.loads((Path(__file__).resolve().parent / 'regioes-casos.json').read_text(encoding='utf-8'))


def caixa(x0, x1):
    return {'min': {'x': x0, 'y': 0, 'z': -5}, 'max': {'x': x1, 'y': 2, 'z': 5}}


def com_regioes(data, folder, malhas=None):
    """Três regiões em fila no piso de 300 x 100 m (Vila, Floresta e Caverna, vizinhas em par),
    com peças estáticas: duas na Vila e uma na Floresta (o mesmo arquivo) e uma na Caverna (outro
    arquivo, com uma colisão). O morador animado continua sendo de todas."""
    malhas = malhas or {}
    b = static_glb()
    for nome in ('a', 'c'):
        (folder / f'models/{nome}.glb').write_bytes(b)
        data['arquivos'].append({'caminho': f'models/{nome}.glb', 'bytes': len(b),
                                 'digest': hashlib.sha256(b).hexdigest(),
                                 'mime': 'model/gltf-binary', 'papel': 'modelo',
                                 **({'malhas': malhas[nome]} if nome in malhas else {})})
    if 'pessoa' in malhas:
        data['arquivos'][0]['malhas'] = malhas['pessoa']
    data['plano'].update(largura=300, comprimento=100)
    data['marcadores'][0]['posicao'] = {'x': -100, 'y': 0, 'z': 0}
    for ident, arquivo, x0, x1 in [('a1', 'a', -110, -90), ('a2', 'a', -80, -70),
                                   ('b1', 'a', -10, 10), ('c1', 'c', 90, 110)]:
        data['nos'].append({'id': ident, 'entidade': None, 'arquivo': f'models/{arquivo}.glb',
                            'matriz': IDENTITY[:], 'volume': caixa(x0, x1)})
    data['colisoes'].append({'id': 'pedra-c', 'entidade': None, 'tipo': 'caixa',
                             'arquivo': 'models/c.glb', 'matriz': IDENTITY[:],
                             'volume': caixa(95, 105)})
    data['regioes'] = [
        {'id': 'a', 'nome': 'Vila', 'caixa': {'x0': -150, 'z0': -50, 'x1': -50, 'z1': 50},
         'vizinhas': ['b'], 'nos': ['a1', 'a2'], 'colisoes': [], 'aguas': []},
        {'id': 'b', 'nome': 'Floresta', 'caixa': {'x0': -50, 'z0': -50, 'x1': 50, 'z1': 50},
         'vizinhas': ['a', 'c'], 'nos': ['b1'], 'colisoes': [], 'aguas': []},
        {'id': 'c', 'nome': 'Caverna', 'caixa': {'x0': 50, 'z0': -50, 'x1': 150, 'z1': 50},
         'vizinhas': ['b'], 'nos': ['c1'], 'colisoes': ['pedra-c'], 'aguas': []},
    ]
    return data


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
        # Regiões na cena compilada (lote 5 da conclusão, 22/11/2026): aqui o morador e a parede
        # são de todas (listas vazias), então a cena inteira carrega e desenha.
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

    def test_region_rules_match_the_typescript_core(self):
        # Lote 7b: a pertença e o plano da carga do Python dão o mesmo que o núcleo TypeScript
        # nos casos que ele gravou (`cenario-regioes.test.ts` confere o arquivo do lado de lá).
        p = CASOS['pertenca']
        itens = p['itens']
        listas = cenario._pertenca(p['regioes'], {**itens, 'plano': itens.get('plano')})
        self.assertEqual([{'id': r['id'], **listas[i]} for i, r in enumerate(p['regioes'])],
                         p['esperado'])
        # A régua do documento: os mesmos recados, na mesma ordem (revisão do lote 7b).
        for caso in CASOS['regua']:
            self.assertEqual(cenario._erros_das_regioes(caso['regioes'], caso['limite']),
                             caso['esperado'], caso['regioes'])
        for caso in CASOS['plano']:
            plano = cenario._PlanoDaCarga(caso['regioes'])
            ordem = [r['id'] for r in caso['regioes']]
            for passo in caso['passos']:
                camera = tuple(passo['camera']) if passo.get('camera') else None
                e = plano.atualizar(passo['foco'][0], passo['foco'][1], passo['agora'], camera)
                obtido = {'atual': e['atual'], 'segura': e['segura'],
                          'obrigatorias': [i for i in ordem if i in e['obrigatorias']],
                          'carregadas': [i for i in ordem if i in e['carregadas']],
                          'entradas': e['entradas']}
                self.assertEqual(obtido, passo['esperado'], passo)

    def test_regions_load_by_focus_share_models_and_release_far_ones(self):
        s = cenario.Cenario(self.folder, com_regioes(self.data, self.folder))
        try:
            # Começa na Vila (o início): Vila e a vizinha Floresta; a Caverna fica fora.
            self.assertEqual(s.estado_das_regioes()['carregadas'], ['Vila', 'Floresta'])
            self.assertEqual(list(s._nos), ['pessoa', 'a1', 'a2', 'b1'])
            self.assertEqual(len(s._modelos), 2)  # o morador e o estático dividido
            self.assertFalse(s.colide_caixa((96, 0, -1), (104, 1, 1)))
            self.assertEqual(s.altura(100, 0), 0)  # o chão vale onde a região não carregou
            P.begin_drawing()
            s.desenhar()
            P.end_drawing()
            # A entrada inicial conta uma vez, no primeiro atualizar.
            s.atualizar(-100, 0, agora=0)
            self.assertTrue(s.entrou_na_regiao('Vila'))
            self.assertFalse(s.entrou_na_regiao('Vila'))
            s.atualizar(-100, 0, agora=0.5)
            self.assertFalse(s.entrou_na_regiao('Vila'))
            # Na Floresta, a Caverna é vizinha: carrega com o modelo dela e a colisão passa a valer.
            s.atualizar(0, 0, agora=1)
            self.assertTrue(s.entrou_na_regiao('Floresta'))
            self.assertEqual(s.estado_das_regioes()['carregadas'], ['Vila', 'Floresta', 'Caverna'])
            self.assertEqual(list(s._nos), ['pessoa', 'a1', 'a2', 'b1', 'c1'])
            self.assertEqual(len(s._modelos), 3)
            self.assertTrue(s.colide_caixa((96, 0, -1), (104, 1, 1)))
            self.assertEqual(s.regiao(100, 0), 'Caverna')
            self.assertIsNone(s.regiao(100, 80))
            # De volta à Vila, a Caverna (150 m) só sai depois de 2 s longe.
            s.atualizar(-100, 0, agora=2)
            s.atualizar(-100, 0, agora=3.9)
            self.assertIn('Caverna', s.estado_das_regioes()['carregadas'])
            antes = len(_rt.pending_free)
            s.atualizar(-100, 0, agora=4.1)
            self.assertEqual(s.estado_das_regioes()['carregadas'], ['Vila', 'Floresta'])
            self.assertEqual(list(s._nos), ['pessoa', 'a1', 'a2', 'b1'])
            self.assertEqual(len(s._modelos), 2)
            self.assertGreater(len(_rt.pending_free), antes)
            self.assertFalse(s.colide_caixa((96, 0, -1), (104, 1, 1)))
            # Dez idas e voltas terminam com os mesmos modelos.
            tempo = 5.0
            for _ in range(10):
                for x in (0, 100, 0, -100):
                    tempo += 3
                    s.atualizar(x, 0, agora=tempo)
                tempo += 3
                s.atualizar(-100, 0, agora=tempo)
            self.assertEqual(len(s._modelos), 2)
            # NaN mantém a carga; fora de toda região a atual é nenhuma, e voltar entra de novo.
            s.atualizar(math.nan, 0, agora=tempo + 1)
            s.atualizar(-100, 0, agora=tempo + 1)
            s.entrou_na_regiao('Vila')
            s.atualizar(-100, 200, agora=tempo + 2)
            self.assertIsNone(s.estado_das_regioes()['atual'])
            s.atualizar(-100, 0, agora=tempo + 3)
            self.assertTrue(s.entrou_na_regiao('Vila'))
        finally:
            s.descartar()
        self.assertEqual(s._modelos, {})

    def test_window_budget_and_unknown_region_name(self):
        # 48 malhas por janela: a Caverna, opcional (a câmera longe a alcança), não entra se passar.
        data = com_regioes(self.data, self.folder, {'pessoa': 5, 'a': 10, 'c': 30})
        s = cenario.Cenario(self.folder, data)
        try:
            s.atualizar(-100, 0, camera=(-100, -300), agora=0)
            self.assertEqual(s.estado_das_regioes()['carregadas'], ['Vila', 'Floresta'])
            saida = io.StringIO()
            with contextlib.redirect_stdout(saida):
                self.assertFalse(s.entrou_na_regiao('Lua'))
                self.assertFalse(s.entrou_na_regiao('Lua'))
            self.assertEqual(saida.getvalue().count('não tem a região "Lua"'), 1)
        finally:
            s.descartar()
        self.setUp()
        data = com_regioes(self.data, self.folder, {'pessoa': 5, 'a': 10, 'c': 3})
        s = cenario.Cenario(self.folder, data)
        try:
            s.atualizar(-100, 0, camera=(-100, -300), agora=0)
            self.assertEqual(s.estado_das_regioes()['carregadas'], ['Vila', 'Floresta', 'Caverna'])
        finally:
            s.descartar()

    def test_stale_or_invalid_region_lists_fail_before_gpu(self):
        base = com_regioes(self.data, self.folder)
        casos = [
            (lambda d: d['regioes'][2].update(nos=[]), 'peças da região Caverna'),
            (lambda d: d['regioes'][2].update(colisoes=[]), 'colisões da região Caverna'),
            (lambda d: d['regioes'][0].update(vizinhas=[]), 'mas Vila não tem Floresta'),
            (lambda d: d['regioes'][1]['caixa'].update(x0=-60), 'se sobrepõem'),
            (lambda d: d['regioes'][2]['caixa'].update(x1=160), 'sai da base'),
            (lambda d: d['regioes'][0].update(cor='azul'), 'fora do formato'),
        ]
        for mudar, recado in casos:
            data = copy.deepcopy(base)
            mudar(data)
            antes = _rt.next_id
            with self.assertRaises(ValueError) as erro:
                cenario.Cenario(self.folder, data)
            self.assertIn(recado, str(erro.exception))
            self.assertEqual(_rt.next_id, antes, recado)

    def test_failed_region_keeps_the_previous_load_and_retries(self):
        s = cenario.Cenario(self.folder, com_regioes(self.data, self.folder))
        original, chamadas = cenario._p.load_model, []

        def quebrado(caminho):
            chamadas.append(caminho)
            raise ValueError('arquivo quebrado')

        try:
            cenario._p.load_model = quebrado
            saida = io.StringIO()
            with contextlib.redirect_stdout(saida):
                s.atualizar(0, 0, agora=10)
                s.atualizar(0, 0, agora=10.5)
                s.atualizar(0, 0, agora=11.2)
            estado = s.estado_das_regioes()
            self.assertEqual(estado['carregadas'], ['Vila', 'Floresta'])
            self.assertEqual(estado['falhas'], ['Caverna'])
            self.assertEqual(len(chamadas), 2)  # a primeira e a nova tentativa depois de 1 s
            self.assertEqual(saida.getvalue().count('Vou tentar de novo'), 1)
            self.assertEqual(list(s._nos), ['pessoa', 'a1', 'a2', 'b1'])
            cenario._p.load_model = original
            s.atualizar(0, 0, agora=14)  # a próxima tentativa é 4 s depois
            self.assertEqual(s.estado_das_regioes()['falhas'], ['Caverna'])
            s.atualizar(0, 0, agora=15.3)
            self.assertEqual(s.estado_das_regioes()['falhas'], [])
            self.assertIn('Caverna', s.estado_das_regioes()['carregadas'])
        finally:
            cenario._p.load_model = original
            s.descartar()

    def test_load_from_the_generated_scene_module(self):
        # O bloco "Carregar o cenário" escreve cenario.carregar(cenario_vila): o módulo que a
        # importação do Molda gera já sabe o manifesto e o mapa dos arquivos (lote 7b).
        import types
        caminho = self.guardar()
        modulo = types.ModuleType('cenario_vila')
        modulo.carregar = lambda: cenario.carregar(caminho)
        s = cenario.carregar(modulo)
        try:
            self.assertIsInstance(s, cenario.Cenario)
            self.assertEqual(list(s._nos), ['pessoa'])
        finally:
            s.descartar()
        with self.assertRaises(ValueError) as erro:
            cenario.carregar(types.ModuleType('outro'))
        self.assertIn('módulo do cenário', str(erro.exception))

    def test_review_7b_water_tie_break_and_partial_registration(self):
        # Revisão do lote 7b. B4: a colisão de água vale sempre, como no motor JavaScript, mesmo
        # com a região dela fora da carga.
        data = com_regioes(self.data, self.folder)
        data['entidades'].append({'id': 'poca', 'nome': 'Poça', 'tipo': 'agua', 'grupo': None,
                                  'oculto': False})
        data['aguas'].append({'id': 'poca', 'tipo': 'lago'})
        data['colisoes'].append({'id': 'poca-col', 'entidade': 'poca', 'tipo': 'agua',
                                 'arquivo': 'models/c.glb', 'matriz': IDENTITY[:],
                                 'volume': caixa(120, 125)})
        data['regioes'][2]['colisoes'] = ['pedra-c', 'poca-col']
        data['regioes'][2]['aguas'] = ['poca']
        s = cenario.Cenario(self.folder, data)
        try:
            self.assertNotIn('Caverna', s.estado_das_regioes()['carregadas'])
            self.assertTrue(s.colide_caixa((121, 0, -1), (124, 1, 1), tipos=('agua',)))
            self.assertFalse(s.colide_caixa((96, 0, -1), (104, 1, 1)))
        finally:
            s.descartar()
        # B3: no empate de distância, a região que já está carregada fica (nada de trocar à toa).
        self.setUp()
        data = com_regioes(self.data, self.folder, {'pessoa': 0, 'a': 10, 'c': 30})
        for r in data['regioes']:
            r['vizinhas'] = []
        data['regioes'][0]['nos'] = ['a1', 'a2']
        s = cenario.Cenario(self.folder, data)
        try:
            # Perto da Caverna: ela entra (opcional, pela câmera longe).
            s.atualizar(40, 0, camera=(40, -400), agora=0)
            self.assertIn('Caverna', s.estado_das_regioes()['carregadas'])
            # No meio da Floresta, Vila e Caverna ficam à mesma distância (50 m) e só uma cabe.
            s.atualizar(0, 0, camera=(0, -400), agora=1)
            carregadas = s.estado_das_regioes()['carregadas']
            self.assertIn('Caverna', carregadas)
            self.assertNotIn('Vila', carregadas)
        finally:
            s.descartar()
        # B5: uma falha ao registrar as texturas de uma região que entra depois da abertura devolve
        # o modelo dela: nada fica guardado sem uso (e uma nova tentativa registra tudo de novo).
        self.setUp()
        s = cenario.Cenario(self.folder, com_regioes(self.data, self.folder))
        original = cenario.Cenario._registrar_texturas

        def quebrado(self_, chave, modelo):
            raise RuntimeError('texturas ilegíveis')

        try:
            cenario.Cenario._registrar_texturas = quebrado
            with contextlib.redirect_stdout(io.StringIO()):
                s.atualizar(0, 0, agora=1)
            self.assertEqual(s.estado_das_regioes()['falhas'], ['Caverna'])
            self.assertEqual(len(s._modelos), 2)
            self.assertEqual(set(s._usos.values()), {1, 3})
        finally:
            cenario.Cenario._registrar_texturas = original
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

    def test_model_that_fails_midway_returns_its_textures(self):
        # O load_model do Estúdio criava as texturas antes dos passos que podem falhar e não as
        # devolvia: cada nova tentativa de uma região que falhou vazava texturas que nem o
        # descartar() via (revisão do lote 7b).
        from _szraylib import _models
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
        path.write_bytes(struct.pack('<5I', 0x46546c67, 2, 20 + len(body) + len(restante), len(body),
                                     0x4e4f534a) + body + restante)
        envio = _models.upload

        def falha(mesh, function='upload_mesh'):
            raise RuntimeError('a placa recusou a malha')

        antes, livres = _rt._texture_count, len(_rt.pending_free)
        _models.upload = falha
        try:
            with self.assertRaises(RuntimeError):
                P.load_model(str(path))
        finally:
            _models.upload = envio
        self.assertEqual(_rt._texture_count, antes)
        # A textura, criada antes do envio da malha, volta para a lista de liberar.
        self.assertGreaterEqual(len(_rt.pending_free) - livres, 1)

    def test_texture_over_the_limit_is_not_counted(self):
        contagem, pixels = _rt._texture_count, _rt._total_pixels
        _rt._total_pixels = _rt.MAX_TOTAL_PIXELS - 10
        try:
            with self.assertRaises(RuntimeError):
                _rt.count_texture(100, 100, 'teste')
            self.assertEqual(_rt._texture_count, contagem)
            self.assertEqual(_rt._total_pixels, _rt.MAX_TOTAL_PIXELS - 10)
        finally:
            _rt._total_pixels = pixels

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


# O relevo de mundo grande (plano "Mundos de 2 km", lote 6): o cenário monta os pedaços com a
# mesma conta da referência do núcleo TypeScript (`relevo-casos.json`, de
# `scripts/gen-raylib-relevo-cases.ts`).
RELEVO = json.loads((Path(__file__).resolve().parent / 'relevo-casos.json').read_text(encoding='utf-8'))


def png_rgba(largura, altura, rgba, filtro=0):
    """PNG RGBA de 8 bits como o codificador do Molda (filtro 0 em toda linha)."""
    fila = largura * 4
    cru = b''.join(bytes([filtro]) + rgba[j * fila:(j + 1) * fila] for j in range(altura))

    def parte(tipo, dados):
        return (struct.pack('>I', len(dados)) + tipo + dados
                + struct.pack('>I', zlib.crc32(tipo + dados) & 0xffffffff))

    return (b'\x89PNG\r\n\x1a\n' + parte(b'IHDR', struct.pack('>IIBBBBB', largura, altura, 8, 6, 0, 0, 0))
            + parte(b'IDAT', zlib.compress(cru)) + parte(b'IEND', b''))


def com_relevo(data, folder, forma, alturas, pesos, camadas, buracos=None):
    """Troca o piso plano pelo relevo em campo (sem lotes de terreno nem colisão do chão)."""
    (folder / 'terreno').mkdir()
    arquivos = {'terreno/alturas.bin': alturas}
    nomes = []
    for k, png in enumerate(pesos):
        nome = f'terreno/pesos-{"ab"[k]}.png'
        arquivos[nome] = png
        nomes.append(nome)
    if buracos is not None:
        arquivos['terreno/buracos.bin'] = buracos
    for nome, b in arquivos.items():
        (folder / nome).write_bytes(b)
        data['arquivos'].append({'caminho': nome, 'bytes': len(b), 'digest': hashlib.sha256(b).hexdigest(),
                                 'mime': 'image/png' if nome.endswith('.png') else 'application/octet-stream',
                                 'papel': 'pesos' if nome.endswith('.png') else 'terreno'})
    valores = struct.unpack(f'<{len(alturas) // 4}f', alturas)
    data.pop('plano', None)
    data['terreno'] = {
        **forma, 'min': min(valores) - 1, 'max': max(valores) + 1, 'fundo': min(valores) - 1,
        'cobertura': 'grade', 'pecas': [], 'recortes': [], 'alturas': 'terreno/alturas.bin',
        'pngAlturas': 'terreno/alturas.png',
        **({'buracos': 'terreno/buracos.bin'} if buracos is not None else {}),
        'relevo': {'tipo': 'campo', 'pesos': nomes,
                   'camadas': [{'id': f'c{k}', **c} for k, c in enumerate(camadas)]},
    }
    return data


def relevo_dos_casos(data, folder):
    f = RELEVO['forma']
    buracos = bytearray(f['colunas'] * f['linhas'])
    for i in RELEVO['buracos']:
        buracos[i] = 1
    return com_relevo(data, folder, f, base64.b64decode(RELEVO['alturas']),
                      [base64.b64decode(p) for p in RELEVO['pesosPng']], RELEVO['camadas'], bytes(buracos))


def relevo_grande(data, folder, colunas=512):
    """Um relevo de 512 m (8 × 8 pedaços de 64 m, um metro de passo), com uma camada só."""
    largura = colunas + 1
    alturas = struct.pack(f'<{largura * largura}f', *(
        math.sin(i / 9) + math.cos(j / 11) for j in range(largura) for i in range(largura)))
    rgba = bytes([255, 0, 0, 0]) * (largura * largura)
    forma = {'origem': {'x': 0, 'z': 0}, 'passo': 1, 'colunas': colunas, 'linhas': colunas}
    return com_relevo(data, folder, forma, alturas, [png_rgba(largura, largura, rgba)],
                      [{'cor': '#80c060', 'corMedia': '#ffffff'}])


class RelevoTest(unittest.TestCase):
    def setUp(self):
        self.folder = ROOT / f'relevo-{len(list(ROOT.iterdir()))}'
        self.data = fixture(self.folder)

    def abrir(self):
        return cenario.Cenario(self.folder, self.data)

    def test_os_pedacos_sao_os_do_nucleo(self):
        relevo_dos_casos(self.data, self.folder)
        s = self.abrir()
        try:
            for caso in RELEVO['pedacos']:
                p = caso['pedaco']
                vertices, cores, indices = s._relevo.malha(p['i0'], p['j0'], p['celulas'], p['passo'])
                self.assertEqual(vertices.tobytes(), base64.b64decode(caso['vertices']), p)
                self.assertEqual(bytes(cores), base64.b64decode(caso['cores']), p)
                self.assertEqual(indices.tobytes(), base64.b64decode(caso['indices']), p)
                self.assertEqual(s._relevo.saia(p['i0'], p['j0'], p['celulas']), caso['saia'])
        finally:
            s.descartar()

    def test_a_altura_le_o_campo_inteiro(self):
        relevo_dos_casos(self.data, self.folder)
        s = self.abrir()
        try:
            self.assertEqual(s._pecas, set())
            for a in RELEVO['alturasNoPonto']:
                self.assertAlmostEqual(s.altura(a['x'], a['z']), a['altura'], places=4)
            f = RELEVO['forma']
            # A célula (20, 10) é buraco; fora da grade não há chão.
            self.assertIsNone(s.altura(f['origem']['x'] + 20.5 * f['passo'], f['origem']['z'] + 10.5 * f['passo']))
            self.assertIsNone(s.altura(f['origem']['x'] - 1, f['origem']['z']))
        finally:
            s.descartar()

    def test_desenha_e_solta_os_pedacos(self):
        relevo_dos_casos(self.data, self.folder)
        s = self.abrir()
        try:
            estado = s.estado_do_relevo()
            self.assertGreater(estado['desenhados'], 0)
            self.assertEqual(estado['faltam'], 0)
            P.begin_drawing()
            P.begin_mode_3d(P.Camera3D((0, 30, 0), (10, 0, 10), (0, 1, 0), 45, 0))
            s.desenhar()
            P.end_mode_3d()
            P.end_drawing()
        finally:
            s.descartar()
        self.assertEqual(s._relevo, None)

    def test_perto_completo_longe_grosso_um_por_quadro(self):
        relevo_grande(self.data, self.folder)
        self.data['marcadores'][0]['posicao'] = {'x': 32, 'y': 0, 'z': 32}
        s = self.abrir()
        try:
            r = s._relevo
            # Na abertura, tudo o que está perto já vem completo.
            completos = sorted(k for k in r.desenho if k[0] == 'c')
            self.assertEqual(completos, [('c', 0, 0), ('c', 0, 1), ('c', 0, 2), ('c', 1, 0), ('c', 1, 1), ('c', 2, 0)])
            # Longe, blocos grossos de 2 × 2 pedaços (o canto oposto inteiro).
            self.assertIn(('b', 6, 6), r.desenho)
            # O mesmo pedaço nunca aparece em dois desenhos.
            cobertos = []
            for tipo, x, z in r.desenho:
                lado = 2 if tipo == 'b' else 1
                cobertos += [(x + a, z + b) for a in range(lado) for b in range(lado)]
            self.assertEqual(len(cobertos), len(set(cobertos)))
            self.assertEqual(len(cobertos), 64)
            # Andando até o meio: um completo novo por quadro, e o grosso fica até ele chegar.
            s.atualizar(256.0, 256.0)
            self.assertGreater(s.estado_do_relevo()['faltam'], 0)
            antes = s.estado_do_relevo()['faltam']
            s.atualizar(256.0, 256.0)
            self.assertEqual(s.estado_do_relevo()['faltam'], antes - 1)
            for _ in range(40):
                s.atualizar(256.0, 256.0)
            self.assertEqual(s.estado_do_relevo()['faltam'], 0)
            self.assertLessEqual(sum(1 for k in r.modelos if k[0] == 'c'), cenario._RELEVO_COMPLETOS_GUARDADOS)
        finally:
            s.descartar()

    def test_pula_o_que_esta_atras_da_camera(self):
        relevo_grande(self.data, self.folder)
        self.data['marcadores'][0]['posicao'] = {'x': 256, 'y': 0, 'z': 256}
        s = self.abrir()
        try:
            camera = P.Camera3D((256, 5, 256), (300, 0, 256), (0, 1, 0), 45, 0)
            for _ in range(40):
                s.atualizar(256.0, 256.0, camera=camera)
            atras = [k for k in s._relevo.desenho if k[0] != 'c' and k[1] <= 1]
            self.assertEqual(atras, [])
            self.assertTrue(any(k[0] != 'c' and k[1] >= 6 for k in s._relevo.desenho))
        finally:
            s.descartar()

    def test_recusa_pesos_com_outro_filtro_ou_tamanho(self):
        f = RELEVO['forma']
        largura = f['colunas'] + 1
        rgba = bytes(largura * largura * 4)
        for png in (png_rgba(largura, largura, rgba, filtro=1), png_rgba(largura - 1, largura - 1, rgba)):
            with self.subTest(png=len(png)):
                self.setUp()
                buracos = bytes(f['colunas'] * f['linhas'])
                com_relevo(self.data, self.folder, f, base64.b64decode(RELEVO['alturas']), [png],
                           [{'cor': '#ffffff', 'corMedia': '#ffffff'}], buracos)
                with self.assertRaisesRegex(ValueError, 'pesos do relevo'):
                    self.abrir()


if __name__ == '__main__':
    try:
        unittest.main()
    finally:
        P.close_window()
        os.chdir(ROOT.parent)
        if ROOT.is_relative_to(Path(tempfile.gettempdir()).resolve()) and ROOT.name.startswith('sz-cenario-raylib-'):
            shutil.rmtree(ROOT)

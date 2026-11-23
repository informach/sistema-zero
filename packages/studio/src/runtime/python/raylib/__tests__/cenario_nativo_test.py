"""O relevo de mundo grande no Raylib do computador (plano "Mundos de 2 km", 23/11/2026).

O jogo exportado para o computador leva o mesmo `cenario.py` e roda no raylib do pip (o da
exportação, `raylib==6.0.1.0`). Lá a malha de cada pedaço é memória do C (MemAlloc), que o
`unload_model` solta. Este teste abre o relevo dos casos compartilhados com o raylib de verdade
(janela escondida), lê de volta da memória de cada malha e compara byte a byte com a referência do
núcleo TypeScript (`relevo-casos.json`); depois anda, desenha e descarta.

Precisa do raylib instalado (sem o motor do Estúdio no caminho); sem ele, é pulado:
    python -m pip install raylib==6.0.1.0
    python -I -B packages/studio/src/runtime/python/raylib/__tests__/cenario_nativo_test.py
"""
import base64
import hashlib
import importlib.util
import json
import shutil
import struct
import tempfile
import unittest
from pathlib import Path

AQUI = Path(__file__).resolve().parent
CASOS = json.loads((AQUI / 'relevo-casos.json').read_text(encoding='utf-8'))
NATIVO = importlib.util.find_spec('raylib') is not None and importlib.util.find_spec('_szraylib') is None
if NATIVO:
    import pyray as P


def cena_dos_casos(pasta):
    """O relevo dos casos num pacote de verdade (alturas, pesos e buracos), sem modelos."""
    f = CASOS['forma']
    buracos = bytearray(f['colunas'] * f['linhas'])
    for i in CASOS['buracos']:
        buracos[i] = 1
    arquivos = {'terreno/alturas.bin': base64.b64decode(CASOS['alturas']),
                'terreno/buracos.bin': bytes(buracos)}
    for k, png in enumerate(CASOS['pesosPng']):
        arquivos[f'terreno/pesos-{"ab"[k]}.png'] = base64.b64decode(png)
    (pasta / 'terreno').mkdir(parents=True)
    inventario = []
    for nome, b in arquivos.items():
        (pasta / nome).write_bytes(b)
        inventario.append({'caminho': nome, 'bytes': len(b), 'digest': hashlib.sha256(b).hexdigest(),
                           'mime': 'image/png' if nome.endswith('.png') else 'application/octet-stream'})
    valores = struct.unpack(f'<{len(arquivos["terreno/alturas.bin"]) // 4}f', arquivos['terreno/alturas.bin'])
    return {
        'formato': 'molda-cena-compilada', 'versao': 1, 'nome': 'Relevo', 'unidade': 'metro',
        'eixoVertical': 'y', 'fonte': {'cenario': 'c', 'revisao': 1, 'digest': 'a' * 64},
        'arquivos': inventario, 'nos': [], 'entidades': [], 'colisoes': [],
        'marcadores': [{'id': 'inicio', 'nome': 'Início', 'posicao': {'x': 10, 'y': 0, 'z': 40},
                        'giro': 0, 'objeto': None, 'configuracao': {'tipo': 'inicio', 'principal': True}}],
        'aguas': [], 'caminhos': [], 'licencas': [], 'texturas': [],
        'fontes': {'modelos': [], 'texturas': [], 'conjuntos': []}, 'ambiente': {},
        'terreno': {
            **f, 'min': min(valores) - 1, 'max': max(valores) + 1, 'fundo': min(valores) - 1,
            'cobertura': 'grade', 'pecas': [], 'recortes': [], 'alturas': 'terreno/alturas.bin',
            'pngAlturas': 'terreno/alturas.png', 'buracos': 'terreno/buracos.bin',
            'relevo': {'tipo': 'campo', 'pesos': ['terreno/pesos-a.png', 'terreno/pesos-b.png'],
                       'camadas': [{'id': f'c{k}', **c} for k, c in enumerate(CASOS['camadas'])]},
        },
    }


@unittest.skipUnless(NATIVO, 'precisa do raylib do computador: python -m pip install raylib==6.0.1.0')
class RelevoNativoTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # O cenario.py pelo caminho do arquivo: a pasta do motor do Estúdio (com o pyray dele) fica
        # fora do sys.path, e o `import pyray` do módulo é o do computador.
        spec = importlib.util.spec_from_file_location('cenario', AQUI.parent / 'py' / 'cenario.py')
        cls.cenario = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.cenario)
        P.set_config_flags(P.FLAG_WINDOW_HIDDEN)
        P.init_window(320, 200, 'Relevo nativo')
        cls.raiz = Path(tempfile.mkdtemp(prefix='sz-relevo-nativo-'))

    @classmethod
    def tearDownClass(cls):
        P.close_window()
        shutil.rmtree(cls.raiz, ignore_errors=True)

    def abrir(self, nome):
        pasta = self.raiz / nome
        return self.cenario.Cenario(pasta, cena_dos_casos(pasta))

    def test_a_memoria_de_cada_pedaco_e_a_do_nucleo(self):
        self.assertFalse(self.cenario._NO_ESTUDIO)
        s = self.abrir('pedacos')
        try:
            for caso in CASOS['pedacos']:
                p = caso['pedaco']
                modelo = s._relevo._modelo(*s._relevo.malha(p['i0'], p['j0'], p['celulas'], p['passo']))
                try:
                    m = modelo.meshes[0]
                    vertices = base64.b64decode(caso['vertices'])
                    cores = base64.b64decode(caso['cores'])
                    indices = base64.b64decode(caso['indices'])
                    self.assertEqual(m.vertexCount * 12, len(vertices), p)
                    self.assertEqual(m.triangleCount * 6, len(indices), p)
                    self.assertEqual(bytes(P.ffi.buffer(m.vertices, len(vertices))), vertices, p)
                    self.assertEqual(bytes(P.ffi.buffer(m.colors, len(cores))), cores, p)
                    self.assertEqual(bytes(P.ffi.buffer(m.indices, len(indices))), indices, p)
                    self.assertGreater(m.vaoId, 0)
                finally:
                    P.unload_model(modelo)
        finally:
            s.descartar()

    def test_anda_desenha_e_solta(self):
        s = self.abrir('andar')
        try:
            self.assertGreater(s.estado_do_relevo()['desenhados'], 0)
            camera = P.Camera3D((10, 40, 80), (10, 0, 40), (0, 1, 0), 45, 0)
            for x in range(-20, 90, 5):
                s.atualizar(float(x), 60.0, camera=camera)
                self.assertIsNotNone(s.altura(x, 60.0))
                P.begin_drawing()
                P.clear_background(P.SKYBLUE)
                P.begin_mode_3d(camera)
                s.desenhar()
                P.end_mode_3d()
                P.end_drawing()
            self.assertEqual(s.estado_do_relevo()['faltam'], 0)
        finally:
            s.descartar()
        self.assertIsNone(s._relevo)


if __name__ == '__main__':
    unittest.main()

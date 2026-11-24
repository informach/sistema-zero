"""O mundo em campo trazido pelo importador do Estúdio, aberto pelo cenario.py (plano "Mundos de
2 km", lote 6). Recebe a pasta do motor, a pasta materializada do projeto, o módulo do cenário e os
pontos da rota; escreve o resultado em JSON na última linha."""
import importlib
import json
import os
import sys

sys.path.insert(0, sys.argv[1])
raiz, modulo, pontos = sys.argv[2], sys.argv[3], json.loads(sys.argv[4])
os.chdir(raiz)
import _szraylib


def transport(header, payload):
    return json.dumps({'now': 1000, 'events': []}), None


_szraylib.configure(transport, None, raiz, '3d')
import pyray as P
import cenario

sys.path.insert(0, raiz)
P.init_window(320, 200, 'Campo')
lugar = importlib.import_module(modulo).carregar()
inicio = lugar.estado_do_relevo()
camera = P.Camera3D((0, 80, 60), (0, 0, 0), (0, 1, 0), 45, 0)
alturas, sem_chao, maior_desenho = [], 0, 0
for x, z in pontos:
    camera.position = P.Vector3(x, 80, z + 60)
    camera.target = P.Vector3(x, 0, z)
    lugar.atualizar(float(x), float(z), camera=camera)
    h = lugar.altura(x, z)
    alturas.append(h)
    sem_chao += h is None
    maior_desenho = max(maior_desenho, lugar.estado_do_relevo()['desenhados'])
    P.begin_drawing()
    P.begin_mode_3d(camera)
    lugar.desenhar()
    P.end_mode_3d()
    P.end_drawing()
for _ in range(80):
    if lugar.estado_do_relevo()['faltam'] == 0:
        break
    lugar.atualizar(float(pontos[-1][0]), float(pontos[-1][1]), camera=camera)
fim = lugar.estado_do_relevo()
completos_guardados = sum(1 for k in lugar._relevo.modelos if k[0] == 'c')
lugar.descartar()
P.close_window()
print(json.dumps({'inicio': inicio, 'fim': fim, 'semChao': sem_chao, 'alturas': alturas,
                  'maiorDesenho': maior_desenho, 'completosGuardados': completos_guardados,
                  'tetoDeCompletos': cenario._RELEVO_COMPLETOS_GUARDADOS}))

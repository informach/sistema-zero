"""Abre o ZIP real extraído no Raylib 6 nativo ou no módulo real do Estúdio.

Uso: python -B verificar-raylib-cpython.py <pasta> <resultado.json> native|studio <py oficial>
O modo nativo usa janela oculta; capturas são evidências, não aprovação artística.
"""
import json
import math
from pathlib import Path
import struct
import sys
import time

pasta, saida, modo = Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve(), sys.argv[3]
frames = []
if modo == 'studio':
    sys.path.insert(0, str(Path(sys.argv[4]).resolve()))
    import _szraylib
    from _szraylib import _rt
    def transporte(header, payload):
        frames.append((json.loads(header), bytes(payload)))
        return json.dumps({'now': len(frames) * 1000 / 60, 'events': []}), None
    _szraylib.configure(transporte, None, str(pasta), '3d')
elif modo != 'native':
    raise ValueError('Modo de ensaio desconhecido.')

import pyray as p
sys.path.insert(0, str(pasta))
import cenario

if modo == 'native':
    p.set_config_flags(p.FLAG_WINDOW_HIDDEN)
comeco = time.time_ns()
p.init_window(960, 640, 'QA cenário Raylib')
texturas_antes = _rt._texture_count if modo == 'studio' else None
lugar = None
try:
    lugar = cenario.carregar(str(pasta / 'cenario.json'))
    d = lugar.dados
    assert d['terreno'] and len(d['aguas']) == 2 and len(d['caminhos']) == 3
    alturas = []
    t = d['terreno']
    for iz in range(21):
        for ix in range(21):
            x = t['origem']['x'] + (ix / 20) * t['colunas'] * t['passo']
            z = t['origem']['z'] + (iz / 20) * t['linhas'] * t['passo']
            alturas.append({'x': x, 'z': z, 'chao': lugar.tem_chao(x, z), 'altura': lugar.altura(x, z)})
    animacoes = []
    for n in d['nos']:
        b = (pasta / n['arquivo']).read_bytes()
        gltf = json.loads(b[20:20 + struct.unpack_from('<I', b, 12)[0]])
        if gltf.get('animations') and gltf.get('skins'):
            nomes = lugar.animacoes(n['id'])
            assert len(nomes) == len(gltf['animations']) == 4
            lugar.animar(n['id'], 0, 1.5)
            modelo = lugar._nos[n['id']][1]
            matrizes = [[getattr(modelo.boneMatrices[j], f'm{i}') for i in range(16)]
                        for j in range(modelo.skeleton.boneCount)]
            assert all(math.isfinite(v) for m in matrizes for v in m)
            animacoes.append({'no': n['id'], 'clipes': nomes, 'ossos': modelo.skeleton.boneCount,
                              'matrizes': matrizes})
    assert animacoes
    camera = p.Camera3D(p.Vector3(34, 29, 42), p.Vector3(2, 1, 0), p.Vector3(0, 1, 0), 50, p.CAMERA_PERSPECTIVE)
    for _ in range(3):
        p.begin_drawing()
        p.clear_background(p.Color(163, 205, 233, 255))
        p.begin_mode_3d(camera)
        lugar.desenhar()
        p.end_mode_3d()
        p.end_drawing()
    if modo == 'native':
        p.take_screenshot(str(saida.with_suffix('.png').relative_to(Path.cwd())).replace('\\', '/'))
        assert saida.with_suffix('.png').stat().st_mtime_ns >= comeco
    r = {
        'modo': modo, 'fonte': d['fonte'], 'nos': len(d['nos']), 'arquivos': len(d['arquivos']),
        'recursosVisuaisCompartilhados': len(lugar._modelos), 'alturas': alturas,
        'animacoes': animacoes, 'quadros': 3,
        'colisoesPorCaixa': len(d['colisoes']), 'aguaEstatica': True,
        'studioQuadrosTransportados': len(frames),
    }
    texturas = list(lugar._texturas)
    lugar.descartar()
    lugar.descartar()
    assert not lugar._modelos and not lugar._nos and lugar._alturas is None
    r['descarteIdempotente'] = True
    r['ciclos'] = [{'texturasDoCenario': texturas}]
    if modo == 'studio':
        assert _rt._texture_count == texturas_antes
    for _ in range(2):
        lugar = cenario.carregar(str(pasta / 'cenario.json'))
        texturas = list(lugar._texturas)
        p.begin_drawing()
        p.begin_mode_3d(camera)
        lugar.desenhar()
        p.end_mode_3d()
        p.end_drawing()
        lugar.descartar()
        lugar.descartar()
        assert not lugar._modelos and not lugar._texturas
        if modo == 'studio':
            assert _rt._texture_count == texturas_antes
        r['ciclos'].append({'texturasDoCenario': texturas})
    r['studioTexturasDepoisDoDescarte'] = _rt._texture_count if modo == 'studio' else None
    saida.write_text(json.dumps(r, ensure_ascii=False, indent=2), encoding='utf-8')
finally:
    if lugar is not None:
        lugar.descartar()
    p.close_window()

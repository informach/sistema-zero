"""Smoke do main.py baixado: três quadros, janela oculta, sem captura de cursor do desktop.

As únicas diferenças da cópia de QA são o limite do loop e a captura do cursor.
O código do exemplo no pacote e os modelos originais não são editados.
"""
import hashlib
import json
import os
from pathlib import Path
import sys

pasta, saida = Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve()
os.chdir(pasta)
sys.path.insert(0, str(pasta))
import pyray as p

p.set_config_flags(p.FLAG_WINDOW_HIDDEN)
original = (pasta / 'main.py').read_text(encoding='utf-8')
loop = '    while not p.window_should_close():'
assert original.count(loop) == 1
assert original.count('    p.disable_cursor()') == 1
limitado = original.replace(loop, '    for quadro_de_qa in range(3):', 1).replace('    p.disable_cursor()', '    pass  # QA: janela oculta, sem captura do cursor', 1)
exec(compile(limitado, str(pasta / 'main.py'), 'exec'), {'__name__': '__main__', '__file__': str(pasta / 'main.py')})
saida.write_text(json.dumps({'quadros': 3, 'sha256DoMainOriginal': hashlib.sha256(original.encode()).hexdigest(),
    'ajustesDoHarness': ['Limite de três quadros', 'Sem captura de cursor em janela oculta'],
    'modo': 'Raylib nativo 6.0.1.0', 'concluido': True}, indent=2), encoding='utf-8')

"""Gera todos os Lumis e o borrão do Cinza (cada arquivo num processo novo do Blender sem tela).

  /tmp/claude-0/blender-venv/bin/python arte/lumis/build_all.py

Grava `src/assets/lumis/*.glb` e atualiza `arte/lumis/relatorio.json` (triângulos, tamanho, clipes e
materiais de cada um).
"""
import os
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
ARQUIVOS = ['borrao.py', 'bosque.py', 'vila_doce.py', 'recife.py', 'pico.py', 'dinos.py', 'nuvens.py']


def main():
    relatorio = os.path.join(AQUI, 'relatorio.json')
    if os.path.exists(relatorio):
        os.remove(relatorio)
    for arq in ARQUIVOS:
        r = subprocess.run([sys.executable, os.path.join(AQUI, arq)], capture_output=True, text=True)
        for linha in r.stdout.splitlines():
            if 'triângulos' in linha:
                print(linha)
        if r.returncode != 0:
            print(r.stdout[-2000:], r.stderr[-4000:])
            sys.exit(f'falhou: {arq}')


if __name__ == '__main__':
    main()

"""Prévias das ilhas completas: a mesma conferência em Cycles do mundo (`arte/mundo/render.py`),
sem copiar. Mesmos argumentos e variáveis de ambiente (ALVO, DIR, DIST, LENTE, RES, AGUA, NOITE,
ESCONDER, ACENDER, AMOSTRAS…).

  ALVO=0,2,0 DIR=0.75,0.85,1 DIST=46 AGUA=1 \
    /tmp/claude-0/blender-venv/bin/python arte/ilhas/render.py /tmp/bosque.png src/assets/ilhas/bosque.glb

Peças com clipe que mexe na posição (o barco) voltam para a origem do arquivo: confira-as sozinhas.
"""
import os
import runpy
import sys

sys.dont_write_bytecode = True
runpy.run_path(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'mundo', 'render.py'),
               run_name='__main__')

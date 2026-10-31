"""Lumis de luz (B12): a terceira versão de cada família, que só se acha nos segredos.

  /tmp/claude-0/blender-venv/bin/python -B arte/lumis/luz.py           # os sete
  ITEM=ipe,buzio /tmp/claude-0/blender-venv/bin/python -B arte/lumis/luz.py

Cada um é a própria função da rara da família (`bosque.ipe`, `praia.buzio`…) rodando com
`L.ligar_luz()`: a mesma forma, o corpo perolado com emissão leve, a coroa de luz e o rastro de três
faíscas (veja `lib_lumis.py`, "Lumis de luz"). Se não couber nos tetos (3.000 triângulos e 130 KB),
gera de novo com o corpo um pouco mais simples (`reduz` 1, depois 2) e fica com o primeiro que cabe.
Grava `src/assets/lumis/<rara>-de-luz.glb` e as entradas com `raridade: "luz"` no `relatorio.json`.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bosque  # noqa: E402
import dinos  # noqa: E402
import lib_lumis as L  # noqa: E402
import nuvens  # noqa: E402
import pico  # noqa: E402
import praia  # noqa: E402
import recife  # noqa: E402
import vila_doce  # noqa: E402

# A rara de cada família, na ordem das ilhas.
RARAS = {
    'buzio': praia.buzio,
    'ipe': bosque.ipe,
    'brigadeiro': vila_doce.brigadeiro,
    'perola': recife.perola,
    'cristal': pico.cristal,
    'brotinho': dinos.brotinho,
    'pluma': nuvens.pluma,
}

TETO_TRIANGULOS, TETO_KB = 3000, 130


def cabe(rara):
    with open(os.path.join(L.AQUI, 'relatorio.json')) as f:
        v = json.load(f)[f'{rara}-de-luz']
    return v['triangulos'] <= TETO_TRIANGULOS and v['kb'] <= TETO_KB


if __name__ == '__main__':
    so = set((os.environ.get('ITEM') or '').split(',')) - {''}
    for rara, gerar in RARAS.items():
        if so and rara not in so:
            continue
        for reduz in (0, 1, 2):
            L.ligar_luz(reduz=reduz)
            gerar()
            if cabe(rara):
                break
        else:
            sys.exit(f'{rara}-de-luz não coube nos tetos')

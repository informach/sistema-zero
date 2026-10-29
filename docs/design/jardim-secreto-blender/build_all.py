"""Gera os GLBs do Jardim Secreto (todos ou só os pedidos) numa passada.

    JARDIM_OUT=./out python build_all.py                    # todos
    JARDIM_OUT=./out python build_all.py -- regador-azul    # só esse

Cada id é uma função de um dos módulos abaixo, com `-` trocado por `_`.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cenario, objetos

MODULOS = [cenario, objetos]

if __name__ == '__main__':
    pedidas = set(sys.argv[sys.argv.index('--') + 1:]) if '--' in sys.argv else set()
    feitas = 0
    for mod in MODULOS:
        for pid in mod.TODOS:
            if pedidas and pid not in pedidas:
                continue
            getattr(mod, pid.replace('-', '_'))()
            feitas += 1
    desconhecidas = pedidas - {pid for mod in MODULOS for pid in mod.TODOS}
    if desconhecidas:
        print('ids desconhecidos:', ', '.join(sorted(desconhecidas)))
    print(f'{feitas} peças geradas em', os.environ.get('JARDIM_OUT', './out'))

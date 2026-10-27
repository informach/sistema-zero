"""Gera os GLBs da Ilha do Farol (todos ou só os pedidos) numa passada.

    ILHA_OUT=./out python build_all.py                          # todos
    ILHA_OUT=./out python build_all.py -- farol-listrado-aceso  # só esses

Cada id é uma função de um dos módulos abaixo, com `-` trocado por `_`.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cenario, farol, objetos, personagens

MODULOS = [cenario, farol, objetos, personagens]

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
    print(f'{feitas} peças geradas em', os.environ.get('ILHA_OUT', './out'))

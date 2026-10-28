"""Gera os GLBs de TODAS as peças do quarto (ou só as pedidas) numa passada.

    ROOM_OUT=./out python build_all.py                # todas
    ROOM_OUT=./out python build_all.py -- cama tv     # só essas

Cada id do catálogo (`member-shell/src/lib/room-catalog.ts`) é uma função de um dos módulos
abaixo, com `-` trocado por `_`.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import moveis, decor, trofeus, pets, novos

PECAS = {
    moveis: ['cama', 'cadeira', 'mesa', 'sofa', 'estante', 'bau', 'mesa-estudo', 'tv', 'beliche', 'pufe'],
    decor: ['ursinho', 'balao', 'bandeira', 'globo', 'guitarra', 'bola', 'quadro', 'estrela', 'janela',
            'relogio', 'prateleira', 'poster', 'espelho', 'planta', 'arvore', 'luminaria', 'vela'],
    trofeus: ['trofeu-primeiro-jogo', 'trofeu-diploma', 'trofeu-chama', 'trofeu-medalha-mil',
              'trofeu-foguete', 'trofeu-console', 'trofeu-estrela-do-mural', 'trofeu-oficina-completa',
              'estante-trofeus'],
    pets: ['pet-gato', 'pet-cachorro', 'pet-passaro'],
    novos: novos.TODOS,
}

if __name__ == '__main__':
    pedidas = set(sys.argv[sys.argv.index('--') + 1:]) if '--' in sys.argv else set()
    feitas = 0
    for mod, ids in PECAS.items():
        for pid in ids:
            if pedidas and pid not in pedidas:
                continue
            getattr(mod, pid.replace('-', '_'))()
            feitas += 1
    desconhecidas = pedidas - {pid for ids in PECAS.values() for pid in ids}
    if desconhecidas:
        print('ids desconhecidos:', ', '.join(sorted(desconhecidas)))
    print(f'{feitas} peças geradas em', os.environ.get('ROOM_OUT', './out'))

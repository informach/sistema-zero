"""Gera todos os Lumis e o borrão do Cinza (cada arquivo num processo novo do Blender sem tela).

  /tmp/claude-0/blender-venv/bin/python arte/lumis/build_all.py

Grava `src/assets/lumis/*.glb` e refaz `arte/lumis/relatorio.json` (triângulos, tamanho, clipes e
materiais de cada um; no fim, o `biome format` da raiz deixa o arquivo no formato do repositório).
Depois confere os Lumis de luz (`luz.py`) contra a rara de cada família: os mesmos clipes com as
mesmas durações, os tetos (3.000 triângulos e 130 KB) e os materiais (os da rara, a coroa e o rastro
no `luz` e o `corpo` acendendo de leve).
"""
import json
import os
import struct
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
ARQUIVOS = ['borrao.py', 'bosque.py', 'vila_doce.py', 'recife.py', 'pico.py', 'dinos.py', 'nuvens.py', 'praia.py',
            'luz.py']
LUMIS = os.path.join(AQUI, '..', '..', 'src', 'assets', 'lumis')
RAIZ = os.path.join(AQUI, '..', '..', '..', '..')
TETO_TRIANGULOS, TETO_KB, FORCA_DO_CORPO = 3000, 130, 0.3


def duracoes(nome):
    """{clipe: duração em segundos} lidos do próprio GLB (o maior tempo das entradas de cada clipe)."""
    with open(os.path.join(LUMIS, f'{nome}.glb'), 'rb') as f:
        b = f.read()
    n = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + n])
    return {a['name']: round(max(j['accessors'][s['input']]['max'][0] for s in a['samplers']), 4)
            for a in j['animations']}


def conferir_luz(rel):
    erros = []
    luz = {k: v for k, v in rel.items() if v.get('raridade') == 'luz'}
    if len(luz) != 7:
        erros.append(f'esperava 7 Lumis de luz, achei {len(luz)}')
    for nome, v in sorted(luz.items()):
        rara = rel.get(v['rara'], {})
        if rara.get('raridade') != 'raro':
            erros.append(f'{nome}: a rara {v["rara"]} não está no relatório')
            continue
        if v['clipes'] != rara['clipes']:
            erros.append(f'{nome}: clipes {v["clipes"]} diferentes dos da rara {rara["clipes"]}')
        if duracoes(nome) != duracoes(v['rara']):
            erros.append(f'{nome}: durações {duracoes(nome)} diferentes das da rara')
        if v['triangulos'] > TETO_TRIANGULOS or v['kb'] > TETO_KB:
            erros.append(f'{nome}: {v["triangulos"]} triângulos e {v["kb"]} KB passam do teto')
        if not set(rara['materiais']) <= set(v['materiais']):
            erros.append(f'{nome}: faltam materiais da rara {set(rara["materiais"]) - set(v["materiais"])}')
        if v.get('coroa') != ['luz'] or v.get('rastro') != ['luz']:
            erros.append(f'{nome}: coroa {v.get("coroa")} e rastro {v.get("rastro")} deviam ser só `luz`')
        if v.get('emissao_do_corpo') != FORCA_DO_CORPO:
            erros.append(f'{nome}: o corpo acende com {v.get("emissao_do_corpo")}, devia ser {FORCA_DO_CORPO}')
        print(f'conferido {nome}: {v["triangulos"]} triângulos, {v["kb"]} KB')
    return erros


def main():
    relatorio = os.path.join(AQUI, 'relatorio.json')
    if os.path.exists(relatorio):
        os.remove(relatorio)
    for arq in ARQUIVOS:
        r = subprocess.run([sys.executable, os.path.join(AQUI, arq)], capture_output=True, text=True, check=False)
        for linha in r.stdout.splitlines():
            if 'triângulos' in linha:
                print(linha)
        if r.returncode != 0:
            print(r.stdout[-2000:], r.stderr[-4000:])
            sys.exit(f'falhou: {arq}')
    biome = os.path.join(RAIZ, 'node_modules', '.bin', 'biome')
    if os.path.exists(biome):
        subprocess.run([biome, 'format', '--write', relatorio], capture_output=True, check=False)
    with open(relatorio) as f:
        erros = conferir_luz(json.load(f))
    if erros:
        sys.exit('\n'.join(erros))


if __name__ == '__main__':
    main()

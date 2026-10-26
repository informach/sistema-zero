"""Compara duas saídas dos diferenciais (real x Estúdio) bit a bit.

O motor faz as contas em float como o C (ver _float32.py), então cada número tem de ser igual,
inclusive o sinal do zero; nan só é igual a nan. Rode o lado do Estúdio com --ucrt no Windows:
sem ele, sobram as diferenças de uma unidade do sinf/cosf/acosf da UCRT (ver ucrt.py).
"""
import json
import math
import sys


def close(a, b):
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(close(x, y) for x, y in zip(a, b))
    if isinstance(a, float) and isinstance(b, float):
        if math.isnan(a) and math.isnan(b):
            return True
        return a == b and math.copysign(1.0, a) == math.copysign(1.0, b)
    return a == b


def main(real_path, ours_path):
    real = json.load(open(real_path))
    ours = json.load(open(ours_path))
    missing = sorted(name for name in real if ours.get(name) == 'nao-implementada')
    wrong = sorted(name for name in real if name in ours and ours[name] != 'nao-implementada'
                   and not close(real[name], ours[name]))
    for name in wrong:
        print(f'DIFERENTE {name}:\n  real  {real[name]}\n  nosso {ours[name]}')
    print(f'{len(real)} funções; {len(wrong)} diferentes; {len(missing)} não implementadas: '
          f'{", ".join(missing)}')
    sys.exit(1 if wrong else 0)


main(sys.argv[1], sys.argv[2])

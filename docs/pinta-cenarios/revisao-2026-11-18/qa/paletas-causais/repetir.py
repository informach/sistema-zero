"""Verifica o recibo e repete os seis casos do host no checkout indicado."""
import argparse
import hashlib
import json
from pathlib import Path
from subprocess import run
from tempfile import TemporaryDirectory

HERE = Path(__file__).resolve().parent
PREFIX = HERE.parent / 'nuvem-causal-cliente/ensaios/contexto-host.inc'


def digest(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--checkout', type=Path)
    args = parser.parse_args()
    test = PREFIX.read_text('utf-8') + (HERE / 'ensaios.inc').read_text('utf-8')
    index = json.loads((HERE / 'indice.json').read_text('utf-8'))
    if digest(test) != index['fonteSha256']:
        raise SystemExit('SHA-256 do ensaio divergente')
    for receipt in index['recibos']:
        if digest((HERE / receipt['arquivo']).read_text('utf-8')) != receipt['sha256']:
            raise SystemExit('SHA-256 divergente em ' + receipt['arquivo'])
    print('Fontes e recibos conferidos.', flush=True)
    if args.checkout:
        root = args.checkout.resolve()
        cache = root / 'packages/member-shell/.cache'
        cache.mkdir(exist_ok=True)
        with TemporaryDirectory(prefix='pinta-paletas-', dir=cache) as temp:
            source = Path(temp) / 'palette-review.test.ts'
            source.write_text(test, encoding='utf-8', newline='\n')
            result = run(['bun', '--no-env-file', 'test', str(source)], cwd=root)
            raise SystemExit(result.returncode)


if __name__ == '__main__':
    main()

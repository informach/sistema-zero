"""Tira o print de cada cena-gabarito no raylib DO COMPUTADOR e guarda em reference/.

    <python com raylib==6.0.1.0> -I make_references.py [cena ...]

O e2e (e2e-runtime/python-raylib.spec.ts) roda a mesma cena no Estúdio e compara com
estes PNGs. Rode de novo só quando uma cena mudar.
"""
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
EXPECTED = '6.0.1.0'


def main(names):
    import raylib  # noqa: F401 (só para falhar cedo sem o pacote)
    from importlib.metadata import version

    if version('raylib') != EXPECTED:
        sys.exit(f'Precisa do raylib=={EXPECTED}; este Python tem {version("raylib")}.')
    scenes = names or sorted(path.stem for path in HERE.glob('*.py') if path.stem != 'make_references')
    out = HERE / 'reference'
    out.mkdir(exist_ok=True)
    for name in scenes:
        with tempfile.TemporaryDirectory() as work:
            shutil.copytree(HERE / 'assets', work, dirs_exist_ok=True)
            run = subprocess.run([sys.executable, '-I', str(HERE / f'{name}.py')], cwd=work,
                                 capture_output=True, text=True, timeout=60)
            shot = Path(work) / f'{name}.png'
            if run.returncode != 0 or not shot.exists():
                sys.exit(f'{name}: falhou\n{run.stdout[-2000:]}\n{run.stderr[-2000:]}')
            shutil.copyfile(shot, out / f'{name}.png')
            print(f'{name}: {shot.stat().st_size} bytes')


if __name__ == '__main__':
    main(sys.argv[1:])

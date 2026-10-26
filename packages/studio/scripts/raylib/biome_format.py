"""Passa um arquivo gerado pelo biome do repositório antes de gravar.

Assim o `bun run check` não reformata o que os geradores escrevem, e o `--check` de cada
gerador compara com o mesmo texto que está no disco.
"""
import shutil
import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parents[4]


def biome_format(path: Path, text: str) -> str:
    bun = shutil.which('bun')
    if not bun:
        raise SystemExit('Os geradores do Raylib precisam do bun no PATH (para o biome).')
    run = subprocess.run([bun, 'x', 'biome', 'format', f'--stdin-file-path={path}'], input=text.encode('utf-8'),
                         cwd=REPO, capture_output=True, timeout=120)
    if run.returncode != 0:
        raise SystemExit(f'biome recusou {path.name}: {run.stderr.decode("utf-8", "replace")[-1500:]}')
    return run.stdout.decode('utf-8')

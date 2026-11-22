"""Run the identical two-tab integration case against a checkout with workspace dependencies."""
from pathlib import Path
from tempfile import TemporaryDirectory
import subprocess
import sys

source = Path(__file__).resolve().parent
checkout = Path(sys.argv[1]).resolve()
cache = checkout / "packages/member-shell/.cache"
cache.mkdir(exist_ok=True)
with TemporaryDirectory(prefix="paletas-replay-", dir=cache) as scratch:
    test = Path(scratch) / "paletas.test.ts"
    prefix = source.parent / "nuvem-causal-cliente/ensaios/contexto-host.inc"
    test.write_text(prefix.read_text(encoding="utf8") + (source / "duas-abas.inc").read_text(encoding="utf8"), encoding="utf8")
    sys.exit(subprocess.call(["bun", "--no-env-file", "test", str(test)], cwd=checkout))

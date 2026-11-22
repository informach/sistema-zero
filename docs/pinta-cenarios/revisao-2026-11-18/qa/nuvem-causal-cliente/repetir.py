"""Reconstitui os ensaios privados em pastas temporárias junto ao código em teste."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
from contextlib import ExitStack
from urllib.parse import urlsplit

HERE = Path(__file__).resolve().parent
INDEX = json.loads((HERE / "indice.json").read_text("utf-8"))


def verify_text(text, expected, name):
    if hashlib.sha256(text.encode("utf-8")).hexdigest() != expected:
        raise SystemExit(f"SHA-256 divergente em {name}")


def source(case):
    text = "".join((HERE / path).read_text("utf-8") for path in case["fontes"])
    text += "\n" * case.get("lfAdicional", 0)
    verify_text(text, case["sha256"], case["nome"])
    return text


def run_candidate(root, database, legacy=None):
    package = root / "packages"
    members = package / "members"
    env = os.environ.copy()
    if legacy is not None:
        entry = legacy / "packages/pinta/src/state/persistence.ts"
        if not entry.is_file():
            raise SystemExit("Checkout do escritor antigo sem o módulo de persistência.")
        env["PINTA_REVIEW_LEGACY_ENTRY"] = str(entry)
        targets = {"terminal": package / "member-shell"}
    elif database:
        url = urlsplit(os.environ.get("PINTA_CAUSAL_TEST_DATABASE_URL", ""))
        if url.hostname not in ("127.0.0.1", "localhost", "::1"):
            raise SystemExit("O ensaio SQL usa uma URL de banco descartável em loopback.")
        targets = {"members": members}
    else:
        targets = {"host": package / "member-shell", "pinta": package / "pinta"}

    with ExitStack() as stack:
        directories = {}
        for role, target in targets.items():
            if not (target / "src").is_dir():
                raise SystemExit(f"Pacote ausente em {target}")
            cache = target / ".cache"
            cache.mkdir(exist_ok=True)
            directories[role] = Path(stack.enter_context(
                TemporaryDirectory(prefix="pinta-qa-", dir=cache)
            ))
        staged = []
        for case in INDEX["ensaios"]:
            role = case["alvo"]
            if role not in targets:
                continue
            text = source(case)
            if role == "pinta":
                # A captura original estava na raiz do pacote. Aqui está duas pastas abaixo.
                text = text.replace("'./src/", "'../../src/")
            output = directories[role] / case["nome"]
            output.write_text(text, encoding="utf-8", newline="\n")
            staged.append(str(output))
        subprocess.run(["bun", "--no-env-file", "test", *staged], cwd=root, env=env, check=True)
        if database:
            subprocess.run(
                ["bun", "--no-env-file", "test", "tests/db/pinta-causal.test.ts",
                 "-t", "a frozen two-sheet grid|omitted remote consumer"],
                cwd=members, check=True,
            )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cliente", type=Path, metavar="CHECKOUT")
    parser.add_argument("--members", type=Path, metavar="CHECKOUT")
    parser.add_argument("--terminal", type=Path, metavar="CHECKOUT")
    parser.add_argument("--legado", type=Path, metavar="CHECKOUT")
    args = parser.parse_args()
    if bool(args.terminal) != bool(args.legado):
        parser.error("--terminal e --legado exigem os dois checkouts")
    for receipt in INDEX["recibos"]:
        path = HERE / receipt["arquivo"]
        verify_text(path.read_text("utf-8"), receipt["sha256"], path.name)
    for case in INDEX["ensaios"]:
        source(case)
    print("Fontes e recibos conferidos.", flush=True)
    if args.cliente:
        run_candidate(args.cliente.resolve(), False)
    if args.terminal:
        run_candidate(args.terminal.resolve(), False, args.legado.resolve())
    if args.members:
        run_candidate(args.members.resolve(), True)


if __name__ == "__main__":
    main()

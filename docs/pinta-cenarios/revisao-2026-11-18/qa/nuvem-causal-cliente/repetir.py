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

IDB_ESM_BRIDGE = """
import { dirname as idbDirname, resolve as idbResolve } from 'node:path'
const mockIdbPath = Bun.resolveSync('idb-keyval', idbResolve(import.meta.dir, '../../../pinta'))
const compatIdb = await import(mockIdbPath)
if (compatIdb.createStore('control-current', 'kv').name !== 'control-current')
  throw Error('The test IndexedDB module was not resolved for the current ESM bundle')
for (const entry of [process.env.PINTA_REVIEW_LEGACY_ENTRY, process.env.PINTA_REVIEW_V2_ENTRY]) {
  if (!entry) continue
  const path = Bun.resolveSync('idb-keyval', idbDirname(entry))
  mock.module(path, () => ({ ...compatIdb }))
  if ((await import(path)).createStore('control-legacy', 'kv').name !== 'control-legacy')
    throw Error('The test IndexedDB module was not resolved for a historical ESM bundle')
}
"""


def verify_text(text, expected, name):
    if hashlib.sha256(text.encode("utf-8")).hexdigest() != expected:
        raise SystemExit(f"SHA-256 divergente em {name}")


def source(case):
    text = "".join((HERE / path).read_text("utf-8") for path in case["fontes"])
    text += "\n" * case.get("lfAdicional", 0)
    verify_text(text, case["sha256"], case["nome"])
    return text


def run_candidate(root, database, legacy=None, retention=False, v3=None, pins=False,
                  reader_v2=None):
    package = root / "packages"
    members = package / "members"
    env = os.environ.copy()
    if legacy is not None:
        entry = legacy / "packages/pinta/src/state/persistence.ts"
        if not entry.is_file():
            raise SystemExit("Checkout do escritor antigo sem o módulo de persistência.")
        env["PINTA_REVIEW_LEGACY_ENTRY"] = str(entry)
        if reader_v2 is not None:
            entry_v2 = reader_v2 / "packages/pinta/src/state/persistence.ts"
            if not entry_v2.is_file():
                raise SystemExit("Checkout da versão 2 sem o módulo de persistência.")
            env["PINTA_REVIEW_V2_ENTRY"] = str(entry_v2)
            targets = {"duravel": package / "member-shell"}
        else:
            targets = {"retencao" if retention else "terminal": package / "member-shell"}
        if v3:
            v3_entry = v3 / "packages/pinta/src/state/persistence.ts"
            if not v3_entry.is_file():
                raise SystemExit("Checkout do escritor de fila v3 sem a persistência.")
            env["PINTA_REVIEW_V3_ENTRY"] = str(v3_entry)
            targets["leitorV3"] = package / "member-shell"
            if pins:
                targets["recursosV4"] = package / "member-shell"
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
            if role in ("terminal", "duravel"):
                # O stub original opera no módulo do candidato. Outras instalações Bun têm
                # caminhos ESM próprios e precisam usar o mesmo adaptador de armazenamento.
                marker = "import { mock } from 'bun:test'\n"
                text = text.replace(marker, marker + IDB_ESM_BRIDGE, 1)
            output = directories[role] / case["nome"]
            output.write_text(text, encoding="utf-8", newline="\n")
            staged.append(str(output))
        if legacy is None:
            subprocess.run(["bun", "--no-env-file", "test", *staged], cwd=root, env=env, check=True)
        else:
            code = 0
            for test in staged:
                # Cada teste instala mocks globais do Bun para versões locais específicas.
                result = subprocess.run(
                    ["bun", "--no-env-file", "test", test], cwd=package / "member-shell", env=env
                )
                code = max(code, result.returncode)
            if code:
                raise SystemExit(code)
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
    parser.add_argument("--retencao", type=Path, metavar="CHECKOUT")
    parser.add_argument("--legado", type=Path, metavar="CHECKOUT")
    parser.add_argument("--v3", type=Path, metavar="CHECKOUT")
    parser.add_argument("--recursos-v4", action="store_true")
    parser.add_argument("--duravel", type=Path, metavar="CHECKOUT")
    parser.add_argument("--leitor-v2", type=Path, metavar="CHECKOUT")
    args = parser.parse_args()
    if bool(args.terminal or args.retencao or args.duravel) != bool(args.legado):
        parser.error("--terminal, --retencao e --duravel usam o checkout do escritor --legado")
    if args.v3 and not args.retencao:
        parser.error("--v3 requer o leitor --retencao")
    if args.recursos_v4 and not args.v3:
        parser.error("--recursos-v4 precisa do escritor --v3 para provar a recusa da escrita antiga")
    if bool(args.duravel) != bool(args.leitor_v2):
        parser.error("--duravel e --leitor-v2 exigem os dois checkouts")
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
    if args.retencao:
        run_candidate(args.retencao.resolve(), False, args.legado.resolve(),
                      retention=True, v3=args.v3.resolve() if args.v3 else None, pins=args.recursos_v4)
    if args.duravel:
        run_candidate(args.duravel.resolve(), False, args.legado.resolve(),
                      reader_v2=args.leitor_v2.resolve())
    if args.members:
        run_candidate(args.members.resolve(), True)


if __name__ == "__main__":
    main()

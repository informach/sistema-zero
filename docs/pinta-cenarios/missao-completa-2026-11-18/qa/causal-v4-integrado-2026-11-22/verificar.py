"""Confere arquivos originais, gzip e fontes Git do corte, sem repetir os testes."""
import gzip
import hashlib
import json
import subprocess
from pathlib import Path


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    here = Path(__file__).resolve().parent
    index = json.loads((here / "index.json").read_text("utf-8"))
    root = subprocess.check_output(
        ["git", "rev-parse", "--show-toplevel"], cwd=here, text=True
    ).strip()
    for receipt in index["receipts"]:
        raw = (here / receipt["file"]).read_bytes()
        assert len(raw) == receipt["bytes"], receipt["file"]
        assert sha(raw) == receipt["sha256"], receipt["file"]
        assert sha(gzip.decompress(raw)) == receipt["rawSha256"], receipt["file"]
    for source in index["sources"]:
        raw = subprocess.check_output(
            ["git", "show", index["head"] + ":" + source["file"]], cwd=root
        )
        assert len(raw) == source["bytes"], source["file"]
        assert sha(raw) == source["gitBlobSha256"], source["file"]
    print(f'{len(index["receipts"])} recibos e {len(index["sources"])} fontes conferidos.')
    print("Esta verificação de integridade não executa os testes nem conclui a missão.")


if __name__ == "__main__":
    main()

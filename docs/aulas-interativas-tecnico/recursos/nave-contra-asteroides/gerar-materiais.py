"""Compatibilidade do comando histórico com o caderno refeito do Construtor."""
from pathlib import Path
import runpy
import sys

script = Path(__file__).resolve().parent.parent / "construtor-base/gerar-materiais.py"
sys.argv = [str(script), "construtor-nave", *sys.argv[1:]]
runpy.run_path(str(script), run_name="__main__")

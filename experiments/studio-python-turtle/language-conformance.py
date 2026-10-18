"""Native CPython proof for the exact parser shipped to the analysis worker."""
import ast
import importlib.util
import json
from pathlib import Path
import sys
import tempfile

assert sys.version_info[:3] == (3, 14, 2)
root = Path(__file__).resolve().parents[2]
directory = root / "packages/studio/src/python/language"
spec = importlib.util.spec_from_file_location("studio_language", directory / "analyzer.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
service = module.PythonLanguageService((directory / "limits.json").read_text())

def parse(source):
    return json.loads(service.request(json.dumps({"operation": "parse", "source": source, "path": "main.py"})))

def render(node):
    return json.loads(service.request(json.dumps({"operation": "render", "node": node})))

cases = [
    '# comentário\r\nnome = "🐢 ação"\r\nprint(nome, end="!") # intacto\r\n',
    'import turtle as t\nfrom random import randint as sorteio\ntartaruga = t.Turtle()\ntartaruga.forward(sorteio(1, 9))\n',
    'valores = [1, 2, 3]\nplacar = {"Ana": 2}\nfor nome in placar:\n    if placar[nome] > 0:\n        print(nome)\n',
    'class Placar:\n    """A classe da criança."""\n    def __init__(self, pontos=0):\n        self.pontos = pontos\n    def somar(self, valor):\n        self.pontos += valor\n',
    'try:\n    idade = int(input("Idade?"))\nexcept ValueError as erro:\n    print(erro)\nelse:\n    print(idade)\nfinally:\n    print("fim")\n',
    'def soma(a, /, b=2, *args, c=3, **kw):\n    return a + b\n',
    'x = 90071992547409931234567890\ny = 1e999\nz = 3j\nb = b"\\xff"\ne = ...\n',
    'valores = [x*x for x in range(5) if x%2]\ng = (x for x in valores)\n',
    '@decorador\ndef funcao():\n    yield from [1, 2]\n',
    'match valor:\n    case {"a": x}: print(x)\n    case _: pass\n',
    'nome = "mundo"\nmensagem = t"Olá {nome}"\n',
    'a = "linha\u2028interna"; b = "🐢"\rc = 2\r',
]
for source in cases:
    parsed = parse(source)
    assert parsed["ok"] and parsed["tree"] and not parsed["diagnostics"], parsed
    for token in parsed['tokens']:
        start, end = token['range']['start'], token['range']['end']
        raw = source.encode('utf-16-le')
        assert raw[2*start:2*end].decode('utf-16-le') == token['text']
        for offset in (start, end):
            assert raw[max(0, 2*offset-2):2*offset+2] != b'\r\x00\n\x00'
    rendered = render(parsed["tree"])
    assert rendered["ok"], rendered
    assert ast.dump(ast.parse(source, type_comments=True)) == ast.dump(ast.parse(rendered["source"], type_comments=True))
    # Every located node maps back to CPython's source segment, including Unicode/CRLF.
    native = ast.parse(source, type_comments=True)
    def walk(wire, node):
        if isinstance(node, ast.AST):
            if "range" in wire:
                start, end = wire["range"]["start"], wire["range"]["end"]
                segment = source.encode("utf-16-le")[2*start:2*end].decode("utf-16-le")
                assert segment == ast.get_source_segment(source, node), (segment, ast.get_source_segment(source, node))
            for name, value in ast.iter_fields(node):
                walk(wire["fields"][name], value)
        elif isinstance(node, list):
            for child, value in zip(wire, node): walk(child, value)
    walk(parsed["tree"], native)

with tempfile.TemporaryDirectory() as directory:
    marker = Path(directory) / 'must-not-exist'
    hostile = f'from pathlib import Path\nPath({str(marker)!r}).write_text("executed")\nwhile True: pass\n'
    assert parse(hostile)["tree"]
    assert not marker.exists()
for source in ['if True print(1)', 'print("🐢"); x =', 'a = (', 'x = "\\uD800"\n']:
    result = parse(source)
    if 'D800' in source:
        assert result['tree']
    else:
        assert result["ok"] and result["tree"] is None and result["diagnostics"]
assert not parse('x=1\n' * 20_000)["ok"]
assert not parse('x'*1_048_577)["ok"]
malformed = parse('x = 1')["tree"]
malformed["fields"]["body"][0]["fields"]["targets"][0]["fields"]["id"] = 'x; print("injected")'
assert not render(malformed)["ok"]
print(json.dumps({"passed": len(cases), "engine": sys.version.split()[0], "noLearnerExecution": True, "utf16Ranges": True, "bounded": True}))

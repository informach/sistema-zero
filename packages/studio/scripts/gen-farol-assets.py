"""Compile os SVGs originais do Farol para TS portátil e Pincel, sem DOM.

Uso: python packages/studio/scripts/gen-farol-assets.py [--check]
O conversor aceita somente os elementos presentes no fundo deste pack.
"""
from pathlib import Path
import json
import re
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET

STUDIO = Path(__file__).resolve().parents[1]
ART = STUDIO / "src/arte"
SOURCE = ART / "assets/farol"
FILES = {
    "cenario": "cenario-farol-limpo.svg", "personagem": "player-farol.svg",
    "menina": "menina-farol.svg", "marinheira": "marinheira-farol.svg",
    "menino": "menino-farol.svg", "exploradora": "exploradora-farol.svg",
    "chave": "chave-farol.svg", "farol-apagado": "farol-apagado.svg",
    "farol-aceso": "farol-aceso.svg", "barco": "barco-farol.svg",
}
# A criança troca a imagem do MESMO sprite entre estes: caixa 64 x 64 e só formas deste conversor.
PERSONAGENS = ("personagem", "menina", "marinheira", "menino", "exploradora")
HEADER = "// Gerado por scripts/gen-farol-assets.py a partir de arte/assets/farol. Não editar.\n"


def js(value):
    return json.dumps(value, ensure_ascii=False)


def call(method, *values):
    return f"ctx.{method}({', '.join(map(str, values))})"


def shape(element):
    tag = element.tag.rsplit("}", 1)[-1]
    a = element.attrib
    allowed = {"fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "transform"}
    fields = {"rect": {"x", "y", "width", "height", "rx"},
              "ellipse": {"cx", "cy", "rx", "ry"}, "line": {"x1", "y1", "x2", "y2"},
              "polygon": {"points"}, "path": {"d"}}
    if tag not in fields or set(a) - fields[tag] - allowed or list(element):
        raise ValueError(f"SVG de fundo não suportado: {tag} {a}")
    lines = ["ctx.save()"]
    if "transform" in a:
        match = re.fullmatch(r"rotate\(([-\d.]+) ([-\d.]+) ([-\d.]+)\)", a["transform"])
        if not match:
            raise ValueError(a["transform"])
        angle, x, y = map(float, match.groups())
        lines += [call("translate", x, y), f"ctx.rotate(({angle} * Math.PI) / 180)", call("translate", -x, -y)]
    for svg, canvas, default in [
        ("fill", "fillStyle", "#000000"), ("stroke", "strokeStyle", "#000000"),
        ("stroke-linecap", "lineCap", "butt"), ("stroke-linejoin", "lineJoin", "miter"),
    ]:
        if a.get(svg) != "none":
            lines.append(f"ctx.{canvas} = {js(a.get(svg, default))}")
    lines += [f"ctx.lineWidth = {a.get('stroke-width', 1)}", "ctx.beginPath()"]
    n = lambda key: float(a.get(key, 0))
    if tag == "rect":
        values = [n(k) for k in ("x", "y", "width", "height")]
        lines.append(call("roundRect", *values, n("rx")) if "rx" in a else call("rect", *values))
    elif tag == "ellipse":
        lines.append(call("ellipse", *(n(k) for k in ("cx", "cy", "rx", "ry")), 0, 0, "Math.PI * 2"))
    elif tag == "line":
        lines += [call("moveTo", n("x1"), n("y1")), call("lineTo", n("x2"), n("y2"))]
    elif tag == "polygon":
        points = [float(v) for v in re.split(r"[ ,]+", a["points"].strip())]
        for i in range(0, len(points), 2):
            lines.append(call("moveTo" if i == 0 else "lineTo", *points[i:i+2]))
        lines.append("ctx.closePath()")
    elif tag == "path":
        tokens = re.findall(r"[A-Za-z]|-?\d+(?:\.\d+)?", a["d"])
        counts = {"M": 2, "L": 2, "C": 6, "Z": 0}
        methods = {"M": "moveTo", "L": "lineTo", "C": "bezierCurveTo", "Z": "closePath"}
        while tokens:
            command = tokens.pop(0)
            if command not in counts:
                raise ValueError(f"Comando de caminho não suportado: {command}")
            count = counts[command]
            values = [float(v) for v in tokens[:count]]
            del tokens[:count]
            lines.append(call(methods[command], *values))
    if a.get("fill") != "none":
        lines.append("ctx.fill()")
    if a.get("stroke", "none") != "none":
        lines.append("ctx.stroke()")
    return lines + ["ctx.restore()"]


def write(path, content):
    formatted = subprocess.run(
        [shutil.which("bun"), "x", "biome", "format", f"--stdin-file-path={path}"],
        input=content, text=True, encoding="utf-8", capture_output=True, cwd=STUDIO, check=True,
    ).stdout
    if "--check" in sys.argv:
        if not path.exists() or path.read_text(encoding="utf-8") != formatted:
            raise RuntimeError(f"Regenerar {path}")
    else:
        path.write_text(formatted, encoding="utf-8", newline="\n")


def main():
    entries = []
    for name, filename in FILES.items():
        svg = (SOURCE / filename).read_text(encoding="utf-8").strip()
        root = ET.fromstring(svg)
        if name in PERSONAGENS:
            caixa = tuple(root.attrib.get(k) for k in ("width", "height", "viewBox"))
            if caixa != ("64", "64", "0 0 64 64"):
                raise ValueError(f"{filename}: personagem precisa da caixa 64 x 64, veio {caixa}")
            for element in root:
                shape(element)
        body = svg[svg.index(">") + 1:svg.rindex("</svg>")]
        entries.append(f"{js(name)}: {{width: {root.attrib['width']}, height: {root.attrib['height']}, body: {js(body)}}}")
    write(ART / "farol-assets.generated.ts", HEADER + "export const FAROL_ASSETS = {\n" + ",\n".join(entries) + "\n} as const\n")
    root = ET.parse(SOURCE / FILES["cenario"]).getroot()
    # Os últimos elementos são pedrinhas e tufos; a versão calma conserva mapa e ponte.
    elements = list(root)
    detail_start = next(i for i, e in enumerate(elements) if e.attrib.get("cx") == "291.51")
    lines = [line for element in elements[:detail_start] for line in shape(element)]
    lines += ["if (detalhado) {"] + [line for element in elements[detail_start:] for line in shape(element)] + ["}"]
    write(ART / "fundos/farol.generated.ts", HEADER + "import type { Pincel } from '../pincel'\nexport function pintarFarol(ctx: Pincel, detalhado: boolean) {\n" + "\n".join(lines) + "\n}\n")
    print("Artes do Farol conferidas." if "--check" in sys.argv else "Artes do Farol geradas.")


if __name__ == "__main__":
    main()

"""Gera os dois cadernos pela receita visual comum e confere todos os limites.

Uso: python gerar-materiais.py construtor-nave [--paginate]
Dependências: Bun no PATH; WeasyPrint 70, pypdf. A revisão humana das páginas
renderizadas continua obrigatória. O motor de impressão não valida a prévia WebGL.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess

from weasyprint import HTML
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[4]
TARGETS = {
    "construtor-nave": "nave-contra-asteroides",
    "construtor-patrulha": "patrulha-espacial",
    "estacao-reciclagem": "estacao-de-reciclagem",
    # os Poderes do Construtor (recursos/construtor-poderes)
    "escudo": "poder-escudo-temporario",
    "triplo": "poder-tiro-triplo",
    "inimigo": "poder-inimigo-que-atira",
    "chefao": "poder-chefao-com-resistencia",
    "arma": "poder-troca-de-arma",
}


def descendants(box):
    yield box
    for child in getattr(box, "children", []):
        yield from descendants(child)


def classes(box):
    element = getattr(box, "element", None)
    return set(element.get("class", "").split()) if element is not None else set()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("course", choices=TARGETS)
    parser.add_argument("--paginate", action="store_true", help="Dividir páginas longas por itens, preservando o tamanho da letra.")
    args = parser.parse_args()
    bun = os.environ.get("BUN_BINARY") or shutil.which("bun")
    if not bun:
        raise RuntimeError("Bun não encontrado.")
    resource = ROOT / "docs/aulas-interativas-tecnico/recursos" / args.course
    work = ROOT / "tmp/pdfs" / args.course
    output = ROOT / "docs/aulas-interativas/construtor" / TARGETS[args.course] / "passo-a-passo-do-projeto.pdf"
    pagination_path = resource / "caderno-paginacao.json"
    pagination = json.loads(pagination_path.read_text()) if pagination_path.exists() else {}
    report = {}
    document = None
    for attempt in range(30):
        generated = subprocess.run([bun, str(resource / "gerar-caderno.ts")], cwd=ROOT, timeout=60, capture_output=True, text=True)
        if generated.returncode:
            raise RuntimeError(generated.stderr or generated.stdout)
        html = work / "caderno.html"
        text = html.read_text()
        expected_colors = json.loads((work / "cores-estudio.json").read_text())
        colors = re.findall(r'data-block-type="([^"]+)" style="background-color:([^"]+)"', text)
        errors = [f"Cor diferente da definição oficial: {kind}" for kind, color in colors if expected_colors.get(kind) != color]
        # O papel virtual alto permite medir cada item inteiro, sem fragmentos
        # de uma página absoluta migrarem silenciosamente para a folha seguinte.
        # A seção continua com 297 mm e seu rodapé permanece na posição A4.
        measurement_html = text.replace("</head>", "<style>@page { size: 210mm 5000mm; }</style></head>")
        document = HTML(string=measurement_html, base_url=str(work)).render()
        declared = len(re.findall(r'<section class="page(?: |")', text))
        if len(document.pages) != declared:
            errors.append(f"Paginação inesperada: {len(document.pages)} folhas para {declared} seções.")
        overflow, pages = [], []
        for page_number, page in enumerate(document.pages, 1):
            nodes = list(descendants(page._page_box))
            sheets = [node for node in nodes if "page" in classes(node) and node.__class__.__name__ == "BlockBox"]
            if not sheets:
                errors.append(f"Página {page_number} sem seção.")
                continue
            sheet = sheets[0]
            pid = sheet.element.get("data-id")
            if "capa" in classes(sheet):
                pages.append({"number": page_number, "id": pid, "cover": True})
                continue
            footers = [node for node in nodes if "page-no" in classes(node)]
            safe_bottom = min(node.position_y for node in footers) - 18 if footers else 1030
            items = [node for node in nodes if "content-item" in classes(node) and node.__class__.__name__ == "BlockBox"]
            bottom = max((node.position_y + node.height for node in items), default=0)
            for item in items:
                if item.position_y + item.height > safe_bottom + 0.5:
                    overflow.append({"page": pid, "base": sheet.element.get("data-base-id"), "item": int(item.element.get("data-item")), "start": int(sheet.element.get("data-item-start")), "bottom": round(item.position_y + item.height, 2), "safeBottom": round(safe_bottom, 2)})
                    break
            # Sem palavras fora da folha ou desenhos empurrados para a margem direita.
            for node in nodes:
                if node.__class__.__name__ not in ("TextBox", "ReplacedBox", "InlineReplacedBox"):
                    continue
                if node.position_x < -0.5 or node.position_x + node.width > page.width + 0.5:
                    errors.append(f"{pid}: conteúdo ultrapassa a largura da folha.")
            pages.append({"number": page_number, "id": pid, "bottom": round(bottom, 2), "safeBottom": round(safe_bottom, 2), "items": len(items)})
        if overflow and args.paginate:
            changed = False
            for issue in overflow:
                if issue["item"] == issue["start"]:
                    errors.append(f"{issue['page']}: um item sozinho não cabe; dividir seu conteúdo/desenho.")
                    continue
                cuts = pagination.setdefault(issue["base"], [])
                if issue["item"] not in cuts:
                    cuts.append(issue["item"])
                    cuts.sort()
                    changed = True
            pagination_path.write_text(json.dumps(pagination, ensure_ascii=False, indent=2) + "\n")
            if changed:
                continue
        errors.extend(f"{issue['page']}: conteúdo invade o rodapé ({issue['bottom']} > {issue['safeBottom']})." for issue in overflow)
        report = {"engine": "WeasyPrint 70; HTML/CSS da receita visual comum", "pages": len(document.pages), "blocks": len(colors), "blockTypes": len(expected_colors), "pageChecks": pages, "errors": sorted(set(errors))}
        break
    else:
        raise RuntimeError("A paginação não convergiu.")
    work.mkdir(parents=True, exist_ok=True)
    (work / "layout-check.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    if report["errors"]:
        HTML(filename=str(work / "caderno.html")).write_pdf(str(work / "caderno-conferencia.pdf"))
        raise RuntimeError("\n".join(report["errors"]))
    output.parent.mkdir(parents=True, exist_ok=True)
    # Só depois da medição sem fragmentação renderizamos o papel A4 de entrega.
    document = HTML(filename=str(work / "caderno.html")).render()
    if len(document.pages) != report["pages"]:
        raise RuntimeError("A renderização A4 acrescentou ou retirou folhas após a medição.")
    document.write_pdf(str(output))
    pdf = PdfReader(output)
    fonts = set()
    for page in pdf.pages:
        if abs(float(page.mediabox.width) - 595.276) > 1 or abs(float(page.mediabox.height) - 841.89) > 1:
            raise RuntimeError("Formato diferente de A4.")
        for font in page["/Resources"].get("/Font", {}).values():
            fonts.add(str(font.get_object().get("/BaseFont", "")))
    if not any("Nunito" in f for f in fonts) or not any("Baloo" in f for f in fonts):
        raise RuntimeError(f"As duas fontes oficiais não foram incorporadas: {fonts}")
    if len(pdf.pages) != report["pages"]:
        raise RuntimeError("Contagem do PDF difere do HTML medido.")
    report["fonts"] = sorted(fonts)
    report["bytes"] = output.stat().st_size
    report["output"] = str(output.relative_to(ROOT))
    (work / "layout-check.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"pages": report["pages"], "bytes": report["bytes"], "errors": report["errors"], "output": str(output)}, ensure_ascii=False))


if __name__ == "__main__":
    main()

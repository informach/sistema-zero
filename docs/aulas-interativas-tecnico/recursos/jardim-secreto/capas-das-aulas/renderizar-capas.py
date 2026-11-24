"""Fotografa as capas de O Jardim Secreto (gerar-capas.ts) em 1672 × 941, como as de A Ilha do Farol."""
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parents[5]
PASTA = RAIZ / "tmp" / "capas-jardim"
SAIDA = RAIZ / "docs" / "aulas-interativas" / "faisca" / "o-jardim-secreto" / "capas-das-aulas"
CHROME = next(p for p in [Path("C:/Program Files/Google/Chrome/Application/chrome.exe"), Path("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe")] if p.exists())

SAIDA.mkdir(parents=True, exist_ok=True)
lista = json.loads((PASTA / "lista.json").read_text(encoding="utf-8"))
with sync_playwright() as pw:
    navegador = pw.chromium.launch(executable_path=str(CHROME), headless=True)
    pagina = navegador.new_page(viewport={"width": 1672, "height": 941})
    for capa in lista:
        pagina.goto(Path(capa["html"]).as_uri(), wait_until="load")
        pagina.evaluate("document.fonts.ready")
        fora = pagina.evaluate("""() => [...document.querySelectorAll('.titulo,.texto,.secao,.selo')]
            .filter(e => { const b = e.getBoundingClientRect(); return b.right > 1672 || b.bottom > 941 || (e.classList.contains('titulo') && b.bottom > 930) || (e.classList.contains('texto') && b.bottom > 812) })
            .map(e => e.className)""")
        if fora:
            raise SystemExit(f"{capa['png']}: fora do lugar {fora}")
        pagina.screenshot(path=str(SAIDA / capa["png"]))
    navegador.close()
print(f"{len(lista)} capas em {SAIDA}")

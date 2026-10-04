"""Gera somente o Caderno do Aluno no padrão visual do Cadê Todo Mundo.

Requer Bun, Python com Playwright e Chrome ou Edge. Usa fontes e arte locais.
Confere os limites antes de substituir o PDF. Não gera mapa para responsáveis.
"""
from pathlib import Path
import json
import shutil
import subprocess
import sys

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[4]
WORK = ROOT / "tmp" / "pdfs" / "desafio-farol"
OUTPUT = ROOT / "output" / "pdf" / "desafio-farol-caderno.pdf"


def main():
    global WORK, OUTPUT
    cade = len(sys.argv) > 1 and sys.argv[1] == "cade-todo-mundo"
    generator = Path(__file__).with_name("gerar-caderno.ts")
    if cade:
        WORK = ROOT / "tmp" / "pdfs" / "cade-todo-mundo"
        OUTPUT = ROOT / "output" / "pdf" / "cade-todo-mundo-caderno-do-aluno.pdf"
        generator = Path(__file__).parent.parent / "cade-todo-mundo" / "gerar-caderno.ts"
    bun = shutil.which("bun")
    if not bun:
        raise RuntimeError("Bun não encontrado.")
    subprocess.run([bun, str(generator)] + (["--html-only"] if cade else []),
                   cwd=ROOT, check=True, timeout=60)
    html = WORK / "caderno.html"
    if not html.exists():
        raise RuntimeError("O gerador não produziu o HTML do caderno.")
    browser_path = next((p for p in [
        Path("C:/Program Files/Google/Chrome/Application/chrome.exe"),
        Path("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"),
    ] if p.exists()), None)
    if not browser_path:
        raise RuntimeError("Chrome ou Edge não encontrado.")
    with sync_playwright() as runtime:
        browser = runtime.chromium.launch(executable_path=str(browser_path), headless=True)
        page = browser.new_page()
        page.goto(html.as_uri(), wait_until="load")
        page.emulate_media(media="print")
        page.evaluate("document.fonts.ready")
        expected_colors = json.loads((WORK / "cores-estudio.json").read_text(encoding="utf-8"))
        report = page.evaluate("""(colors) => {
          const errors = [];
          if (!document.fonts.check('16px Nunito') || !document.fonts.check('16px "Baloo 2"')) errors.push('Fontes não carregadas');
          for (const image of document.images) if (!image.complete || image.naturalWidth === 0) errors.push('Imagem não carregada');
          const drawnBlocks = document.querySelectorAll('[data-block-type]');
          for (const block of drawnBlocks) {
            const hex = colors[block.dataset.blockType];
            const rgb = hex ? 'rgb(' + [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(', ') + ')' : null;
            if (!rgb || getComputedStyle(block).backgroundColor !== rgb) errors.push('Cor diferente do Estúdio: ' + block.dataset.blockType);
          }
          for (const sheet of document.querySelectorAll('.page')) {
            const bounds = sheet.getBoundingClientRect();
            const footer = sheet.querySelector('.page-no')?.getBoundingClientRect();
            const content = sheet.querySelector('.content');
            const safeBottom = footer ? footer.top - 18 : bounds.bottom - 20;
            if (content && content.getBoundingClientRect().bottom > safeBottom) errors.push(sheet.dataset.id + ': conteúdo invade rodapé');
            for (const item of sheet.querySelectorAll('.content *, .inner > *, .cover-copy')) {
              const box = item.getBoundingClientRect();
              if (box.right > bounds.right + 1 || box.left < bounds.left - 1 || box.bottom > safeBottom + 1) errors.push(sheet.dataset.id + ': ' + (item.className || item.tagName) + ' fora dos limites');
            }
          }
          return {pages: document.querySelectorAll('.page').length, blocks: drawnBlocks.length, blockTypes: Object.keys(colors).length, errors: [...new Set(errors)]};
        }""", expected_colors)
        (WORK / "layout-check.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        if report["errors"]:
            raise RuntimeError("\n".join(report["errors"]))
        temporary = WORK / "caderno.pdf"
        page.pdf(path=str(temporary), format="A4", print_background=True,
                 prefer_css_page_size=True, display_header_footer=False)
        browser.close()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(temporary, OUTPUT)
    print(f'{report["pages"]} páginas; fontes, imagens e limites conferidos. {OUTPUT}')


if __name__ == "__main__":
    main()

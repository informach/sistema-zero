"""Gera e confere o Passo a passo do projeto comum aos dois públicos."""
from pathlib import Path
import json
import shutil
import os
import subprocess
import sys
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[4]
WORK = ROOT / 'tmp' / 'pdfs' / 'desafio-farol'
OUTPUT = ROOT / 'docs/aulas-interativas/faisca/desafio-primeiro-jogo/passo-a-passo-do-projeto.pdf'

def main():
    global WORK, OUTPUT
    cade = len(sys.argv) > 1 and sys.argv[1] == 'cade-todo-mundo'
    generator = Path(__file__).with_name('gerar-caderno.ts')
    if cade:
        WORK = ROOT / 'tmp' / 'pdfs' / 'cade-todo-mundo'
        OUTPUT = ROOT / 'docs/aulas-interativas/faisca/cade-todo-mundo/passo-a-passo-do-projeto.pdf'
        generator = Path(__file__).parent.parent / 'cade-todo-mundo' / 'gerar-caderno.ts'
    bun = shutil.which('bun')
    if not bun:
        raise RuntimeError('Bun não encontrado.')
    flags = (['--html-only'] if cade else []) + []
    subprocess.run([bun, str(generator), *flags], cwd=ROOT, check=True, timeout=60)
    html = WORK / 'caderno.html'
    if not html.exists():
        raise RuntimeError('O gerador não produziu o HTML do caderno.')
    browser_path = next((p for p in [*([Path(os.environ['CHROME_PATH'])] if os.environ.get('CHROME_PATH') else []), Path('C:/Program Files/Google/Chrome/Application/chrome.exe'), Path('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')] if p.exists()), None)
    if not browser_path:
        raise RuntimeError('Chrome ou Edge não encontrado.')
    with sync_playwright() as runtime:
        browser = runtime.chromium.launch(executable_path=str(browser_path), headless=True)
        page = browser.new_page()
        page.goto(html.as_uri(), wait_until='load')
        page.emulate_media(media='print')
        page.evaluate('document.fonts.ready')
        expected_colors = json.loads((WORK / 'cores-estudio.json').read_text(encoding='utf-8'))
        report = page.evaluate('(colors) => {\n          const errors = [];\n          if (!document.fonts.check(\'16px Nunito\') || !document.fonts.check(\'16px "Baloo 2"\')) errors.push(\'Fontes não carregadas\');\n          for (const image of document.images) if (!image.complete || image.naturalWidth === 0) errors.push(\'Imagem não carregada\');\n          const drawnBlocks = document.querySelectorAll(\'[data-block-type]\');\n          for (const block of drawnBlocks) {\n            const hex = colors[block.dataset.blockType];\n            const rgb = hex ? \'rgb(\' + [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(\', \') + \')\' : null;\n            if (!rgb || getComputedStyle(block).backgroundColor !== rgb) errors.push(\'Cor diferente do Estúdio: \' + block.dataset.blockType);\n          }\n          for (const sheet of document.querySelectorAll(\'.page\')) {\n            const bounds = sheet.getBoundingClientRect();\n            const footer = sheet.querySelector(\'.page-no\')?.getBoundingClientRect();\n            const content = sheet.querySelector(\'.content\');\n            const safeBottom = footer ? footer.top - 18 : bounds.bottom - 20;\n            if (content && content.getBoundingClientRect().bottom > safeBottom) errors.push(sheet.dataset.id + \': conteúdo invade rodapé\');\n            for (const item of sheet.querySelectorAll(\'.content *, .inner > *, .cover-copy\')) {\n              const box = item.getBoundingClientRect();\n              if (box.right > bounds.right + 1 || box.left < bounds.left - 1 || box.bottom > safeBottom + 1) errors.push(sheet.dataset.id + \': \' + (item.className || item.tagName) + \' fora dos limites\');\n            }\n          }\n          return {pages: document.querySelectorAll(\'.page\').length, blocks: drawnBlocks.length, blockTypes: Object.keys(colors).length, errors: [...new Set(errors)]};\n        }', expected_colors)
        (WORK / 'layout-check.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
        if report['errors']:
            raise RuntimeError('\n'.join(report['errors']))
        temporary = WORK / 'caderno.pdf'
        page.pdf(path=str(temporary), format='A4', print_background=True, prefer_css_page_size=True, display_header_footer=False)
        browser.close()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(temporary, OUTPUT)
    print(f"{report['pages']} páginas; fontes, imagens e limites conferidos. {OUTPUT}")
if __name__ == '__main__':
    main()

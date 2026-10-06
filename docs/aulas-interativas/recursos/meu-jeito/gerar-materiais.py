"""Gera o caderno, captura o jogo de referência e confere o PDF antes de substituir a saída."""
from pathlib import Path
import json
import shutil
import subprocess
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[4]
WORK = ROOT / 'tmp/pdfs/meu-jeito'
OUTPUT = ROOT / 'output/pdf/meu-jeito-caderno.pdf'

def main():
    bun = shutil.which('bun')
    if not bun:
        raise RuntimeError('Bun não encontrado.')
    subprocess.run([bun, str(Path(__file__).with_name('gerar-caderno.ts'))], cwd=ROOT, check=True, timeout=60)
    browser_path = next((p for p in [
        Path('C:/Program Files/Google/Chrome/Application/chrome.exe'),
        Path('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'),
    ] if p.exists()), None)
    if not browser_path:
        raise RuntimeError('Chrome ou Edge não encontrado.')
    with sync_playwright() as runtime:
        browser = runtime.chromium.launch(executable_path=str(browser_path), headless=True)
        game = browser.new_page(viewport={'width': 1000, 'height': 680})
        errors = []
        game.on('pageerror', lambda error: errors.append(str(error)))
        game.goto((WORK / 'jogo.html').as_uri(), wait_until='load')
        canvas = game.locator('canvas').first
        canvas.wait_for(state='visible')
        canvas.click()
        game.keyboard.press('Enter')
        game.wait_for_timeout(1800)
        game.keyboard.press('Space')
        game.wait_for_timeout(200)
        canvas.screenshot(path=str(WORK / 'jogo.png'))
        if errors:
            raise RuntimeError('Jogo de referência: ' + '\n'.join(errors))
        game.close()
        page = browser.new_page(viewport={'width': 1000, 'height': 1200})
        page.goto((WORK / 'caderno.html').as_uri(), wait_until='load')
        page.emulate_media(media='print')
        page.wait_for_function('window.cadernoPronto === true')
        colors = json.loads((WORK / 'cores-estudio.json').read_text(encoding='utf8'))
        report = page.evaluate('''colors => {
          const errors=[];
          if(!document.fonts.check('16px Nunito') || !document.fonts.check('16px "Baloo 2"')) errors.push('Fontes ausentes');
          for(const img of document.images) if(!img.complete || !img.naturalWidth) errors.push('Imagem ausente');
          for(const block of document.querySelectorAll('[data-block-type]')) {
            const hex=colors[block.dataset.blockType];
            const rgb=hex?'rgb('+[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(', ')+')':null;
            if(getComputedStyle(block).backgroundColor!==rgb) errors.push('Cor: '+block.dataset.blockType);
          }
          const pages=[...document.querySelectorAll('.page')];
          pages.forEach((sheet,i)=>{
            const bounds=sheet.getBoundingClientRect();
            const footer=sheet.querySelector('.page-no')?.getBoundingClientRect();
            const bottom=footer?footer.top-18:bounds.bottom-20;
            for(const item of sheet.querySelectorAll('.content *, .cover-copy')) {
              const b=item.getBoundingClientRect();
              if(b.left<bounds.left-1 || b.right>bounds.right+1 || b.bottom>bottom+1) errors.push('Página '+(i+1)+': '+item.className+' fora dos limites');
            }
          });
          return {pages:pages.length,blocks:document.querySelectorAll('[data-block-type]').length,errors:[...new Set(errors)]};
        }''', colors)
        (WORK / 'layout-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
        if report['errors']:
            raise RuntimeError('\n'.join(report['errors']))
        temporary = WORK / 'caderno.pdf'
        page.pdf(path=str(temporary), format='A4', print_background=True, prefer_css_page_size=True)
        for index in [0, 1, 4, report['pages']-1]:
            page.locator('.page').nth(index).screenshot(path=str(WORK / f'pagina-{index+1:02}.png'))
        browser.close()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(temporary, OUTPUT)
    print(f'{report["pages"]} páginas, {report["blocks"]} blocos; fontes, imagens, cores e limites conferidos. {OUTPUT}')

if __name__ == '__main__':
    main()

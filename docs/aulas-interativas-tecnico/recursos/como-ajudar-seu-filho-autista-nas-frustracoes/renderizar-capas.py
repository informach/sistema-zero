"""Depois de gerar-capas.ts, fotografa as 12 capas e confere os limites do texto."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[4];items=json.loads((root/'tmp/capas-frustracoes/lista.json').read_text(encoding='utf-8'))
with sync_playwright() as pw:
 browser=pw.chromium.launch(channel='chrome',headless=True)
 page=browser.new_page(viewport={'width':1672,'height':941})
 for item in items:
  page.goto(Path(item['html']).as_uri());page.evaluate('document.fonts.ready')
  errors=page.evaluate('''() => [...document.querySelectorAll('.titulo,.texto,.secao,.selo,h1,.sub')].filter(e=>{const r=e.getBoundingClientRect();return r.right>1640||r.bottom>930||(e.classList.contains('texto')&&r.bottom>817)}).map(e=>e.className)''')
  if errors:raise Exception(item['png']+str(errors))
  dst=Path(item['output']);dst.parent.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(dst))
 browser.close()
print(f'{len(items)} capas renderizadas e medidas')

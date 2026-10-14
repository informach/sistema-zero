from pathlib import Path
p=Path('output/instagram/postagens/2026-10-11/montar-p01.mjs')
s=p.read_text(encoding='utf-8').replace("zoom?'55 118 140 112':'0 40 480 195'", "zoom?(approach?'55 118 140 112':'93 126 100 80'):'0 40 480 195'")
p.write_text(s,encoding='utf-8',newline='\n')

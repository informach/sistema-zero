"""Reduz os ícones a uma paleta de 128 cores (com alfa) e, se pedido, monta a folha de conferência.

Roda com o Python do sistema (precisa do Pillow), não com o `bpy`:

  python3 -I arte/itens/icones_paleta.py                 # reduz todos os PNG de src/assets/icones
  python3 -I arte/itens/icones_paleta.py folha.png       # e grava a folha com todos lado a lado
  PASTA=src/assets/casa/miniaturas python3 -I arte/itens/icones_paleta.py   # outra pasta
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
ICONES = os.environ.get('PASTA') or os.path.join(AQUI, '..', '..', 'src', 'assets', 'icones')
RELATORIO = os.path.join(AQUI, 'relatorio.json')

nomes = sorted(n for n in os.listdir(ICONES) if n.endswith('.png'))
for n in nomes:
    p = os.path.join(ICONES, n)
    im = Image.open(p)
    if im.mode == 'P':
        continue
    im = im.convert('RGBA').quantize(colors=128, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    im.save(p, optimize=True)
tam = {n: os.path.getsize(os.path.join(ICONES, n)) for n in nomes}
print(f'{len(nomes)} ícones, {sum(tam.values()) / 1024:.0f} KB, maior {max(tam.values()) / 1024:.1f} KB '
      f'({max(tam, key=tam.get)})')

if len(sys.argv) > 1:
    with open(RELATORIO) as f:
        rel = json.load(f)
    ordem = sorted(nomes, key=lambda n: (rel.get(n[:-4], {}).get('grupo', 'z'), n))
    lado, col = 200, 8
    linhas = (len(ordem) + col - 1) // col
    folha = Image.new('RGB', (col * lado, linhas * (lado + 26) + 10), '#f4f1ea')
    d = ImageDraw.Draw(folha)
    try:
        fonte = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
    except OSError:
        fonte = ImageFont.load_default()
    for i, n in enumerate(ordem):
        x, y = (i % col) * lado, (i // col) * (lado + 26) + 6
        im = Image.open(os.path.join(ICONES, n)).convert('RGBA').resize((lado - 16, lado - 16), Image.LANCZOS)
        folha.paste(im, (x + 8, y), im)
        rotulo = n[:-4]
        w = d.textlength(rotulo, font=fonte)
        d.text((x + (lado - w) / 2, y + lado - 12), rotulo, fill='#3b3f46', font=fonte)
    folha.save(sys.argv[1])
    print('folha', sys.argv[1])

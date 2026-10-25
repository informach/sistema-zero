"""Extrai a fonte padrão do raylib (rtext.c, licença zlib) para o motor do Estúdio.

    python -I scripts/raylib/extract-default-font.py <caminho/do/rtext.c>

Escreve:
* src/runtime/python/raylib/py/_szraylib/_default_font.py: larguras e retângulos dos 224 glifos
  (o Python mede o texto sem perguntar ao navegador);
* src/runtime/python/raylib/defaultFont.generated.ts: o bitmap 128x128 (512 palavras de 32 bits)
  e os mesmos retângulos, para o renderizador desenhar.

O rtext.c vem do commit do raylib que o raylib-python-cffi 6.0.1.0 usa
(10a889c482bc001533536162cc2cc9d193845eae).
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from biome_format import biome_format  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]


def main(source):
    text = Path(source).read_text(encoding='utf-8')
    data_block = re.search(r'unsigned int defaultFontData\[512\] = \{(.*?)\};', text, re.S).group(1)
    words = [int(value, 16) for value in re.findall(r'0x[0-9a-fA-F]+', data_block)]
    widths_block = re.search(r'int charsWidth\[224\] = \{(.*?)\};', text, re.S).group(1)
    widths = [int(value) for value in re.findall(r'\d+', widths_block)]
    assert len(words) == 512 and len(widths) == 224
    # Mesma reconstrução do LoadFontDefault (charsHeight 10, divisor 1, imagem de 128).
    height, divisor, image = 10, 1, 128
    recs = []
    line, current, test = 0, divisor, divisor
    for width in widths:
        x, y = current, divisor + line * (height + divisor)
        test += width + divisor
        if test >= image:
            line += 1
            current = 2 * divisor + width
            test = current
            x, y = divisor, divisor + line * (height + divisor)
        else:
            current = test
        recs.append((x, y, width, height))
    header = ('# Gerado por scripts/raylib/extract-default-font.py a partir do rtext.c do raylib '
              '(zlib). Não edite.\n')
    py = [header, '# Glifos 32..255 (Latin-1); a altura base é 10.', 'BASE_SIZE = 10',
          f'WIDTHS = {tuple(widths)!r}', f'RECS = {tuple(recs)!r}']
    (ROOT / 'src/runtime/python/raylib/py/_szraylib/_default_font.py').write_bytes(
        ('\n'.join(py) + '\n').encode('utf-8'))
    ts = [
        '// Gerado por scripts/raylib/extract-default-font.py a partir do rtext.c do raylib (zlib).',
        '// Não edite. Bitmap 128x128 da fonte padrão: 1 bit por pixel, 32 pixels por palavra.',
        f'export const DEFAULT_FONT_WORDS = new Uint32Array([{",".join(str(w) for w in words)}])',
        '/** Retângulo [x, y, w, h] de cada glifo 32..255 dentro do bitmap. */',
        f'export const DEFAULT_FONT_RECS: readonly (readonly [number, number, number, number])[] = '
        f'{[list(r) for r in recs]}',
        '',
    ]
    target = ROOT / 'src/runtime/python/raylib/defaultFont.generated.ts'
    target.write_bytes(biome_format(target, '\n'.join(ts)).encode('utf-8'))
    print('fonte padrão: 224 glifos')


if __name__ == '__main__':
    main(sys.argv[1])

"""Compara o print do raylib do computador com o canvas do Estúdio (cenas-gabarito).

    python -I scripts/raylib/tests/compare_images.py real.png nosso.png [limite%]

Conta os pixels cujo canal difere mais que 48 (antisserrilhado de borda e arredondamento de GPU
mudam alguns valores; forma, cor e posição erradas mudam muitos).
"""
import sys

from PIL import Image


def main(real_path, ours_path, limit=0.5):
    real = Image.open(real_path).convert('RGB')
    ours = Image.open(ours_path).convert('RGB')
    if real.size != ours.size:
        print(f'tamanhos diferentes: {real.size} x {ours.size}')
        sys.exit(1)
    a, b = real.load(), ours.load()
    w, h = real.size
    wrong = []
    for y in range(h):
        for x in range(w):
            if max(abs(p - q) for p, q in zip(a[x, y], b[x, y])) > 48:
                wrong.append((x, y))
    share = 100 * len(wrong) / (w * h)
    print(f'{len(wrong)} pixels diferentes de {w * h} ({share:.3f}%)')
    if wrong:
        xs = [p[0] for p in wrong]
        ys = [p[1] for p in wrong]
        print(f'região: x {min(xs)}..{max(xs)}, y {min(ys)}..{max(ys)}; exemplos {wrong[:12]}')
        diff = Image.new('RGB', (w, h), (255, 255, 255))
        for point in wrong:
            diff.putpixel(point, (255, 0, 0))
        diff.save(ours_path.replace('.png', '-diff.png'))
    sys.exit(1 if share > limit else 0)


main(sys.argv[1], sys.argv[2], float(sys.argv[3]) if len(sys.argv) > 3 else 0.5)

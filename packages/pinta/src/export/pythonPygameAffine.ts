/** Native pygame-ce compositor shared by Pygame and Pygame Zero. */
export const pythonPygameAffine = `import io as _pinta_io
import math as _pinta_math
from collections import OrderedDict as _PintaOrderedDict

import pygame as _pinta_pygame


class _PintaPygameAffine:
    """Renderiza recortes dos PNGs capturados pelo leitor de mundo regional."""

    _LADO_RECORTE = 512
    _LIMITE_CACHE = 16 * 1024 * 1024
    _LIMITE_ENTRADAS = 1024

    def __init__(self, images, *, carregar_png=None):
        # O leitor já limitou a soma dos pixels de origem. Decodificar antes de
        # publicar a cena impede que um IDAT estragado falhe no meio de um quadro.
        self._imagens = {url: self._decodificar(image, carregar_png) for url, image in images.items()}
        self._cache = _PintaOrderedDict()
        self._cache_bytes = 0

    @staticmethod
    def _decodificar(image, carregar_png):
        pg = _pinta_pygame
        try:
            png = image['png']
            decoded = (pg.image.load(_pinta_io.BytesIO(png), 'pinta.png') if carregar_png is None
                       else carregar_png(png))
            size = image['width'], image['height']
            if decoded.get_size() != size:
                raise ValueError('As dimensões do recurso são diferentes do PNG capturado.')
            if decoded.get_bytesize() == 4 and decoded.get_masks()[3] and decoded.get_colorkey() is None:
                return decoded
            # Materializa o alpha de formatos com paleta/chave para que PixelArray
            # copie pixels sem conversões, inclusive se a janela ainda não abriu.
            return pg.image.frombytes(pg.image.tobytes(decoded, 'RGBA'), size, 'RGBA')
        except (pg.error, ValueError) as error:
            raise ValueError('Não consegui abrir uma imagem do cenário do Pinta.') from error

    @property
    def fechado(self):
        return self._imagens is None

    def imagem(self, url):
        if self.fechado:
            raise RuntimeError('As imagens deste cenário do Pinta já foram descartadas.')
        fonte = self._imagens.get(url)
        if fonte is None:
            return None
        copia = fonte.copy()
        copia.set_alpha(255)
        return copia

    def descartar(self):
        self._imagens = None
        self._cache.clear()
        self._cache_bytes = 0

    def _transformado(self, url, crop, matrix, area):
        key = url, crop, matrix, area
        cached = self._cache.get(key)
        if cached is not None:
            self._cache.move_to_end(key)
            return cached
        fonte = self._imagens[url]
        sx, sy, sw, sh = crop
        a, b, c, d, e, f = matrix
        left, top, width, height = area
        if (b == c == 0 and a > 0 and d > 0 and a == int(a) and d == int(d)
                and area == (_pinta_math.ceil(e - 0.5), _pinta_math.ceil(f - 0.5), sw * a, sh * d)):
            imagem = _pinta_pygame.transform.scale(fonte.subsurface(crop), (width, height))
        else:
            imagem = _pinta_pygame.Surface((width, height), _pinta_pygame.SRCALPHA, 32, fonte.get_masks())
            det = a * d - b * c
            with _pinta_pygame.PixelArray(fonte) as origem, _pinta_pygame.PixelArray(imagem) as destino:
                for py in range(height):
                    y = top + py + 0.5 - f
                    for px in range(width):
                        x = left + px + 0.5 - e
                        u, v = (d * x - c * y) / det, (a * y - b * x) / det
                        if 0 <= u < sw and 0 <= v < sh:
                            destino[px, py] = origem[sx + int(u), sy + int(v)]
        size = imagem.get_pitch() * height
        while self._cache and (self._cache_bytes + size > self._LIMITE_CACHE
                               or len(self._cache) >= self._LIMITE_ENTRADAS):
            _, antiga = self._cache.popitem(last=False)
            self._cache_bytes -= antiga.get_pitch() * antiga.get_height()
        if size <= self._LIMITE_CACHE:
            self._cache[key] = imagem
            self._cache_bytes += size
        return imagem

    def desenhar(self, tela):
        """Devolve o callback usado por CenaRegional.desenhar para este palco."""
        if self.fechado:
            raise RuntimeError('As imagens deste cenário do Pinta já foram descartadas.')
        clip = tela.get_clip()
        floor, ceil = _pinta_math.floor, _pinta_math.ceil

        def draw_affine(url, crop, matrix, opacity):
            if self.fechado:
                raise RuntimeError('As imagens deste cenário do Pinta já foram descartadas.')
            a, b, c, d, e, f = matrix
            alpha = int(opacity * 255 + 0.5)
            det = a * d - b * c
            if not alpha or det == 0 or not _pinta_math.isfinite(det):
                return
            origem_x, origem_y = floor(e), floor(f)
            fx, fy = e - origem_x, f - origem_y
            w, h = crop[2:]
            xs = fx, a * w + fx, c * h + fx, a * w + c * h + fx
            ys = fy, b * w + fy, d * h + fy, b * w + d * h + fy
            left = max(ceil(min(xs) - 0.5), clip.left - origem_x)
            top = max(ceil(min(ys) - 0.5), clip.top - origem_y)
            # Inclui a borda máxima para que reflexos preservem o pixel em cima
            # da primeira aresta do recorte. O inverso descarta a borda oposta.
            right = min(floor(max(xs) - 0.5) + 1, clip.right - origem_x)
            bottom = min(floor(max(ys) - 0.5) + 1, clip.bottom - origem_y)
            if left >= right or top >= bottom:
                return
            if a == d == 1 and b == c == 0:
                fonte = self._imagens[url]
                fonte.set_alpha(alpha)
                tela.blit(fonte, (origem_x + ceil(fx - 0.5), origem_y + ceil(fy - 0.5)), crop)
                return
            lado = self._LADO_RECORTE
            fase = a, b, c, d, fx, fy
            for y in range(top, bottom, lado):
                for x in range(left, right, lado):
                    area = x, y, min(lado, right - x), min(lado, bottom - y)
                    imagem = self._transformado(url, crop, fase, area)
                    imagem.set_alpha(alpha)
                    tela.blit(imagem, (origem_x + x, origem_y + y))

        return draw_affine
`

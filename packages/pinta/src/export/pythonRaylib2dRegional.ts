/** Private native Raylib 2D adapter. Assemble with the world, scene, and backend sources. */
export const pythonRaylib2dRegional = `import math as _pinta_raylib_math
from threading import get_ident as _pinta_thread_id

import pyray as _pinta_raylib


class _PintaRaylibAffine:
    """Uma textura de origem por PNG capturado. Cada recorte usa as UVs do PNG."""

    def __init__(self, images):
        ray = _pinta_raylib
        if not ray.is_window_ready():
            raise RuntimeError('Abra a janela do Raylib antes de abrir o cenário do Pinta.')
        self._thread = _pinta_thread_id()
        self._janela = ray.get_window_handle()
        self._texturas = {}
        try:
            for url, image in images.items():
                texture = self._carregar_textura(image)
                self._texturas[url] = texture
                ray.set_texture_filter(texture, ray.TEXTURE_FILTER_POINT)
        except BaseException:
            self.descartar()
            raise

    @staticmethod
    def _carregar_textura(resource):
        ray = _pinta_raylib
        png = resource['png']
        buffer = ray.ffi.from_buffer('const unsigned char[]', png)
        image = ray.load_image_from_memory('.png', buffer, len(png))
        try:
            if (not ray.is_image_valid(image) or image.width != resource['width']
                    or image.height != resource['height']):
                raise ValueError('Não consegui abrir uma imagem do cenário do Pinta.')
            texture = ray.load_texture_from_image(image)
            if (not ray.is_texture_valid(texture) or texture.width != image.width
                    or texture.height != image.height):
                if texture.id:
                    ray.unload_texture(texture)
                raise ValueError('Não consegui preparar uma textura do cenário do Pinta.')
            return texture
        finally:
            if image.data != ray.ffi.NULL:
                ray.unload_image(image)

    def _verificar_thread(self):
        if _pinta_thread_id() != self._thread:
            raise RuntimeError('Use o cenário do Pinta na thread da janela do Raylib.')

    def _janela_ativa(self):
        ray = _pinta_raylib
        return ray.is_window_ready() and ray.get_window_handle() == self._janela

    def _verificar_janela(self):
        self._verificar_thread()
        if not self._janela_ativa():
            raise RuntimeError('O cenário do Pinta precisa da janela em que foi aberto.')

    def descartar(self):
        self._verificar_thread()
        ray = _pinta_raylib
        if self._texturas and self._janela_ativa():
            # Pode haver quadriláteros desta cena aguardando o fim do quadro.
            ray.rl_draw_render_batch_active()
            for texture in self._texturas.values():
                ray.unload_texture(texture)
        self._texturas.clear()

    def desenhar(self, url, crop, matrix, opacity):
        ray = _pinta_raylib
        a, b, c, d, e, f = matrix
        alpha = int(opacity * 255 + 0.5)
        det = a * d - b * c
        if not alpha or det == 0 or not _pinta_raylib_math.isfinite(det):
            return
        texture = self._texturas[url]
        x, y, w, h = crop
        u0, u1 = x / texture.width, (x + w) / texture.width
        v0, v1 = y / texture.height, (y + h) / texture.height
        tl = u0, v0, e, f
        bl = u0, v1, c * h + e, d * h + f
        br = u1, v1, a * w + c * h + e, b * w + d * h + f
        tr = u1, v0, a * w + e, b * w + f
        # A ordem do Raylib é TL, BL, BR, TR. Reflexos preservam UVs em cada
        # vértice e invertem o percurso para respeitar o descarte de faces.
        vertices = (tl, bl, br, tr) if det > 0 else (tl, tr, br, bl)
        ray.rl_check_render_batch_limit(4)
        ray.rl_set_texture(texture.id)
        ray.rl_begin(ray.RL_QUADS)
        try:
            ray.rl_color4ub(255, 255, 255, alpha)
            ray.rl_normal3f(0, 0, 1)
            for u, v, vx, vy in vertices:
                ray.rl_tex_coord2f(u, v)
                ray.rl_vertex2f(vx, vy)
        finally:
            ray.rl_end()
            ray.rl_set_texture(0)


class CenarioRegionalRaylib2D(_PintaSceneBackend):
    """Abra após init_window e descarte antes de close_window, na thread da janela."""

    _criar_renderizador = _PintaRaylibAffine

    def substituir(self, source, mapa_id=None):
        if self._owner is not None:
            self._renderizador._verificar_thread()
        super().substituir(source, mapa_id)

    def desenhar(self, camera=(0, 0), frente=False, tempo=None, *, viewport=None):
        """Pinta a camada pedida entre o começo e o fim do desenho do Raylib."""
        renderizador = self._renderizador
        renderizador._verificar_janela()
        if viewport is None:
            viewport = _pinta_raylib.get_screen_width(), _pinta_raylib.get_screen_height()
        if tempo is None:
            tempo = self.tempo_decorrido
        self.cena.desenhar(renderizador.desenhar, viewport, camera, frente, tempo)
`

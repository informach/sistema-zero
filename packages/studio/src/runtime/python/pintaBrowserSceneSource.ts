import { pythonRegionWorld } from '../../../../pinta/src/export/pythonRegionWorld'
import { pythonSceneBackend } from '../../../../pinta/src/export/pythonSceneBackend'
import { pythonSceneRuntime } from '../../../../pinta/src/export/pythonSceneRuntime'

const affine = `
class _PintaBrowserAffine:
    def __init__(self, images, transporte):
        self._transporte = transporte
        self._indices = {url: index for index, url in enumerate(images)}
        self._owner = None
        if images:
            descriptors = [(item['width'], item['height'], len(item['png'])) for item in images.values()]
            payload = b''.join(item['png'] for item in images.values())
            try:
                owner = transporte._pinta_carregar(descriptors, payload)
            except RuntimeError as error:
                raise ValueError(str(error)) from error
            if type(owner) is not int or not 0 < owner < 2**53:
                raise RuntimeError('O navegador não abriu os recursos do cenário do Pinta.')
            self._owner = owner

    def desenhar(self, url, crop, matrix, opacity):
        self._transporte._pinta_desenhar(self._owner, self._indices[url], crop, matrix, opacity)

    def descartar(self):
        if self._owner is not None:
            self._transporte._pinta_descartar(self._owner)
        self._owner = None
        self._indices.clear()
`

export const pythonPintaPgzeroBrowserAdapter = `${affine}
from pgzero import _sz as _pinta_pgzero_transport


class CenarioRegionalPygameZero(_PintaSceneBackend):
    @staticmethod
    def _criar_renderizador(images):
        return _PintaBrowserAffine(images, _pinta_pgzero_transport)

    def desenhar(self, screen, camera=(0, 0), frente=False, tempo=None):
        renderizador = self._renderizador
        viewport = screen.surface.get_size()
        self.cena.desenhar(renderizador.desenhar, viewport, camera, frente,
                           self.tempo_decorrido if tempo is None else tempo)
`

export const pythonPintaRaylib2dBrowserAdapter = `${affine}
from _szraylib import _rt as _pinta_raylib_transport


class CenarioRegionalRaylib2D(_PintaSceneBackend):
    @staticmethod
    def _criar_renderizador(images):
        _pinta_raylib_transport.require_window('abrir cenário do Pinta')
        if _pinta_raylib_transport.mode != '2d':
            raise RuntimeError('Este cenário do Pinta usa Raylib 2D.')
        return _PintaBrowserAffine(images, _pinta_raylib_transport)

    def desenhar(self, camera=(0, 0), frente=False, tempo=None, *, viewport=None):
        renderizador = self._renderizador
        _pinta_raylib_transport.require_window('desenhar cenário do Pinta')
        if viewport is None:
            janela = _pinta_raylib_transport.window
            viewport = janela.width, janela.height
        self.cena.desenhar(renderizador.desenhar, viewport, camera, frente,
                           self.tempo_decorrido if tempo is None else tempo)
`

const common = `${pythonRegionWorld}
${pythonSceneRuntime}
${pythonSceneBackend}
`

/** Private compositions retained for programs used to exercise the bridge in isolation. */
export const pythonPintaPgzeroBrowser = common + pythonPintaPgzeroBrowserAdapter
export const pythonPintaRaylib2dBrowser = common + pythonPintaRaylib2dBrowserAdapter

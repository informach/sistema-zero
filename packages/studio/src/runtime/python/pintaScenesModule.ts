import { pythonLegacySceneWorld } from '../../../../pinta/src/export/pythonLegacySceneWorld'
import { pythonPgzeroRegional } from '../../../../pinta/src/export/pythonPgzeroRegional'
import { pythonPygameAffine } from '../../../../pinta/src/export/pythonPygameAffine'
import { pythonPygameRegional } from '../../../../pinta/src/export/pythonPygameRegional'
import { pythonRaylib2dRegional } from '../../../../pinta/src/export/pythonRaylib2dRegional'
import { pythonRegionWorld } from '../../../../pinta/src/export/pythonRegionWorld'
import { pythonSceneBackend } from '../../../../pinta/src/export/pythonSceneBackend'
import { pythonSceneRuntime } from '../../../../pinta/src/export/pythonSceneRuntime'
import {
  pythonPintaPgzeroBrowserAdapter,
  pythonPintaRaylib2dBrowserAdapter,
} from './pintaBrowserSceneSource'
import type { PythonPintaScenesCanvas } from './pintaScenesContract'

type PintaSceneModuleTarget =
  | { canvas: 'python-pygame'; legacySource: string }
  | { canvas: Exclude<PythonPintaScenesCanvas, 'python-pygame'>; environment: 'browser' | 'native' }

const common = `${pythonRegionWorld}
${pythonLegacySceneWorld}
${pythonSceneRuntime}
${pythonSceneBackend}`

/** Fixed source recipe for both runtime installation and desktop export. */
export function buildPythonPintaScenesModule(target: PintaSceneModuleTarget) {
  let backend: string
  let legacy = ''
  let adapter: string
  switch (target.canvas) {
    case 'python-pygame':
      backend = 'CenarioRegionalPygame'
      legacy = target.legacySource
      adapter = pythonPygameAffine + pythonPygameRegional
      break
    case 'python-pgzero':
      backend = 'CenarioRegionalPygameZero'
      adapter =
        target.environment === 'browser'
          ? pythonPintaPgzeroBrowserAdapter
          : pythonPygameAffine + pythonPgzeroRegional
      break
    case 'python-raylib-2d':
      backend = 'CenarioRegionalRaylib2D'
      adapter =
        target.environment === 'browser'
          ? pythonPintaRaylib2dBrowserAdapter
          : pythonRaylib2dRegional
      break
  }
  const exports = legacy ? "__all__.append('carregar_cenario')" : "__all__ = ['carregar_cenario']"
  return `${legacy}
${common}
${adapter}
import os as _pinta_os

${exports}

def _capturar_arquivo_cenario(nome):
    caminho = _pinta_os.fspath(nome)
    if not isinstance(caminho, str):
        raise TypeError('Dê o nome ou caminho do PNG do Pinta.')
    if '/' not in caminho and chr(92) not in caminho and not caminho.lower().endswith('.png'):
        caminho = _pinta_os.path.join('assets', caminho + '.png')
    with open(caminho, 'rb') as arquivo:
        data = arquivo.read(_PINTA_PNG_MAX_BYTES + 1)
    if len(data) > _PINTA_PNG_MAX_BYTES:
        _png_limit()
    return data


class _CenarioDoPinta(${backend}):
    _ler_mundo = staticmethod(ler_mundo_cenario)

    def substituir(self, nome, lugar=None):
        super().substituir(_capturar_arquivo_cenario(nome), lugar)


def carregar_cenario(nome, *, lugar=None):
    """Abre um cenário do PNG do Pinta. O jogo decide quando desenhar e seguir pelas portas."""
    return _CenarioDoPinta(nome, lugar)
`
}

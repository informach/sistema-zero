import { pythonLegacySceneWorld } from './pythonLegacySceneWorld'
import { pythonPygameAffine } from './pythonPygameAffine'
import { pythonPygameRegional } from './pythonPygameRegional'
import { pythonRegionWorld } from './pythonRegionWorld'
import { pythonSceneBackend } from './pythonSceneBackend'
import { pythonSceneRuntime } from './pythonSceneRuntime'

const common = `${pythonRegionWorld}
${pythonLegacySceneWorld}
${pythonSceneRuntime}
${pythonSceneBackend}`

type PintaScenesBackend =
  | 'CenarioRegionalPygame'
  | 'CenarioRegionalPygameZero'
  | 'CenarioRegionalRaylib2D'

/**
 * Where a bare name (`carregar_cenario('vila')`) is: where the Studio panel places the PNG
 * (projectStore addAsset) and where each engine opens its own images. Pygame-ce keeps the Pinta
 * drawings in `assets/`; Pygame Zero finds `images/` next to the MAIN file, the root its loaders
 * use for `Actor('vila')`; raylib opens `images/` from the folder the game runs in.
 */
const BARE_NAME_FOLDER: Readonly<Record<PintaScenesBackend, string>> = {
  CenarioRegionalPygame: "'assets'",
  CenarioRegionalPygameZero:
    "_pinta_os.path.join(__import__('pgzero.loaders').loaders.root, 'images')",
  CenarioRegionalRaylib2D: "'images'",
}

/** Explicit adapter selection. The host owns the extension and release policy. */
export function composePintaScenesModule(
  backend: PintaScenesBackend,
  adapter: string,
  legacy = '',
) {
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
        caminho = _pinta_os.path.join(${BARE_NAME_FOLDER[backend]}, caminho + '.png')
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

export function buildPygamePintaScenesModule(legacy = '') {
  return composePintaScenesModule(
    'CenarioRegionalPygame',
    pythonPygameAffine + pythonPygameRegional,
    legacy,
  )
}

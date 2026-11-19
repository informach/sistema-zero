import type {
  CenaNoThree,
  OpcoesDoRuntimeCompilado,
} from '@sistemazero/molda-cenarios-motor/runtime'
import { resolverInicioDaCena } from '@sistemazero/molda-cenarios-motor/runtime'
import type { Scene } from 'three'
import type { Asset3DManifestEntry } from '../core/projectAssets'
import { resolverAssetsDoTransporte3D, type TransporteDeCenas3D } from '../core/scene3d/transporte'
import { carregarCena3DDoProjeto } from './scene3d'
import { type CenaNoCanvas, criarInstaladorDeCenas3D } from './scene3dCanvas'
import type { Scene3DProtocol } from './scene3dProtocol'

declare global {
  interface Window {
    __SZGAME_CENAS_3D?: TransporteDeCenas3D
    __SZGAME_ASSETS?: Record<string, string>
    __SZGAME_ASSETS_3D?: Record<string, Asset3DManifestEntry>
    SZScene3D?: Scene3DProtocol<
      Scene,
      OpcoesDoRuntimeCompilado,
      CenaNoThree,
      CenaNoCanvas,
      ReturnType<typeof resolverInicioDaCena>
    >
  }
}

/** Installed only in a document containing scene assets, before the engine and learner code. */
function carregarDoDocumento(
  id: string,
  sinal: AbortSignal,
  opcoes?: OpcoesDoRuntimeCompilado,
): ReturnType<typeof carregarCena3DDoProjeto> {
  try {
    sinal.throwIfAborted()
    const transporte = window.__SZGAME_CENAS_3D
    if (!transporte) throw Error('Este projeto não tem um cenário disponível.')
    const assets = resolverAssetsDoTransporte3D(
      transporte,
      window.__SZGAME_ASSETS ?? {},
      window.__SZGAME_ASSETS_3D ?? {},
    )
    return carregarCena3DDoProjeto(id, assets, sinal, opcoes)
  } catch (erro) {
    return Promise.reject(erro)
  }
}

const ligacoesCanvas = criarInstaladorDeCenas3D(carregarDoDocumento)
// Before learner-owned renderer teardown, including programs without the lifecycle wrapper.
function aoSairDoDocumento(evento: PageTransitionEvent) {
  if (evento.persisted) return
  window.removeEventListener('pagehide', aoSairDoDocumento, true)
  ligacoesCanvas.descartar()
}
window.addEventListener('pagehide', aoSairDoDocumento, { capture: true })

const sdk: NonNullable<Window['SZScene3D']> = Object.freeze({
  carregar: carregarDoDocumento,
  inicio: resolverInicioDaCena,
  instalar: ligacoesCanvas.instalar,
  instalado: ligacoesCanvas.instalado,
})
Object.defineProperty(window, 'SZScene3D', {
  value: sdk,
  configurable: true,
  writable: false,
})

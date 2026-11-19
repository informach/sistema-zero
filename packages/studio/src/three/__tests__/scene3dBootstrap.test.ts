import { expect, test } from 'bun:test'
import { Scene } from 'three'
import { asset3DManifest, assetManifest } from '../../core/projectAssets'
import { criarTransporteDeCenas3D } from '../../core/scene3d/transporte'
import { criarTransporteDeEnsaio } from '../../testing/scene3dTransportFixture'

test('o SDK conserva a cena no pagehide persistido e libera no pagehide definitivo', async () => {
  const plano = await criarTransporteDeEnsaio(),
    anterior = Object.getOwnPropertyDescriptor(window, 'SZScene3D'),
    canais = {
      transporte: window.__SZGAME_CENAS_3D,
      imagens: window.__SZGAME_ASSETS,
      modelos: window.__SZGAME_ASSETS_3D,
    }
  window.__SZGAME_CENAS_3D = criarTransporteDeCenas3D(plano.assets)
  window.__SZGAME_ASSETS = assetManifest(plano.assets)
  window.__SZGAME_ASSETS_3D = asset3DManifest(plano.assets)
  try {
    await import('../scene3dBootstrap')
    const sdk = window.SZScene3D
    if (!sdk) throw Error('O SDK não foi instalado no documento.')
    const cena = new Scene(),
      r = await sdk.instalar(plano.assetId, cena, new AbortController().signal)
    window.dispatchEvent(Object.assign(new Event('pagehide'), { persisted: true }))
    expect(sdk.instalado(cena)).toBe(r)
    expect(r.fisica.active()).toBe(true)
    expect(r.cena.parent).toBe(cena)
    window.dispatchEvent(Object.assign(new Event('pagehide'), { persisted: false }))
    expect(sdk.instalado(cena)).toBeUndefined()
    expect(r.fisica.active()).toBe(false)
    expect(r.colisoes.arvores).toBe(0)
  } finally {
    window.dispatchEvent(Object.assign(new Event('pagehide'), { persisted: false }))
    if (anterior) Object.defineProperty(window, 'SZScene3D', anterior)
    else Reflect.deleteProperty(window, 'SZScene3D')
    window.__SZGAME_CENAS_3D = canais.transporte
    window.__SZGAME_ASSETS = canais.imagens
    window.__SZGAME_ASSETS_3D = canais.modelos
  }
})

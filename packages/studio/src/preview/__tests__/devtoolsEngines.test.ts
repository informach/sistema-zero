import { describe, expect, it } from 'bun:test'
import { extensionBootstrapContext, loadExtensionBootstrapScripts } from '#extensions'
import { gameTwoDExtension } from '../../official-extensions/game-2d'
import { gameThreeDExtension } from '../../official-extensions/game-3d'
import { gameThreeDRuntimeForVariant } from '../../official-extensions/game-3d/runtime'
import { THREE_INVESTIGATION_VARIANT } from '../../official-extensions/three3dInvestigation'
import { worldThreeDExtension } from '../../official-extensions/world-3d'
import { world3DRuntimeForVariant } from '../../official-extensions/world-3d/runtime'
import { loadDevtoolsExtensionScripts } from '../devtoolsBridge'

/**
 * Com uma aba da gaveta ligada, a prévia pede os motores pela ponte: os 3D vêm na variante
 * `investigar` (a variante de sempre do projeto mais a investigação), os outros iguais, na mesma
 * ordem e sem repetir.
 */
describe('os motores da prévia com uma aba ligada', () => {
  it('os 3D vêm na variante investigar, sobre a variante de sempre do projeto', async () => {
    const context = extensionBootstrapContext({ js: 'const cena = SZGame3D.createScene("tela");' })
    const [jogo3d] = await loadDevtoolsExtensionScripts([gameThreeDExtension], context)
    expect(jogo3d).toBe(
      gameThreeDRuntimeForVariant(
        `sem-kit-plataforma+sem-cenario-molda+${THREE_INVESTIGATION_VARIANT}`,
      ),
    )
    expect(jogo3d).toContain('_szJogados')
    const [mundo] = await loadDevtoolsExtensionScripts(
      [worldThreeDExtension],
      extensionBootstrapContext({ js: 'SZWorld3D.setup({ style: "floresta" })' }),
    )
    expect(mundo).toBe(world3DRuntimeForVariant(`sem-cenario-molda+${THREE_INVESTIGATION_VARIANT}`))
  })

  it('os outros motores vêm iguais, na mesma ordem e sem repetir', async () => {
    const context = extensionBootstrapContext({ js: 'SZGame2D.createStage(320, 240)' })
    const extensions = [gameTwoDExtension, gameTwoDExtension]
    const comAbas = await loadDevtoolsExtensionScripts(extensions, context)
    const deSempre = await loadExtensionBootstrapScripts(extensions, context)
    expect(comAbas).toEqual(deSempre)
    expect(comAbas).toHaveLength(1)
  })
})

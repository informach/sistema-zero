import { it } from 'bun:test'
import { loadExtensionBootstrapScript } from '#extensions'
import { gameTwoDExtension as gameTwoD } from '../../game-2d'
import { gameKitExtension as gameTwoDAdvanced } from '../../game-2d-advanced'
import { gameTwoDRuntime } from '../../game-2d/runtime'
import { gameKitRuntime } from '../../game-2d-advanced/runtime'
it('mede', async () => {
  for (const [n, e, b] of [['g2d', gameTwoD, gameTwoDRuntime], ['gk', gameTwoDAdvanced, gameKitRuntime]] as const) {
    const a = await loadExtensionBootstrapScript(e as never, { code: 'SZGame2D.clear();' })
    const c = await loadExtensionBootstrapScript(e as never, { code: 'SZGame2D.createMapScene("a","b");' })
    const d = await loadExtensionBootstrapScript(e as never)
    console.log(n, 'base', b.length, 'semMapa', a.length, a.includes('createMap2D'), 'comMapa', c.length, 'semCtx', d.length)
  }
})

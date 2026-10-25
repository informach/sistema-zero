import { afterEach, describe, expect, it } from 'bun:test'
import { generateJS } from '#generators'
import { normalizeSZIR } from '#ir'
import { parseJS } from '../../../parsers/js'
import { type FakeRenderer, loadExampleKit } from './kitHarness'

/**
 * "Puxar as faíscas" é um bloco de ⚙️ Ao iniciar: roda UMA vez por partida, junto da receita
 * do jorro. Achado ao montar a "Noite das Fogueiras" (review 3D, cobertura total dos
 * exemplos): o `resetParticles` do motor zerava os ímãs da receita, e ele roda também no
 * "Ir para a próxima fase", que NÃO roda o Ao iniciar de novo. Da fase 2 em diante o
 * redemoinho virava um jorro reto, sem aviso nenhum. Os ímãs são parte da RECEITA (como a
 * cor e a taxa), não das faíscas no ar: trocar de fase apaga as faíscas, não a receita.
 */

const SOURCE = `
SZGameKit3D.setup({ width: 640, height: 360, world: 40, sky: "#000000", ground: "#111111" });
SZGameKit3D.defineEmitter("magia", { colorFrom: "#ffffff", colorTo: "#000000", sizeFrom: 0.3, sizeTo: 0, rate: 40, speed: 0, cone: 0, gravity: 0, glow: true });
SZGameKit3D.addAttractor("magia", 10, 1, 0, 40, 50);
SZGameKit3D.onLevelStart(function () {
  SZGameKit3D.startEmitter("magia", 0, 1, 0);
});
`.trim()

function jsDoFonte(source: string): string {
  const ir = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(source),
    extensions: [{ extensionId: 'game-3d-advanced' }],
  })
  if (!ir.behavior) throw new Error('sem behavior')
  return generateJS({ behavior: ir.behavior, lifecycle: 'game-3d-advanced' })
}

/** O x médio das faíscas vivas (o ímã está em x = 10; o jorro nasce em x = 0). */
function xMedioDasFaiscas(renderers: FakeRenderer[]): number {
  let soma = 0
  let n = 0
  renderers[0]?.scene?.traverse((o) => {
    const p = o as unknown as {
      isPoints?: boolean
      geometry?: {
        drawRange?: { count: number }
        attributes?: { position?: { array: ArrayLike<number> } }
      }
    }
    if (!p.isPoints) return
    const count = p.geometry?.drawRange?.count ?? 0
    const array = p.geometry?.attributes?.position?.array
    if (!array) return
    for (let i = 0; i < count; i++) {
      soma += array[i * 3] ?? 0
      n++
    }
  })
  return n > 0 ? soma / n : 0
}

afterEach(() => {
  window.dispatchEvent(new Event('pagehide'))
})

describe('g3k — o ímã das faíscas sobrevive à troca de fase', () => {
  it('⭐ fase 1 e fase 2: as faíscas andam para o ímã nas duas', async () => {
    const { api, step, renderers } = await loadExampleKit(jsDoFonte(SOURCE))
    api.setState('jogando')
    step(20)
    const fase1 = xMedioDasFaiscas(renderers)
    // Controle: sem o puxão (speed 0, cone 0, gravidade 0) elas ficariam em x = 0.
    expect(fase1).toBeGreaterThan(0.5)

    api.nextLevel()
    step(1) // a troca de fase acontece no começo do quadro seguinte
    expect(api.level()).toBe(2)
    step(20)
    expect(xMedioDasFaiscas(renderers)).toBeGreaterThan(0.5)
  })
})

import { afterEach, describe, expect, it } from 'bun:test'
import type * as RealTHREE from 'three'
import { MEU_MUNDO_SOURCE } from '../__gen_meumundo'
import { loadExampleWorld, loadStartedWorld, pressKey, releaseKey } from './kitHarness'

/**
 * Playthrough do Mundo 3D (R11): o mundo RODA na bancada com THREE real — o
 * passeio dirige com o teclado de verdade, a buzina dispara o gancho, as marcas
 * de pneu nascem e FAZEM FADE, o konami troca o corpo e as luzes acendem à
 * noite. É a rede que faltava na v1 (o rAF não roda em happy-dom; aqui o loop
 * é chamado NA MÃO, quadro a quadro).
 */

afterEach(() => {
  // O disposeAll escuta pagehide — recolhe palcos/renderers acumulados.
  window.dispatchEvent(new Event('pagehide'))
  for (const el of Array.from(document.querySelectorAll('#szw3d-stage'))) {
    el.remove()
  }
  releaseKey('w', 'KeyW')
  releaseKey('h', 'KeyH')
  releaseKey('shift', 'ShiftLeft')
})

function findMesh(
  scene: RealTHREE.Scene | null,
  pred: (o: RealTHREE.Object3D) => boolean,
): RealTHREE.Object3D | null {
  let hit: RealTHREE.Object3D | null = null
  scene?.traverse((o) => {
    if (!hit && pred(o)) hit = o
  })
  return hit
}

describe('Mundo 3D — playthrough (o mundo joga na bancada)', () => {
  it('dirige com W: a posição anda e a velocidade sobe', async () => {
    const { api, step } = await loadStartedWorld((a) => {
      a.car('passeio', '#ef4444')
    })
    const z0 = api.carPos('z')
    pressKey('w', 'KeyW')
    step(60)
    releaseKey('w', 'KeyW')
    expect(api.carSpeed()).toBeGreaterThan(1)
    expect(Math.abs(api.carPos('z') - z0)).toBeGreaterThan(2)
  })

  it('buzina (H): dispara o "Quando buzinar" a cada apertada, não segurando', async () => {
    let honks = 0
    const { step } = await loadStartedWorld((a) => {
      a.car('passeio', '#ef4444')
      a.horn()
      a.onHorn(() => {
        honks++
      })
    })
    pressKey('h', 'KeyH')
    step(3)
    expect(honks).toBe(1)
    step(10) // segurar NÃO re-dispara
    expect(honks).toBe(1)
    releaseKey('h', 'KeyH')
    step(2)
    pressKey('h', 'KeyH')
    step(2)
    expect(honks).toBe(2)
    releaseKey('h', 'KeyH')
  })

  it('marcas de pneu: nascem no turbo e SOMEM (fade ~6 s)', async () => {
    const { renderers, step } = await loadStartedWorld((a) => {
      a.car('corrida', '#3b82f6')
      a.carBoost(3)
      a.tireMarks('ligadas')
    })
    pressKey('w', 'KeyW')
    pressKey('shift', 'ShiftLeft')
    step(90)
    releaseKey('w', 'KeyW')
    releaseKey('shift', 'ShiftLeft')
    const scene = renderers[0]?.scene ?? null
    const tire = findMesh(scene, (o) => {
      const g = (o as RealTHREE.Mesh).geometry as RealTHREE.BufferGeometry | undefined
      return !!g?.getAttribute?.('aAlpha')
    }) as RealTHREE.Mesh | null
    expect(tire).not.toBeNull()
    const alpha = (tire?.geometry as RealTHREE.BufferGeometry).getAttribute('aAlpha')
    let lit = 0
    for (let i = 0; i < alpha.count; i++) if (alpha.getX(i) > 0.05) lit++
    expect(lit).toBeGreaterThan(0)
    // ~10 s parado: todas as marcas envelhecem além do TIRE_LIFE e apagam.
    step(300)
    let after = 0
    for (let i = 0; i < alpha.count; i++) if (alpha.getX(i) > 0.02) after++
    expect(after).toBe(0)
  })

  it('konami (↑↑↓↓←→←→BA): o carrinho vira FOGUETE (nariz de cone aparece)', async () => {
    const { renderers, step } = await loadStartedWorld((a) => {
      a.car('passeio', '#ef4444')
    })
    step(2)
    const hasCone = () =>
      findMesh(renderers[0]?.scene ?? null, (o) => {
        const g = (o as RealTHREE.Mesh).geometry as { type?: string } | undefined
        return g?.type === 'ConeGeometry'
      }) !== null
    expect(hasCone()).toBe(false)
    const seq: Array<[string, string]> = [
      ['arrowup', 'ArrowUp'],
      ['arrowup', 'ArrowUp'],
      ['arrowdown', 'ArrowDown'],
      ['arrowdown', 'ArrowDown'],
      ['arrowleft', 'ArrowLeft'],
      ['arrowright', 'ArrowRight'],
      ['arrowleft', 'ArrowLeft'],
      ['arrowright', 'ArrowRight'],
      ['b', 'KeyB'],
      ['a', 'KeyA'],
    ]
    for (const [key, code] of seq) {
      pressKey(key, code)
      releaseKey(key, code)
    }
    step(2)
    expect(hasCone()).toBe(true)
  })

  it('luzes: à noite os faróis ACENDEM (cor clara), de dia ficam apagados', async () => {
    const { api, renderers, step } = await loadStartedWorld((a) => {
      a.car('passeio', '#ef4444')
      a.carLights()
      a.setTime('meiodia')
    })
    step(3)
    const scene = renderers[0]?.scene ?? null
    const heads = () => {
      const out: string[] = []
      scene?.traverse((o) => {
        const m = (o as RealTHREE.Mesh).material as RealTHREE.MeshBasicMaterial | undefined
        if (m?.isMeshBasicMaterial) out.push(`#${m.color.getHexString()}`)
      })
      return out
    }
    expect(heads()).toContain('#8a8672') // farol apagado ao meio-dia
    api.setTime('noite')
    step(3)
    expect(heads()).toContain('#fff7c2') // farol aceso à noite
  })

  it('playthrough do exemplo "Meu Mundo": roda, dirige e não quebra', async () => {
    const { api, step } = await loadExampleWorld(MEU_MUNDO_SOURCE)
    const z0 = api.carPos('z')
    pressKey('w', 'KeyW')
    step(90)
    releaseKey('w', 'KeyW')
    expect(Math.abs(api.carPos('z') - z0)).toBeGreaterThan(1)
  })
})

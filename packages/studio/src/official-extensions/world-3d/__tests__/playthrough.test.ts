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

  it('R12: fogos explodem (pool de festa ganha partículas vivas) e confete cai', async () => {
    const { api, renderers, step } = await loadStartedWorld((a) => {
      a.car('passeio', '#ef4444')
    })
    const world = api as unknown as { fireworks(): void; confetti(): void }
    world.fireworks()
    step(45) // o foguete sobe (~26 m/s) até o pico e explode
    const scene = renderers[0]?.scene ?? null
    const party = findMesh(scene, (o) => {
      const g = (o as RealTHREE.Points).geometry as RealTHREE.BufferGeometry | undefined
      return !!(o as RealTHREE.Points).isPoints && !!g?.getAttribute?.('color')
    }) as RealTHREE.Points | null
    expect(party).not.toBeNull()
    const pos = (party?.geometry as RealTHREE.BufferGeometry).getAttribute('position')
    let vivos = 0
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) > -100) vivos++
    expect(vivos).toBeGreaterThan(20)
    world.confetti()
    step(3)
    let depois = 0
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) > -100) depois++
    expect(depois).toBeGreaterThan(vivos - 10)
  })

  it('R12: tornado SUGA o carrinho que chega perto (determinístico: teleporta ao lado)', async () => {
    const { api, step } = await loadStartedWorld((a) => {
      a.car('passeio', '#ef4444')
    })
    const world = api as unknown as { tornado(s: number): void }
    world.tornado(30)
    // O tornado nasce em (spawn+24, spawn+10); pousa o carro a 4 m dele — o raio
    // de sucção é 9 m, então a puxada começa NO PRIMEIRO quadro (sem depender do
    // passeio aleatório por waypoints, que tornava o teste flaky).
    api.carPlace(20, 10, 0)
    const x0 = api.carPos('x')
    const z0 = api.carPos('z')
    step(60) // ~2 s sob sucção
    const moved = Math.abs(api.carPos('x') - x0) + Math.abs(api.carPos('z') - z0)
    expect(moved).toBeGreaterThan(0.5)
  })

  it('R12: estação recolore as copas SEM rebuild (material compartilhado muda)', async () => {
    const { api, renderers, step } = await loadStartedWorld((a) => {
      a.car('passeio', '#ef4444')
      const w = a as unknown as { scatter(n: number, e: string): void }
      w.scatter(30, 'arvores')
    })
    step(2)
    const scene = renderers[0]?.scene ?? null
    const leafGreens = new Set(['3e8f3e', '57a344'])
    const leafMat = (() => {
      let hit: RealTHREE.MeshToonMaterial | null = null
      scene?.traverse((o) => {
        const m = (o as RealTHREE.Mesh).material as RealTHREE.MeshToonMaterial | undefined
        if (!hit && m?.color && leafGreens.has(m.color.getHexString())) hit = m
      })
      return hit as RealTHREE.MeshToonMaterial | null
    })()
    expect(leafMat).not.toBeNull()
    const world = api as unknown as { season(s: string): void }
    world.season('outono')
    step(2)
    // A MESMA instância de material agora está dourada (d97706/ea9a3c/…).
    expect(leafGreens.has((leafMat as RealTHREE.MeshToonMaterial).color.getHexString())).toBe(false)
  })

  it('R13: o carrinho EMPURRA um tijolo (ele sai do lugar) e a TNT detona em cadeia', async () => {
    let booms = 0
    const { api, step } = await loadStartedWorld((a) => {
      a.car('corrida', '#ef4444')
      const w = a as unknown as {
        pushPlace(t: string, x: number, z: number): void
        explosive(x: number, z: number): void
        onExplosion(fn: () => void): void
        carPlace(x: number, z: number, deg: number): void
      }
      w.pushPlace('tijolo', 0, 10)
      w.explosive(0, 16)
      w.explosive(0, 20) // vizinha: deve ir em CADEIA
      w.onExplosion(() => {
        booms++
      })
    })
    const w2 = api as unknown as { carPlace(x: number, z: number, deg: number): void }
    w2.carPlace(0, 0, 0) // olhando +Z, em linha com tijolo e TNTs
    pressKey('w', 'KeyW')
    step(240)
    releaseKey('w', 'KeyW')
    expect(booms).toBe(2) // as DUAS caixas explodiram (a 2ª pela cadeia)
    step(30) // a cadeia tem fuse de 0,15 s — folga
    expect(booms).toBe(2)
  })

  it('R14: poste acende à noite, vaga-lumes aparecem e a água ganha espuma', async () => {
    const { api, renderers, step } = await loadStartedWorld((a) => {
      a.car('passeio', '#ef4444')
      a.water(-2)
      const w = a as unknown as {
        lamp(x: number, z: number): void
        fireflies(a: string): void
        waterfall(x: number, z: number, h: number, d: number): void
      }
      w.lamp(6, 6)
      w.fireflies('media')
      w.waterfall(30, -20, 8, 0)
      a.setTime('meiodia')
    })
    step(3)
    const scene = renderers[0]?.scene ?? null
    const mats = () => {
      const out: string[] = []
      scene?.traverse((o) => {
        const m = (o as RealTHREE.Mesh).material as RealTHREE.MeshBasicMaterial | undefined
        if (m?.isMeshBasicMaterial && m.color) out.push(`#${m.color.getHexString()}`)
      })
      return out
    }
    expect(mats()).toContain('#6b7280') // globo do poste APAGADO ao meio-dia
    api.setTime('noite')
    step(3)
    expect(mats()).toContain('#ffe9a3') // globo ACESO à noite
    // Vaga-lumes: o material de pontos amarelo ganha opacidade junto da noite.
    let fireflyOpacity = 0
    scene?.traverse((o) => {
      const p = o as RealTHREE.Points
      const m = p.material as RealTHREE.PointsMaterial | undefined
      if (p.isPoints && m?.color && m.color.getHexString() === 'fef08a') {
        fireflyOpacity = m.opacity
      }
    })
    expect(fireflyOpacity).toBeGreaterThan(0.3)
    // Espuma da costa: o shader da água ganhou o uniform ligado.
    let hasFoam = 0
    scene?.traverse((o) => {
      const m = (o as RealTHREE.Mesh).material as RealTHREE.ShaderMaterial | undefined
      if (m?.isShaderMaterial && m.uniforms?.uHasFoam) hasFoam = m.uniforms.uHasFoam.value
    })
    expect(hasFoam).toBe(1)
  })

  it('R15: personagem ANDA a pé, entra no carrinho com E e desce com E (hooks disparam)', async () => {
    let entrou = 0
    let saiu = 0
    const { api, step } = await loadStartedWorld((a) => {
      a.car('passeio', '#ef4444')
      const w = a as unknown as {
        person(c: string, h: string): void
        onVehicle(w: string, fn: () => void): void
        personPos(a: string): number
        isDriving(): boolean
        personPlace(x: number, z: number, d: number): void
      }
      w.person('#3b82f6', 'bone')
      w.onVehicle('entrar', () => {
        entrou++
      })
      w.onVehicle('sair', () => {
        saiu++
      })
    })
    const w2 = api as unknown as {
      personPos(a: string): number
      isDriving(): boolean
      personPlace(x: number, z: number, d: number): void
    }
    // Começa A PÉ ao lado do carrinho.
    expect(w2.isDriving()).toBe(false)
    const x0 = w2.personPos('x')
    const z0 = w2.personPos('z')
    pressKey('w', 'KeyW')
    step(45)
    releaseKey('w', 'KeyW')
    const andou = Math.abs(w2.personPos('x') - x0) + Math.abs(w2.personPos('z') - z0)
    expect(andou).toBeGreaterThan(1)
    // E o CARRINHO ficou parado enquanto isso (teclado é do personagem).
    expect(api.carSpeed()).toBeLessThan(0.5)
    // Volta pra perto do carrinho e ENTRA com E.
    w2.personPlace(api.carPos('x') + 1.5, api.carPos('z'), 0)
    step(2)
    pressKey('e', 'KeyE')
    step(2)
    releaseKey('e', 'KeyE')
    expect(w2.isDriving()).toBe(true)
    expect(entrou).toBe(1)
    // Dirigindo de verdade: W agora move o CARRO.
    const cz0 = api.carPos('z')
    pressKey('w', 'KeyW')
    step(45)
    releaseKey('w', 'KeyW')
    expect(Math.abs(api.carPos('z') - cz0)).toBeGreaterThan(1)
    // E desce (longe de pontos).
    step(2)
    pressKey('e', 'KeyE')
    step(2)
    releaseKey('e', 'KeyE')
    expect(w2.isDriving()).toBe(false)
    expect(saiu).toBe(1)
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

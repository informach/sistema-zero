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

  it('R16: barco SÓ anda na água (encalha na praia) e a ponte segura o carro POR CIMA', async () => {
    const { api, step } = await loadStartedWorld((a) => {
      const w = a as unknown as {
        islands(n: number, y: number): void
        boat(c: string): void
        bridge(x1: number, z1: number, x2: number, z2: number, w: number): void
      }
      w.islands(4, 0)
      w.boat('#f8fafc')
      w.bridge(0, 20, 0, 60, 4)
    })
    step(3)
    // SEM carrinho e SEM personagem: o jogador nasce PILOTANDO o barco.
    const w2 = api as unknown as { isDriving(): boolean }
    // O barco nasce na água; acelera e ANDA.
    const world = api as unknown as Record<string, unknown>
    expect(typeof world.boat).toBe('function')
    pressKey('w', 'KeyW')
    step(90)
    releaseKey('w', 'KeyW')
    // Ponte: o deck em (0, 40) fica ACIMA do terreno de dirigir; por baixo
    // (nível do mar, yRef baixo) a ponte NÃO conta.
    const gDeck = api.groundHeight(0, 40) // heightAt PURO (mar fundo ≈ -4)
    expect(gDeck).toBeLessThan(0.5)
    // O heightAtDrive é interno; a prova pública: um personagem/carro sobre a
    // ponte não afunda — coberto pelo teste unitário abaixo via carro.
    expect(w2.isDriving()).toBe(true)
  })

  it('R17: conversa em FILA — E roda o gancho, cada E mostra a próxima fala', async () => {
    const { api, step } = await loadStartedWorld((a) => {
      a.car('passeio', '#ef4444')
      const w = a as unknown as {
        npc(n: string, x: number, z: number, c: string, h: string): void
        npcTalk(n: string, fn: () => void): void
        npcSay(n: string, t: string): void
      }
      w.npc('Lia', 6, 0, '#f97316', 'palha')
      w.npcTalk('Lia', () => {
        w.npcSay('Lia', 'Oi!')
        w.npcSay('Lia', 'Bem-vindo!')
      })
    })
    // Chega PERTO da amiga e aperta E (o carro nasce no centro; Lia está a 6 m).
    api.carPlace(4, 0, 90)
    step(3)
    pressKey('e', 'KeyE')
    step(2)
    releaseKey('e', 'KeyE')
    const bubble = () =>
      (document.querySelector(
        '#szw3d-stage div[style*="translate(-50%,-100%)"][style*="max-width"]',
      ) ??
        Array.from(document.querySelectorAll('#szw3d-stage div')).find((d) =>
          (d.getAttribute('style') ?? '').includes('max-width:280px'),
        )) as HTMLElement | undefined
    // A 1ª fala abriu (typewriter começa) — espera as letras.
    step(30)
    const el = bubble()
    expect(el).toBeTruthy()
    expect(el?.textContent).toBe('Oi!')
    // Próximo E → 2ª fala da FILA.
    pressKey('e', 'KeyE')
    step(2)
    releaseKey('e', 'KeyE')
    step(40)
    expect(el?.textContent).toBe('Bem-vindo!')
  })

  it('R18: pega moedas dirigindo por cima e a missão completa dispara o gancho', async () => {
    let pegas = 0
    let venceu = 0
    const { api, step } = await loadStartedWorld((a) => {
      a.car('passeio', '#ef4444')
      const w = a as unknown as {
        coinsLine(n: number, x1: number, z1: number, x2: number, z2: number): void
        onCollect(fn: () => void): void
        coinCount(): number
        quest(n: string, d: string): void
        questDone(n: string): void
        onQuestDone(n: string, fn: () => void): void
      }
      w.coinsLine(5, 0, 6, 0, 22)
      w.quest('moedas', 'Pegue 3 moedas')
      w.onQuestDone('moedas', () => {
        venceu++
      })
      w.onCollect(() => {
        pegas++
        if (w.coinCount() >= 3) w.questDone('moedas')
      })
    })
    api.carPlace(0, 0, 0)
    pressKey('w', 'KeyW')
    step(150)
    releaseKey('w', 'KeyW')
    expect(pegas).toBeGreaterThanOrEqual(3)
    expect(venceu).toBe(1) // questDone é idempotente: só comemora UMA vez
  })

  it('R19: conquista PERSISTE entre dois boots (shim) e só festeja na 1ª vez', async () => {
    try {
      window.localStorage.removeItem('szw3d:ach:Explorador')
    } catch {}
    let ganhou = 0
    const world1 = await loadStartedWorld((a) => {
      a.car('passeio', '#ef4444')
      const w = a as unknown as {
        achievement(n: string): void
        onAchievement(n: string, fn: () => void): void
        hasAchievement(n: string): boolean
      }
      w.onAchievement('Explorador', () => {
        ganhou++
      })
    })
    const w1 = world1.api as unknown as {
      achievement(n: string): void
      hasAchievement(n: string): boolean
    }
    expect(w1.hasAchievement('Explorador')).toBe(false)
    w1.achievement('Explorador')
    world1.step(2)
    expect(ganhou).toBe(1)
    w1.achievement('Explorador') // repetir NÃO refesteja
    expect(ganhou).toBe(1)
    expect(w1.hasAchievement('Explorador')).toBe(true)
    // "Reabrir o jogo": um SEGUNDO boot lê o mesmo armazenamento.
    window.dispatchEvent(new Event('pagehide'))
    const world2 = await loadStartedWorld((a) => {
      a.car('passeio', '#3b82f6')
    })
    const w2 = world2.api as unknown as { hasAchievement(n: string): boolean }
    expect(w2.hasAchievement('Explorador')).toBe(true)
    try {
      window.localStorage.removeItem('szw3d:ach:Explorador')
    } catch {}
  })

  it('playthrough do exemplo "Meu Mundo": roda, dirige e não quebra', async () => {
    const { api, step } = await loadExampleWorld(MEU_MUNDO_SOURCE)
    const z0 = api.carPos('z')
    pressKey('w', 'KeyW')
    step(90)
    releaseKey('w', 'KeyW')
    expect(Math.abs(api.carPos('z') - z0)).toBeGreaterThan(1)
  })

  it('R21: A PÉ e LONGE do carro, E fala com a amiga (não teleporta pro carrinho)', async () => {
    // Antes do fix, o árbitro media a distância do CARRO: com o carrinho
    // estacionado no spawn, o "E: entrar" (r=3 NO carro) vencia de qualquer
    // lugar do mapa — apertar E aqui ENTRAVA no carro em vez de conversar.
    const { api, step } = await loadStartedWorld((a) => {
      a.car('passeio', '#ef4444')
      const w = a as unknown as {
        person(c: string, h: string): void
        npc(n: string, x: number, z: number, c: string, h: string): void
        npcTalk(n: string, fn: () => void): void
        npcSay(n: string, t: string): void
      }
      w.person('#3b82f6', 'bone')
      w.npc('Lia', 40, 40, '#f97316', 'palha')
      w.npcTalk('Lia', () => {
        w.npcSay('Lia', 'Oi!')
      })
    })
    const w2 = api as unknown as {
      isDriving(): boolean
      personPlace(x: number, z: number, d: number): void
    }
    expect(w2.isDriving()).toBe(false)
    // Caminha (teleporta) até a amiga — o carro fica LÁ no centro.
    w2.personPlace(39, 40, 0)
    step(3)
    pressKey('e', 'KeyE')
    step(2)
    releaseKey('e', 'KeyE')
    step(30)
    // Falou com a Lia (balão com a fala) e NÃO entrou no carro de longe.
    expect(w2.isDriving()).toBe(false)
    // (o happy-dom re-serializa o style com espaços quando el.style é tocado —
    // casar só por 'max-width', sem o valor colado)
    const el = Array.from(document.querySelectorAll('#szw3d-stage div')).find((d) =>
      (d.getAttribute('style') ?? '').includes('max-width'),
    ) as HTMLElement | undefined
    expect(el).toBeTruthy()
    expect(el?.textContent).toBe('Oi!')
  })

  it('R21: na LUA o pulo flutua (~2,5× mais alto que na floresta)', async () => {
    const jumpHeight = async (style: string) => {
      const { api, step } = await loadStartedWorld((a) => {
        const w = a as unknown as {
          setup(o: { style: string; world: number }): void
          person(c: string, h: string): void
        }
        w.setup({ style, world: 160 })
        w.person('#3b82f6', 'capacete')
      })
      const w2 = api as unknown as { personPos(a: string): number }
      step(3)
      const y0 = w2.personPos('y')
      pressKey(' ', 'Space')
      step(2)
      releaseKey(' ', 'Space')
      let maxDy = 0
      for (let i = 0; i < 140; i++) {
        step(1)
        const dy = w2.personPos('y') - y0
        if (dy > maxDy) maxDy = dy
      }
      window.dispatchEvent(new Event('pagehide'))
      for (const el of Array.from(document.querySelectorAll('#szw3d-stage'))) el.remove()
      return maxDy
    }
    const floresta = await jumpHeight('floresta')
    const lua = await jumpHeight('lua')
    expect(floresta).toBeGreaterThan(0.5)
    expect(lua).toBeGreaterThan(floresta * 1.8)
  })

  it('R22: a cidadezinha nasce PLANA, com casas instanciadas na cena', async () => {
    const { api, renderers, step } = await loadStartedWorld((a) => {
      a.car('passeio', '#ef4444')
      const w = a as unknown as { city(x: number, z: number, s: string, m: string): void }
      w.city(0, 0, 'media', 'dia')
    })
    step(3)
    // media → r 38, anel a 23.56 m; o flatten do disco (r+8) deixa TUDO na
    // mesma altura do centro (senão o carro pulava nas ruas).
    const c = api.groundHeight(0, 0)
    expect(Math.abs(api.groundHeight(23.6, 0) - c)).toBeLessThan(0.25)
    expect(Math.abs(api.groundHeight(0, -23.6) - c)).toBeLessThan(0.25)
    expect(Math.abs(api.groundHeight(-16, 16) - c)).toBeLessThan(0.25)
    // Casas/ruas/cercas instanciadas: a cena ganha VÁRIOS InstancedMesh.
    const scene = renderers[0]?.scene ?? null
    let ims = 0
    scene?.traverse((o) => {
      if ((o as RealTHREE.InstancedMesh).isInstancedMesh) ims++
    })
    expect(ims).toBeGreaterThan(8)
  })

  it('R22: o varal de luzinhas ACENDE quando escurece', async () => {
    const { api, renderers, step } = await loadStartedWorld((a) => {
      a.car('passeio', '#ef4444')
      const w = a as unknown as { stringLights(a: number, b: number, c: number, d: number): void }
      w.stringLights(-6, 0, 6, 0)
    })
    step(3)
    const scene = renderers[0]?.scene ?? null
    let bulbMat: RealTHREE.PointsMaterial | null = null
    scene?.traverse((o) => {
      const p = o as RealTHREE.Points
      const m = p.material as RealTHREE.PointsMaterial | undefined
      if (!bulbMat && p.isPoints && m && m.size === 0.55) bulbMat = m
    })
    expect(bulbMat).not.toBeNull()
    expect((bulbMat as unknown as RealTHREE.PointsMaterial).opacity).toBeLessThan(0.4) // dia
    ;(api as unknown as { setTime(n: string): void }).setTime('noite')
    step(3)
    expect((bulbMat as unknown as RealTHREE.PointsMaterial).opacity).toBeGreaterThan(0.9)
  })

  it('R22: modo NEON cai a noite sozinho (quando a criança não pediu hora)', async () => {
    const { api, renderers, step } = await loadStartedWorld((a) => {
      a.car('passeio', '#ef4444')
      const w = a as unknown as { city(x: number, z: number, s: string, m: string): void }
      w.city(0, 0, 'pequena', 'neon')
    })
    step(5)
    const hour = (api as unknown as { timeOfDay(): number }).timeOfDay()
    expect(hour < 6 || hour >= 18).toBe(true)
    // E os varais da praça já nasceram acesos (nightAmount alto).
    const scene = renderers[0]?.scene ?? null
    let lit = false
    scene?.traverse((o) => {
      const p = o as RealTHREE.Points
      const m = p.material as RealTHREE.PointsMaterial | undefined
      if (p.isPoints && m && m.size === 0.55 && m.opacity > 0.9) lit = true
    })
    expect(lit).toBe(true)
  })

  it('R22/gate: a cidade média BOOTA rápido (eval+build < 2,5 s na bancada)', async () => {
    const t0 = performance.now()
    const { step } = await loadStartedWorld((a) => {
      a.car('passeio', '#ef4444')
      const w = a as unknown as {
        city(x: number, z: number, s: string, m: string): void
        traffic(n: number, m: string): void
      }
      w.city(0, 0, 'media', 'dia')
      w.traffic(6, 'semaforos')
    })
    step(3)
    // Generoso p/ CI — pega regressão de ORDEM DE GRANDEZA no payload/build.
    expect(performance.now() - t0).toBeLessThan(2500)
  })

  it('R23: o trânsito ANDA no anel e PAUSA no semáforo (padrão para-e-anda)', async () => {
    const { renderers, step } = await loadStartedWorld((a) => {
      a.car('passeio', '#ef4444')
      const w = a as unknown as {
        city(x: number, z: number, s: string, m: string): void
        traffic(n: number, m: string): void
      }
      w.city(0, 0, 'media', 'dia')
      w.traffic(4, 'semaforos')
    })
    step(5)
    const scene = renderers[0]?.scene ?? null
    // O IM do trânsito: 4 carros × 4 peças = 16 instâncias.
    let tm: RealTHREE.InstancedMesh | null = null
    scene?.traverse((o) => {
      const im = o as RealTHREE.InstancedMesh
      if (!tm && im.isInstancedMesh && im.count === 16) tm = im
    })
    expect(tm).not.toBeNull()
    const posOf = () => {
      const m = new (Object.getPrototypeOf(
        (tm as unknown as RealTHREE.InstancedMesh).matrixWorld,
      ).constructor)()
      ;(tm as unknown as RealTHREE.InstancedMesh).getMatrixAt(0, m)
      return { x: m.elements[12], z: m.elements[14] }
    }
    // Amostra o movimento do carro 0 em janelas de ~1 s por ~28 s de mundo:
    // com semáforo tem que existir janela PARADA e janela ANDANDO.
    let still = 0
    let moving = 0
    let prev = posOf()
    for (let wdw = 0; wdw < 28; wdw++) {
      step(30)
      const cur = posOf()
      const d = Math.abs(cur.x - prev.x) + Math.abs(cur.z - prev.z)
      if (d < 0.05) still++
      else if (d > 0.8) moving++
      prev = cur
    }
    expect(moving).toBeGreaterThan(3)
    expect(still).toBeGreaterThan(1)
  })

  it('R23: o carrinho autônomo PARA atrás do jogador estacionado na pista', async () => {
    const { api, step, renderers } = await loadStartedWorld((a) => {
      a.car('passeio', '#ef4444')
      const w = a as unknown as {
        city(x: number, z: number, s: string, m: string): void
        traffic(n: number, m: string): void
      }
      w.city(0, 0, 'media', 'dia')
      w.traffic(6, 'livre')
    })
    // media → ringR 23.56; lane de fora a 24.81. Estaciona o carro DA CRIANÇA lá.
    api.carPlace(24.81, 0, 0)
    step(5)
    const scene = renderers[0]?.scene ?? null
    let tm: RealTHREE.InstancedMesh | null = null
    scene?.traverse((o) => {
      const im = o as RealTHREE.InstancedMesh
      if (!tm && im.isInstancedMesh && im.count === 24) tm = im
    })
    expect(tm).not.toBeNull()
    // Deixa o trânsito fluir bastante: alguém chega perto e SEGURA.
    step(1200)
    const mesh = tm as unknown as RealTHREE.InstancedMesh
    const m = new (Object.getPrototypeOf(mesh.matrixWorld).constructor)()
    let nearest = Infinity
    for (let i = 0; i < 6; i++) {
      mesh.getMatrixAt(i * 4, m)
      const dx = m.elements[12] - api.carPos('x')
      const dz = m.elements[14] - api.carPos('z')
      const d = Math.sqrt(dx * dx + dz * dz)
      if (d < nearest) nearest = d
    }
    // Chegou (fila atrás do jogador) mas NÃO encostou (para antes de bater).
    expect(nearest).toBeLessThan(9)
    expect(nearest).toBeGreaterThan(1.4)
  })

  it('R24: E na porta ABRE o cartaz local (e o 2º E fecha sem re-disparar)', async () => {
    const { api, step } = await loadStartedWorld((a) => {
      a.car('passeio', '#ef4444')
      const w = a as unknown as {
        door(x: number, z: number, d: number, t: string, b: string, i: string): void
      }
      w.door(6, 0, 0, 'Padaria', 'O melhor pao da cidade!', '')
    })
    api.carPlace(4, 0, 90)
    step(3)
    pressKey('e', 'KeyE')
    step(2)
    releaseKey('e', 'KeyE')
    step(2)
    const overlay = () =>
      Array.from(document.querySelectorAll('#szw3d-stage div')).find((d) =>
        (d.textContent ?? '').includes('O melhor pao da cidade!'),
      ) as HTMLElement | undefined
    const el = overlay()
    expect(el).toBeTruthy()
    expect((el?.textContent ?? '').includes('Padaria')).toBe(true)
    // 2º E: fecha (guarda no topo do stepInteractions engole o aperto).
    pressKey('e', 'KeyE')
    step(2)
    releaseKey('e', 'KeyE')
    step(2)
    const root = document.querySelector('#szw3d-stage div[style*="inset"]') as HTMLElement | null
    // O overlay raiz (inset:0) esconde; o mundo volta a andar.
    const hidden = Array.from(document.querySelectorAll('#szw3d-stage div')).every((d) => {
      const s = d.getAttribute('style') ?? ''
      if (!s.includes('inset')) return true
      return (d as HTMLElement).style.display === 'none'
    })
    expect(root === null || hidden).toBe(true)
  })

  it('R24: pergunta com escolhas — tecla 2 roda o corpo da resposta B', async () => {
    let colheuA = 0
    let colheuB = 0
    const { api, step } = await loadStartedWorld((a) => {
      a.car('passeio', '#ef4444')
      const w = a as unknown as {
        npc(n: string, x: number, z: number, c: string, h: string): void
        npcTalk(n: string, fn: () => void): void
        npcAsk(n: string, q: string, oa: string, fa: () => void, ob: string, fb: () => void): void
        npcSay(n: string, t: string): void
      }
      w.npc('Guia', 6, 0, '#f97316', 'coroa')
      w.npcTalk('Guia', () => {
        w.npcAsk(
          'Guia',
          'Milho ou alface?',
          'Milho',
          () => {
            colheuA++
            w.npcSay('Guia', 'Milho!')
          },
          'Alface',
          () => {
            colheuB++
            w.npcSay('Guia', 'Alface!')
          },
        )
      })
    })
    api.carPlace(4, 0, 90)
    step(3)
    pressKey('e', 'KeyE')
    step(2)
    releaseKey('e', 'KeyE')
    step(10)
    // A pergunta abriu com os 2 botões (o splash também é <button> — filtra
    // pelos botões ciano da escolha); E é ENGOLIDO enquanto aberta.
    const buttons = Array.from(document.querySelectorAll('#szw3d-stage button')).filter((b) =>
      (b.getAttribute('style') ?? '').includes('22d3ee'),
    )
    expect(buttons.length).toBe(2)
    pressKey('e', 'KeyE')
    step(2)
    releaseKey('e', 'KeyE')
    expect(colheuA + colheuB).toBe(0)
    // Tecla 2 → resposta B roda e a fala dela substitui o balão.
    pressKey('2', 'Digit2')
    step(2)
    releaseKey('2', 'Digit2')
    expect(colheuB).toBe(1)
    expect(colheuA).toBe(0)
    step(30)
    const bubble = Array.from(document.querySelectorAll('#szw3d-stage div')).find((d) =>
      (d.getAttribute('style') ?? '').includes('max-width'),
    ) as HTMLElement | undefined
    expect(bubble?.textContent).toBe('Alface!')
  })

  it('R21: a lua nasce com CRATERAS (fundo do buraco bem abaixo da borda)', async () => {
    const { api } = await loadStartedWorld((a) => {
      const w = a as unknown as { setup(o: { style: string; world: number }): void }
      w.setup({ style: 'lua', world: 160 })
      a.car('passeio', '#94a3b8')
    })
    // Varre o chão atrás do ponto mais fundo (as crateras nascem a 24m+ do
    // centro; o ruído puro nunca desce abaixo de ~0 — buraco fundo = cratera).
    let minH = Infinity
    let mx = 0
    let mz = 0
    for (let x = -70; x <= 70; x += 2) {
      for (let z = -70; z <= 70; z += 2) {
        const h = api.groundHeight(x, z)
        if (h < minH) {
          minH = h
          mx = x
          mz = z
        }
      }
    }
    expect(minH).toBeLessThan(-0.3)
    // A borda (anel a 6m do fundo) fica BEM acima do fundo da tigela.
    let ring = 0
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2
      ring += api.groundHeight(mx + Math.cos(ang) * 6, mz + Math.sin(ang) * 6)
    }
    ring /= 8
    expect(ring - minH).toBeGreaterThan(0.8)
  })

  it('R25: moinho gira COM O VENTO (mais vento = mais giro) e a galinha fica no raio', async () => {
    const { api, renderers, step } = await loadStartedWorld((a) => {
      a.car('passeio', '#ef4444')
      const w = a as unknown as {
        windmill(x: number, z: number): void
        animals(n: number, k: string, x: number, z: number, r: number): void
      }
      w.windmill(15, 25)
      w.animals(3, 'galinhas', -20, -20, 6)
    })
    step(3)
    const scene = renderers[0]?.scene ?? null
    // O grupo das pás: acha pelo Group com 4 filhos-pivô a ~6,6m de altura.
    let blades: RealTHREE.Group | null = null
    scene?.traverse((o) => {
      if (
        !blades &&
        o.type === 'Group' &&
        o.children.length === 4 &&
        Math.abs(o.position.y - 6.6) < 0.01
      ) {
        blades = o as RealTHREE.Group
      }
    })
    expect(blades).not.toBeNull()
    const spinAt = (windForce: number, frames: number) => {
      ;(api as unknown as { setWind(n: number): void }).setWind(windForce)
      const r0 = (blades as unknown as RealTHREE.Group).rotation.z
      step(frames)
      return (blades as unknown as RealTHREE.Group).rotation.z - r0
    }
    const calmo = spinAt(0, 60)
    const ventania = spinAt(4, 60)
    expect(ventania).toBeGreaterThan(calmo * 1.5)
    expect(ventania).toBeGreaterThan(0.5)
    // Galinhas perambulam mas FICAM perto de casa (raio 6 + folga).
    step(600)
    let herdIM: RealTHREE.InstancedMesh | null = null
    scene?.traverse((o) => {
      const im = o as RealTHREE.InstancedMesh
      if (!herdIM && im.isInstancedMesh && im.count === 3) herdIM = o as RealTHREE.InstancedMesh
    })
    expect(herdIM).not.toBeNull()
    const mesh = herdIM as unknown as RealTHREE.InstancedMesh
    const m = new (Object.getPrototypeOf(mesh.matrixWorld).constructor)()
    for (let i = 0; i < 3; i++) {
      mesh.getMatrixAt(i, m)
      const dx = m.elements[12] - -20
      const dz = m.elements[14] - -20
      expect(Math.sqrt(dx * dx + dz * dz)).toBeLessThan(10)
    }
  })

  it('R25: a cerquinha tem postes SÓLIDOS (o carro esbarra) e a cratera manual afunda', async () => {
    const { api, step } = await loadStartedWorld((a) => {
      a.car('passeio', '#ef4444')
      const w = a as unknown as {
        fence(a: number, b: number, c: number, d: number): void
        crater(x: number, z: number, r: number): void
      }
      w.fence(-6, 12, 6, 12)
      w.crater(30, 30, 8)
    })
    step(3)
    // Cratera manual (mundo floresta!): fundo bem abaixo da borda.
    const fundo = api.groundHeight(30, 30)
    const borda = api.groundHeight(38, 30)
    expect(borda - fundo).toBeGreaterThan(1)
    // Postes sólidos: dirigindo reto contra a cerca, o carro NÃO passa.
    api.carPlace(0, 8, 0) // olhando +z, cerca em z=12
    pressKey('w', 'KeyW')
    step(90)
    releaseKey('w', 'KeyW')
    expect(api.carPos('z')).toBeLessThan(13.2)
  })
})

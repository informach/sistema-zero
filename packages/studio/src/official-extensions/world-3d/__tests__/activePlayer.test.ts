import { afterEach, describe, expect, it, spyOn } from 'bun:test'
import * as RealTHREE from 'three'
import { loadStartedWorld, pressKey, releaseKey, type WorldApi } from './kitHarness'

/**
 * Lote 9 do review 3D (10/2026): os consertos funcionais do Mundo 3D, cada um travado aqui.
 *
 * - O JOGADOR ATIVO (a pé também) empurra, derruba pinos, explode caixas e corre: antes
 *   `stepPushables`/`stepKnockables`/`stepExplosives`/`stepRace` mediam só o `carState`.
 * - Os painéis automáticos (moedas, missão, conquista, corrida, minimapa) e o texto da criança
 *   moram no gerenciador de CANTOS do fragmento de regras de jogo: mesma pilha, texto primeiro.
 * - Moedas, ícones, missões etc. podem nascer DURANTE o jogo e funcionam na hora.
 * - Todo listener do mundo sai no `disposeAll`.
 * - O chão mexido durante o jogo é refeito UMA vez por quadro, com teto de pedidos.
 * - O clima recicla as partículas com o sorteio SEMEADO do build (determinístico).
 *
 * O happy-dom não mede layout: a prova dos cantos é a ESTRUTURA (mesmo contêiner, ordem dos
 * filhos, z-index da camada), não pixels.
 */

interface Extra {
  person(color: string, hat: string): void
  personPlace(x: number, z: number, deg: number): void
  playerPos(axis: string): number
  pushPlace(thing: string, x: number, z: number): void
  bowlingCreate(x: number, z: number, deg?: number): void
  explosive(x: number, z: number): void
  onExplosion(fn: () => void): void
  raceOnCheckpoint(fn: () => void): void
  coinsLine(n: number, x1: number, z1: number, x2: number, z2: number): void
  coinCount(): number
  onCollect(fn: () => void): void
  quest(name: string, desc: string): void
  marker(icon: string, x: number, z: number): void
  minimap(mode: string): void
  achievement(name: string): void
  crater(x: number, z: number, r: number): void
}

type Api = WorldApi & Extra

afterEach(() => {
  window.dispatchEvent(new Event('pagehide'))
  for (const el of Array.from(document.querySelectorAll('#szw3d-stage'))) el.remove()
  releaseKey('w', 'KeyW')
  releaseKey('e', 'KeyE')
})

/** Mundo a pé (sem carrinho): o personagem nasce em (2, 2) olhando +z. */
async function onFoot(setup?: (api: Api) => void, three: Record<string, unknown> = {}) {
  const loaded = await loadStartedWorld((a) => {
    const api = a as Api
    api.person('#3b82f6', 'nenhum')
    setup?.(api)
  }, three)
  return { ...loaded, api: loaded.api as Api }
}

function walk(step: (frames: number) => void, frames: number) {
  pressKey('w', 'KeyW')
  step(frames)
  releaseKey('w', 'KeyW')
}

function pushIMs(scene: RealTHREE.Scene | null): RealTHREE.InstancedMesh[] {
  const out: RealTHREE.InstancedMesh[] = []
  scene?.traverse((o) => {
    const im = o as RealTHREE.InstancedMesh
    // O balde de cada empurrável tem 80 vagas (teto por tipo).
    if (im.isInstancedMesh && im.instanceMatrix.count === 80 && im.count > 0) out.push(im)
  })
  return out
}

describe('Mundo 3D — o JOGADOR ATIVO a pé (lote 9)', () => {
  it('a pé, o personagem EMPURRA um tijolo para fora do lugar', async () => {
    const { api, step, renderers } = await onFoot((a) => a.pushPlace('tijolo', 2, 5))
    const [im] = pushIMs(renderers[0]?.scene ?? null)
    if (!im) throw new Error('o tijolo não entrou na cena')
    const before = new RealTHREE.Matrix4()
    im.getMatrixAt(0, before)
    const z0 = before.elements[14] ?? 0
    expect(api.playerPos('z')).toBeLessThan(z0)
    walk(step, 45)
    step(20)
    const after = new RealTHREE.Matrix4()
    im.getMatrixAt(0, after)
    const moved = Math.hypot(
      (after.elements[12] ?? 0) - (before.elements[12] ?? 0),
      (after.elements[14] ?? 0) - z0,
    )
    expect(moved).toBeGreaterThan(0.3)
  })

  it('a pé, correr contra a pista de boliche derruba pinos', async () => {
    const { api, step } = await onFoot((a) => a.bowlingCreate(0, 11, 0))
    api.personPlace(0, 5, 0)
    step(2)
    walk(step, 90)
    step(30)
    expect(api.pinsDown()).toBeGreaterThan(0)
  })

  it('a pé, encostar andando na caixa explosiva faz BUM (e te joga pro alto)', async () => {
    let booms = 0
    const { api, step } = await onFoot((a) => {
      a.explosive(0, 8)
      a.onExplosion(() => {
        booms++
      })
    })
    api.personPlace(0, 4, 0)
    step(2)
    const y0 = api.playerPos('y')
    walk(step, 40)
    expect(booms).toBe(1)
    // A explosão pega quem está perto: o personagem sobe.
    let peak = y0
    for (let i = 0; i < 10; i++) {
      step(1)
      peak = Math.max(peak, api.playerPos('y'))
    }
    expect(peak).toBeGreaterThan(y0 + 0.3)
  })

  it('a pé, parado do lado da caixa explosiva, nada explode (só o encostão)', async () => {
    let booms = 0
    const { api, step } = await onFoot((a) => {
      a.explosive(0, 3)
      a.onExplosion(() => {
        booms++
      })
    })
    api.personPlace(0, 2.2, 0)
    step(30)
    expect(booms).toBe(0)
  })

  it('a pé, a corrida larga, conta o checkpoint e termina', async () => {
    let checkpoints = 0
    let finished = 0
    const { api, step } = await onFoot()
    api.raceCreate(0, 0, 0, 1)
    api.raceCheckpoint(0, 15)
    api.raceOnCheckpoint(() => {
      checkpoints++
    })
    api.raceOnFinish(() => {
      finished++
    })
    // Arma (afasta), volta à largada (começa) e cruza o checkpoint A PÉ.
    api.personPlace(0, 30, 0)
    step(2)
    api.personPlace(0, 0, 0)
    step(2)
    api.personPlace(0, 15, 0)
    step(3)
    expect(checkpoints).toBe(1)
    expect(finished).toBe(1)
    expect(api.raceTime()).toBeGreaterThan(0)
  })

  it('dirigindo, o carrinho continua empurrando e derrubando como antes', async () => {
    const { api, step } = await loadStartedWorld((a) => a.car('passeio', '#ef4444'))
    ;(api as Api).bowlingCreate(0, 11, 0)
    step(2)
    api.carPlace(0, 5, 0)
    walk(step, 90)
    expect(api.pinsDown()).toBeGreaterThan(0)
  })
})

describe('Mundo 3D — teclas do dropdown comum (lote 8)', () => {
  it('o runtime entende os códigos do dropdown (KeyE, Space, ShiftLeft, ArrowUp)', async () => {
    const seen: Record<string, boolean[]> = {}
    const { step } = await onFoot((a) => {
      a.onUpdate(() => {
        for (const code of ['KeyE', 'Space', 'ShiftLeft', 'ArrowUp']) {
          seen[code] = [...(seen[code] ?? []), a.keyDown(code)]
        }
      })
    })
    const press = (key: string, code: string) => {
      pressKey(key, code)
      step(1)
      releaseKey(key, code)
      step(1)
    }
    press('e', 'KeyE')
    press(' ', 'Space')
    press('Shift', 'ShiftLeft')
    press('ArrowUp', 'ArrowUp')
    for (const code of ['KeyE', 'Space', 'ShiftLeft', 'ArrowUp']) {
      expect(seen[code]?.some(Boolean)).toBe(true)
      expect(seen[code]?.at(-1)).toBe(false)
    }
  })
})

describe('Mundo 3D — cantos da tela no gerenciador das regras de jogo (lote 9)', () => {
  it('o texto da criança e os painéis automáticos dividem o MESMO canto, texto primeiro', async () => {
    const { api, step } = await onFoot((a) => {
      a.coinsLine(3, 2, 4, 2, 6)
      a.quest('moedas', 'Pegue 3 moedas')
      a.minimap('ver')
    })
    api.hudText('top-right', 'Meu placar')
    api.hudText('top-left', 'Minha dica')
    api.hudText('bottom-right', 'Embaixo')
    walk(step, 40)
    expect(api.coinCount()).toBe(3)
    api.achievement(`Teste ${Math.random()}`)
    step(2)

    const frame = document.querySelector('#szw3d-frame')
    const layers = Array.from(frame?.querySelectorAll('.szr-layer') ?? [])
    expect(layers.length).toBe(1)
    const layer = layers[0] as HTMLElement
    // Acima do jogo, abaixo dos cartazes/mapa grande do mundo (8 a 11).
    expect(layer.style.zIndex).toBe('7')

    const panels = (corner: string) =>
      Array.from(layer.querySelectorAll(`.szr-${corner} > [data-szr-panel]`)).map((el) =>
        el.getAttribute('data-szr-panel'),
      )
    expect(panels('top-right')).toEqual(['texto', 'moedas', 'conquista'])
    expect(panels('top-left')).toEqual(['texto', 'missao'])
    expect(panels('bottom-right')).toEqual(['texto', 'minimapa'])

    const text = (corner: string, key: string) =>
      layer.querySelector(`.szr-${corner} > [data-szr-panel="${key}"]`) as HTMLElement | null
    expect(text('top-right', 'texto')?.textContent).toBe('Meu placar')
    expect(text('top-right', 'moedas')?.textContent).toBe('🪙 3')
    expect(text('top-left', 'missao')?.textContent).toContain('Pegue 3 moedas')
    expect(text('bottom-right', 'minimapa')?.querySelector('canvas')).toBeTruthy()
    // Nada de painel absoluto solto no palco cobrindo o texto.
    expect(frame?.querySelectorAll(':scope > .szw3d-hud').length).toBe(0)
  })

  it('aceita os nomes antigos dos cantos e o texto vazio apaga só o texto', async () => {
    const { api, step } = await onFoot((a) => a.quest('q', 'Missão'))
    api.hudText('topo-esquerda', 'Oi')
    step(2)
    const corner = () =>
      Array.from(document.querySelectorAll('.szr-top-left > [data-szr-panel]')).map((el) =>
        el.getAttribute('data-szr-panel'),
      )
    expect(corner()).toEqual(['texto', 'missao'])
    api.hudText('top-left', '')
    expect(corner()).toEqual(['missao'])
  })

  it('o cronômetro da corrida ganha painel próprio e não apaga o texto da criança', async () => {
    const { api, step } = await onFoot()
    api.hudText('top-left', 'Meu texto')
    api.raceCreate(0, 0, 0, 2)
    api.raceCheckpoint(0, 15)
    api.personPlace(0, 30, 0)
    step(2)
    api.personPlace(0, 0, 0)
    step(3)
    const keys = Array.from(document.querySelectorAll('.szr-top-left > [data-szr-panel]')).map(
      (el) => el.getAttribute('data-szr-panel'),
    )
    expect(keys).toEqual(['texto', 'corrida'])
    expect(document.querySelector('.szr-top-left > [data-szr-panel="texto"]')?.textContent).toBe(
      'Meu texto',
    )
  })
})

describe('Mundo 3D — coisas que nascem DURANTE o jogo (lote 9)', () => {
  it('moedas criadas num "Quando entrar na área" aparecem e contam', async () => {
    let collected = 0
    const { api, step } = await onFoot((a) => {
      a.zone('portal', 2, 5, 1.5)
      a.onZone('portal', () => {
        a.coinsLine(3, 2, 9, 2, 11)
      })
      a.onCollect(() => {
        collected++
      })
    })
    expect(api.coinCount()).toBe(0)
    walk(step, 90)
    expect(api.coinCount()).toBe(3)
    expect(collected).toBe(3)
  })

  it('caixa explosiva e missão podem nascer no meio do jogo (com teto)', async () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      let booms = 0
      const { api, step, renderers } = await onFoot((a) =>
        a.onExplosion(() => {
          booms++
        }),
      )
      const boxes = () => {
        let n = 0
        renderers[0]?.scene?.traverse((o) => {
          const geo = (o as RealTHREE.Mesh).geometry as RealTHREE.BoxGeometry | undefined
          if (geo?.type === 'BoxGeometry' && geo.parameters.width === 0.9) n++
        })
        return n
      }
      expect(boxes()).toBe(0)
      // Uma caixa nasce na frente do personagem no meio do passeio e explode no encostão.
      api.explosive(2, 6)
      step(1)
      expect(boxes()).toBe(1)
      walk(step, 40)
      expect(booms).toBe(1)
      // Teto: um evento repetido não afoga a cena.
      for (let i = 0; i < 80; i++) api.explosive(-40 + i, -40)
      expect(boxes()).toBe(64)
      expect(warn.mock.calls.some((call) => String(call[0]).includes('teto 64'))).toBe(true)

      api.quest('nova', 'Missão que nasceu agora')
      step(1)
      expect(document.querySelector('[data-szr-panel="missao"]')?.textContent).toContain(
        'Missão que nasceu agora',
      )
    } finally {
      warn.mockRestore()
    }
  })
})

describe('Mundo 3D — limpeza, chão e clima (lote 9)', () => {
  it('disposeAll solta TODO listener que o mundo registrou', async () => {
    const added: { target: EventTarget; type: string; fn: unknown }[] = []
    const removed: { target: EventTarget; type: string; fn: unknown }[] = []
    // Os donos do método no happy-dom: a janela e os elementos têm cadeias diferentes.
    const owners = new Set<Record<string, unknown>>()
    for (const start of [window, document, document.createElement('div')] as object[]) {
      let proto: object | null = start
      while (proto && !Object.hasOwn(proto, 'addEventListener'))
        proto = Object.getPrototypeOf(proto)
      if (proto) owners.add(proto as Record<string, unknown>)
    }
    type Listener = (this: EventTarget, type: string, fn: unknown, opts?: unknown) => void
    const originals = [...owners].map((owner) => ({
      owner,
      add: owner.addEventListener as Listener,
      remove: owner.removeEventListener as Listener,
    }))
    for (const { owner, add, remove } of originals) {
      owner.addEventListener = function (
        this: EventTarget,
        type: string,
        fn: unknown,
        opts?: unknown,
      ) {
        added.push({ target: this, type, fn })
        return add.call(this, type, fn, opts)
      }
      owner.removeEventListener = function (
        this: EventTarget,
        type: string,
        fn: unknown,
        opts?: unknown,
      ) {
        removed.push({ target: this, type, fn })
        return remove.call(this, type, fn, opts)
      }
    }
    try {
      const { api } = await onFoot()
      // Teclado, ponteiro, foco, resize, pagehide… (o número exato muda com o toque).
      expect(added.length).toBeGreaterThan(5)
      ;(api as unknown as { disposeAll(): void }).disposeAll()
      const missing = added.filter(
        (a) => !removed.some((r) => r.target === a.target && r.type === a.type && r.fn === a.fn),
      )
      expect(missing.map((m) => m.type)).toEqual([])
    } finally {
      for (const { owner, add, remove } of originals) {
        owner.addEventListener = add
        owner.removeEventListener = remove
      }
    }
  })

  it('chão mexido no laço: UMA reconstrução por quadro e teto de 64 pedidos', async () => {
    let terrainBuilds = 0
    class CountingPlane extends RealTHREE.PlaneGeometry {
      constructor(w?: number, h?: number, ws?: number, hs?: number) {
        super(w, h, ws, hs)
        if ((ws ?? 1) >= 64) terrainBuilds++
      }
    }
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { step } = await onFoot(
        (a) => {
          let i = 0
          a.onUpdate(() => {
            // Três pedidos por quadro: o chão só é refeito uma vez.
            for (let k = 0; k < 3; k++) {
              i++
              a.flatten(30 + (i % 7), 30, 4)
            }
          })
        },
        { PlaneGeometry: CountingPlane },
      )
      const perFrame: number[] = []
      for (let f = 0; f < 30; f++) {
        const n = terrainBuilds
        step(1)
        perFrame.push(terrainBuilds - n)
      }
      expect(Math.max(...perFrame)).toBe(1)
      // 64 pedidos aceitos = 22 quadros com reconstrução (3 por quadro); depois, nenhuma.
      expect(perFrame.slice(-5)).toEqual([0, 0, 0, 0, 0])
      expect(warn.mock.calls.some((call) => String(call[0]).includes('64'))).toBe(true)
    } finally {
      warn.mockRestore()
    }
  })

  it('o clima é determinístico: dois passeios iguais chovem igual', async () => {
    const snapshot = async () => {
      const { api, step, renderers } = await onFoot()
      api.weather('chuva')
      step(150)
      let out: number[] = []
      renderers[0]?.scene?.traverse((o) => {
        const pts = o as RealTHREE.Points
        if (pts.isPoints && (pts.geometry.attributes.position?.count ?? 0) > 100) {
          out = Array.from(pts.geometry.attributes.position?.array ?? []).map((v) =>
            Math.round(v * 1000),
          )
        }
      })
      ;(api as unknown as { disposeAll(): void }).disposeAll()
      return out
    }
    const a = await snapshot()
    const b = await snapshot()
    expect(a.length).toBeGreaterThan(100)
    expect(b).toEqual(a)
  })
})

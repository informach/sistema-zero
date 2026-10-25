import { afterEach, describe, expect, it, spyOn } from 'bun:test'
import * as RealTHREE from 'three'
import { loadStartedWorld, pressKey, releaseKey, type WorldApi } from './kitHarness'

/**
 * Achados do revisor depois do review 3D (24/10/2026), cada um travado aqui com a reprodução
 * dele (as sondas viraram testes):
 *
 * - "Quando derrubar todos os pinos" do Ao iniciar disparava nunca (a pista nova esquecia o gancho).
 * - Não dava para sair do barco: o mesmo E que descia religava o "E: barco" no mesmo quadro.
 * - Machucado no veículo e descer durante o piscar deixava o veículo invisível para sempre.
 * - O recomeçar leve: coletável tirado não voltava, moedas nascidas no jogo acumulavam, corrida,
 *   missões, pinos e caixas explosivas não voltavam, e o "Pôr" no meio do jogo deixava colisor
 *   (parede invisível) ou ficava no mundo.
 * - Amigo nascido no jogo não passeava; tirar o amigo deixava a pergunta dele aberta.
 * - Teleporte do mapa a bordo do barco movia o carro; lua e nuvens seguiam o carro.
 * - O teto de 64 do chão contava o Ao iniciar; listeners cresciam dentro da partida.
 */

type Call = (...args: unknown[]) => unknown
/** Só os métodos que este arquivo chama (o inventário completo é auditado no blockAudit). */
interface Any {
  boat: Call
  bowlingCreate: Call
  bowlingOnStrike: Call
  car: Call
  carPlace: Call
  clouds: Call
  coinsLine: Call
  collectible: Call
  endGame: Call
  explosive: Call
  flatten: Call
  groundHeight: Call
  hurt: Call
  isDriving: Call
  minimap: Call
  npc: Call
  point: Call
  zone: Call
  marker: Call
  pushPlace: Call
  onUpdate: Call
  onZone: Call
  npcAsk: Call
  npcWander: Call
  onExplosion: Call
  onQuestDone: Call
  person: Call
  personPlace: Call
  pinsDown: Call
  placeThing: Call
  playerPos: Call
  quest: Call
  questDone: Call
  raceCheckpoint: Call
  raceCreate: Call
  raceOnFinish: Call
  removeNamed: Call
  restart: Call
  setLife: Call
  setTime: Call
  terrain: Call
  water: Call
}

afterEach(() => {
  window.dispatchEvent(new Event('pagehide'))
  for (const el of Array.from(document.querySelectorAll('#szw3d-stage, .szr-layer'))) el.remove()
  for (const [key, code] of [
    ['e', 'KeyE'],
    ['w', 'KeyW'],
    ['m', 'KeyM'],
    ['1', 'Digit1'],
  ] as const)
    releaseKey(key, code)
})

async function world(setup?: (w: Any) => void) {
  const loaded = await loadStartedWorld((a) => setup?.(a as unknown as Any))
  return { ...loaded, w: loaded.api as unknown as Any }
}

function tap(step: (n: number) => void, key: string, code: string) {
  pressKey(key, code)
  step(1)
  releaseKey(key, code)
  step(2)
}

function drive(step: (n: number) => void, frames: number) {
  pressKey('w', 'KeyW')
  step(frames)
  releaseKey('w', 'KeyW')
}

/** O recomeçar é ADIADO para fora do quadro (regras de jogo). */
async function settle() {
  for (let i = 0; i < 4; i++) await new Promise((resolve) => setTimeout(resolve, 5))
}

/** "Jogar de novo": o botão da tela de fim, como a criança aperta. */
async function playAgain(w: Any, step: (n: number) => void) {
  w.endGame('perdeu')
  step(1)
  const button = Array.from(document.querySelectorAll('.szr-screen button')).find(
    (b) => b.textContent === 'Jogar de novo',
  ) as HTMLButtonElement | undefined
  if (!button) throw new Error('a tela de fim não mostrou "Jogar de novo"')
  button.click()
  await settle()
  step(2)
}

/** Empurra o carrinho contra os pinos até derrubar os dez (a sonda do revisor). */
function knockAllPins(w: Any, step: (n: number) => void) {
  for (let tries = 0; tries < 12 && (w.pinsDown() as number) < 10; tries++) {
    for (const x of [0, -1.2, 1.2]) {
      w.carPlace(x, 0, 0)
      step(2)
      drive(step, 120)
      step(30)
    }
  }
}

/** Onde estão as caixas explosivas da cena ("x,z"). */
function explosiveSpots(scene: RealTHREE.Scene | null): string[] {
  const out: string[] = []
  scene?.traverse((o) => {
    const geo = (o as RealTHREE.Mesh).geometry as RealTHREE.BoxGeometry | undefined
    if (o.parent === scene && geo?.type === 'BoxGeometry' && geo.parameters.width === 0.9)
      out.push(`${Math.round(o.position.x)},${Math.round(o.position.z)}`)
  })
  return out.sort()
}

describe('Mundo 3D — boliche e veículos', () => {
  it('"Quando derrubar todos os pinos" do Ao iniciar dispara (e de novo depois do recomeçar)', async () => {
    let strikes = 0
    const { w, step } = await world((a) => {
      a.car({ style: 'passeio', color: '#ff0000' })
      a.bowlingCreate(0, 14, 0)
      a.bowlingOnStrike(() => {
        strikes++
      })
    })
    step(2)
    knockAllPins(w, step)
    expect(w.pinsDown()).toBe(10)
    expect(strikes).toBe(1)
    // Os pinos voltam em pé no "Jogar de novo" e o gancho continua valendo.
    await playAgain(w, step)
    expect(w.pinsDown()).toBe(0)
    knockAllPins(w, step)
    expect(strikes).toBe(2)
  })

  it('sobe no barco, desce e continua a pé', async () => {
    const { w, step } = await world((a) => {
      a.terrain(0, 10)
      a.water(-5)
      a.boat('#ffffff')
      a.person('#3b82f6', 'nenhum')
      a.personPlace(10, 0, 0)
    })
    step(3)
    expect(w.isDriving()).toBe(false)
    tap(step, 'e', 'KeyE')
    expect(w.isDriving()).toBe(true)
    tap(step, 'e', 'KeyE')
    expect(w.isDriving()).toBe(false)
    step(10)
    expect(w.isDriving()).toBe(false)
    // A pé de verdade: andar move o personagem.
    const z0 = w.playerPos('z') as number
    drive(step, 20)
    expect(w.isDriving()).toBe(false)
    expect(Math.abs((w.playerPos('z') as number) - z0)).toBeGreaterThan(1)
  })

  it('sobe no carro, desce e continua a pé', async () => {
    const { w, step } = await world((a) => {
      a.car({ style: 'passeio', color: '#ff0000' })
      a.person('#3b82f6', 'nenhum')
      a.personPlace(1.5, 0, 0)
    })
    step(3)
    tap(step, 'e', 'KeyE')
    expect(w.isDriving()).toBe(true)
    tap(step, 'e', 'KeyE')
    expect(w.isDriving()).toBe(false)
    step(10)
    expect(w.isDriving()).toBe(false)
    const z0 = w.playerPos('z') as number
    drive(step, 20)
    expect(w.isDriving()).toBe(false)
    expect(Math.abs((w.playerPos('z') as number) - z0)).toBeGreaterThan(1)
  })

  it('machucado no carro e descendo durante o piscar: o carro continua à vista', async () => {
    const { w, renderers, step } = await world((a) => {
      a.car({ style: 'passeio', color: '#ff0000' })
      a.carPlace(0, 0, 0)
      a.person('#3b82f6', 'nenhum')
      a.personPlace(1.5, 0, 0)
      a.setLife(3)
    })
    step(2)
    tap(step, 'e', 'KeyE')
    expect(w.isDriving()).toBe(true)
    const scene = renderers[0]?.scene as RealTHREE.Scene
    w.hurt(1)
    // Dirigindo, o personagem já está guardado (1 escondido); desce num quadro em que o carro
    // também está APAGADO pelo piscar (2 escondidos).
    const hidden = () =>
      scene.children.filter((c) => (c as RealTHREE.Group).isGroup && !c.visible).length
    expect(hidden()).toBe(1)
    for (let i = 0; i < 8 && hidden() < 2; i++) step(1)
    expect(hidden()).toBe(2)
    tap(step, 'e', 'KeyE')
    expect(w.isDriving()).toBe(false)
    step(60)
    expect(hidden()).toBe(0)
  })
})

describe('Mundo 3D — o recomeçar leve devolve a partida do começo', () => {
  it('coletável tirado durante o jogo volta no recomeçar', async () => {
    const { w, renderers, step } = await world((a) => {
      a.person('#3b82f6', 'nenhum')
      a.personPlace(50, 50, 0)
      a.collectible(5, 'estrela', 'estrela', 0, 0, 10)
    })
    step(2)
    const scene = renderers[0]?.scene as RealTHREE.Scene
    const stars = () => {
      let n = 0
      scene.traverse((o) => {
        const m = o as RealTHREE.Mesh
        if (!m.isMesh || m.geometry?.type !== 'ExtrudeGeometry') return
        for (let p: RealTHREE.Object3D | null = m; p; p = p.parent) if (!p.visible) return
        n++
      })
      return n
    }
    expect(stars()).toBe(5)
    w.removeNamed('estrela')
    step(1)
    expect(stars()).toBe(0)
    w.restart()
    await settle()
    step(2)
    expect(stars()).toBe(5)
  })

  it('moedas nascidas durante o jogo saem no recomeçar (não acumulam)', async () => {
    const { w, renderers, step } = await world((a) => {
      a.person('#3b82f6', 'nenhum')
      a.personPlace(50, 50, 0)
      a.coinsLine(4, 0, 0, 10, 0)
    })
    step(2)
    const coins = () => {
      let im: RealTHREE.InstancedMesh | null = null
      renderers[0]?.scene?.traverse((o) => {
        const m = o as RealTHREE.InstancedMesh
        if (
          m.isInstancedMesh &&
          m.geometry?.type === 'CylinderGeometry' &&
          m.instanceMatrix.count === 512
        )
          im = m
      })
      if (!im) throw new Error('as moedas não entraram na cena')
      return im as RealTHREE.InstancedMesh
    }
    expect(coins().count).toBe(4)
    for (let round = 0; round < 2; round++) {
      w.coinsLine(4, 0, 10, 10, 10)
      step(1)
      expect(coins().count).toBe(8)
      w.restart()
      await settle()
      step(2)
      expect(coins().count).toBe(4)
    }
    // As quatro do começo foram reescritas na pose certa (nenhuma ficou escondida).
    const m = new RealTHREE.Matrix4()
    const pos = new RealTHREE.Vector3()
    for (let i = 0; i < 4; i++) {
      coins().getMatrixAt(i, m)
      pos.setFromMatrixPosition(m)
      expect(pos.y).toBeGreaterThan(-100)
    }
  })

  it('"Jogar de novo" devolve a corrida, as missões e as caixas explosivas do começo', async () => {
    let finishes = 0
    let questHooks = 0
    let booms = 0
    const { w, renderers, step } = await world((a) => {
      a.car({ style: 'passeio', color: '#ff0000' })
      a.raceCreate(0, 0, 0, 1)
      a.raceCheckpoint(0, 30, 0)
      a.raceOnFinish(() => {
        finishes++
      })
      a.quest('chegar', 'Chegue ao topo')
      a.onQuestDone('chegar', () => {
        questHooks++
      })
      a.explosive(-30, 8)
      a.onExplosion(() => {
        booms++
      })
    })
    const scene = renderers[0]?.scene ?? null
    const missionText = () => document.querySelector('[data-szr-panel="missao"]')?.textContent ?? ''
    const runRace = () => {
      w.carPlace(0, -20, 0) // longe da largada: arma
      step(2)
      w.carPlace(0, 0, 0) // na largada: começa
      step(2)
      w.carPlace(0, 30, 0) // no anel: fecha a única volta
      step(2)
    }
    const hitBox = () => {
      w.carPlace(-30, 0, 0)
      step(2)
      drive(step, 40)
      step(10)
    }
    step(2)
    expect(explosiveSpots(scene)).toEqual(['-30,8'])
    runRace()
    expect(finishes).toBe(1)
    w.questDone('chegar')
    step(1)
    expect(missionText()).toContain('Todas as missões completas')
    hitBox()
    expect(booms).toBe(1)
    // Nascem durante a partida: uma missão e uma caixa (saem no recomeçar).
    w.quest('extra', 'Missão que nasceu agora')
    w.explosive(30, 30)
    step(1)
    expect(explosiveSpots(scene)).toEqual(['30,30'])

    await playAgain(w, step)
    const afterRestart = {
      mission: missionText(),
      racePanel: document.querySelector('[data-szr-panel="corrida"]') !== null,
      boxes: explosiveSpots(scene),
    }
    runRace()
    w.questDone('chegar')
    step(1)
    // A missão nascida na partida passada não existe mais: completar a única é completar todas.
    const allDone = missionText()
    hitBox()
    // Tudo junto: cada pedaço da partida que não voltasse apareceria aqui, sem um esconder o outro.
    expect({ ...afterRestart, finishes, questHooks, allDone, booms }).toEqual({
      mission: '⭐ Missão: Chegue ao topo',
      racePanel: false,
      boxes: ['-30,8'],
      finishes: 2,
      questHooks: 2,
      allDone: '🏆 Todas as missões completas!',
      booms: 2,
    })
  })

  it('"Jogar de novo": o do Ao iniciar volta (mesmo tirado no jogo) e o nascido no jogo sai', async () => {
    // O happy-dom não desenha em canvas: o ícone (emoji num canvas 64×64) precisa de um pincel
    // que aceite tudo, senão ele nem nasce e o teste não veria nada.
    const original = HTMLCanvasElement.prototype.getContext
    const noop: unknown = new Proxy(() => noop, { get: () => noop, apply: () => noop })
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: unknown[]
    ) {
      if (this.width === 64 && this.height === 64) return noop as CanvasRenderingContext2D
      return (original as (...a: unknown[]) => unknown).apply(this, args) as RenderingContext | null
    } as typeof original
    try {
      await uniformRestart()
    } finally {
      HTMLCanvasElement.prototype.getContext = original
    }
  })

  async function uniformRestart() {
    let lagoEntries = 0
    const { w, renderers, step } = await world((a) => {
      a.person('#3b82f6', 'nenhum')
      a.personPlace(0, 16, 0)
      a.npc('Bia', 0, 5, '#f97316', 'nenhum')
      a.npc('Caio', 10, 5, '#22c55e', 'nenhum')
      a.point('porta', 20, 0)
      a.zone('lago', -20, 0, 4)
      a.onZone('lago', () => {
        lagoEntries++
      })
      a.marker('estrela', 30, 0)
      a.pushPlace('tijolo', 0, 20)
    })
    const scene = renderers[0]?.scene as RealTHREE.Scene
    const at = (o: RealTHREE.Object3D) => `${Math.round(o.position.x)},${Math.round(o.position.z)}`
    // Os amigos são grupos soltos na cena; o personagem também, mas ele nunca está nesses pontos.
    const friends = () =>
      scene.children
        .filter((c) => (c as RealTHREE.Group).isGroup)
        .map(at)
        .filter((spot) => ['0,5', '10,5', '5,5'].includes(spot))
        .sort()
    const poles = () => {
      const out: string[] = []
      scene.traverse((o) => {
        const geo = (o as RealTHREE.Mesh).geometry as RealTHREE.CylinderGeometry | undefined
        if (geo?.type === 'CylinderGeometry' && geo.parameters.radiusTop === 0.18) out.push(at(o))
      })
      return out.sort()
    }
    const icons = () => {
      const out: string[] = []
      scene.traverse((o) => {
        if ((o as RealTHREE.Sprite).isSprite)
          out.push(`${Math.round(o.position.x)},${Math.round(o.position.z)}`)
      })
      return out.sort()
    }
    // Empurráveis: um balde de 80 vagas por tipo; a posição de cada instância viva.
    const bricks = () => {
      const out: string[] = []
      const m = new RealTHREE.Matrix4()
      const v = new RealTHREE.Vector3()
      scene.traverse((o) => {
        const im = o as RealTHREE.InstancedMesh
        if (!im.isInstancedMesh || im.instanceMatrix.count !== 80) return
        for (let i = 0; i < im.count; i++) {
          im.getMatrixAt(i, m)
          v.setFromMatrixPosition(m)
          out.push(`${Math.round(v.x)},${Math.round(v.z)}`)
        }
      })
      return out.sort()
    }
    step(2)
    const start = { friends: friends(), poles: poles(), icons: icons(), bricks: bricks() }
    expect(start).toEqual({
      friends: ['0,5', '10,5'],
      poles: ['20,0'],
      icons: ['30,0'],
      bricks: ['0,20'],
    })

    // Durante a partida: empurra o tijolo, tira coisas do começo e faz coisas nascerem.
    drive(step, 30)
    expect(bricks()).not.toEqual(['0,20'])
    for (const name of ['Bia', 'porta', 'lago', 'estrela']) w.removeNamed(name)
    w.npc('Novo', 5, 5, '#a855f7', 'nenhum')
    w.marker('alvo', 3, 3)
    w.pushPlace('banco', 40, 40)
    step(2)
    expect(friends()).toEqual(['10,5', '5,5'])

    await playAgain(w, step)
    const after = { friends: friends(), poles: poles(), icons: icons(), bricks: bricks() }
    // A área tirada voltou: entrar nela dispara de novo.
    w.personPlace(-20, 0, 0)
    step(3)
    expect({ ...after, lagoEntries }).toEqual({ ...start, lagoEntries: 1 })
  }

  it('"Levar o carrinho para…" no Ao iniciar põe o carro lá (o carro nasce no start)', async () => {
    const { w, step } = await world((a) => {
      a.car({ style: 'passeio', color: '#ff0000' })
      a.carPlace(20, -10, 90)
    })
    step(2)
    expect([
      Math.round(w.playerPos('x') as number),
      Math.round(w.playerPos('z') as number),
    ]).toEqual([20, -10])
    // O recomeçar devolve o carro ao mesmo lugar do começo.
    w.carPlace(-30, 30, 0)
    step(1)
    w.restart()
    await settle()
    step(2)
    expect([
      Math.round(w.playerPos('x') as number),
      Math.round(w.playerPos('z') as number),
    ]).toEqual([20, -10])
  })

  it('"Pôr" no meio do jogo sai no recomeçar sem deixar parede invisível', async () => {
    const { w, renderers, step } = await world((a) => {
      a.person('#3b82f6', 'nenhum')
      a.personPlace(0, 0, 0)
    })
    step(2)
    const meshes = () => {
      let n = 0
      renderers[0]?.scene?.traverse((o) => {
        if ((o as RealTHREE.Mesh).isMesh) n++
      })
      return n
    }
    const before = meshes()
    // Uma pedra grande bem na frente do personagem, posta durante a partida.
    w.placeThing('pedras', 0, 5, 3)
    step(1)
    expect(meshes()).toBeGreaterThan(before)
    drive(step, 60)
    expect(w.playerPos('z') as number).toBeLessThan(4)
    w.restart()
    await settle()
    step(2)
    expect(meshes()).toBe(before)
    // O caminho ficou livre: anda até depois de onde a pedra estava.
    drive(step, 60)
    expect(w.playerPos('z') as number).toBeGreaterThan(6)
  })
})

describe('Mundo 3D — amigos, mapa, céu e chão', () => {
  it('amigo que nasce durante o jogo passeia (o "passear" veio no Ao iniciar)', async () => {
    const { w, renderers, step } = await world((a) => {
      a.person('#3b82f6', 'nenhum')
      a.personPlace(-50, -50, 0)
      a.npcWander('Bia', 10)
    })
    step(2)
    const scene = renderers[0]?.scene as RealTHREE.Scene
    const known = new Set(scene.children)
    w.npc('Bia', 20, 20, '#f97316', 'nenhum')
    const body = scene.children.find((c) => !known.has(c))
    if (!body) throw new Error('o amigo não entrou na cena')
    step(300)
    const moved = Math.hypot(body.position.x - 20, body.position.z - 20)
    expect(moved).toBeGreaterThan(0.5)
  })

  it('tirar o amigo fecha a pergunta dele (e o próximo amigo consegue perguntar)', async () => {
    let answered = 0
    const { w, step } = await world((a) => {
      a.person('#3b82f6', 'nenhum')
      a.personPlace(-50, -50, 0)
      a.npc('Bia', 0, 5, '#f97316', 'nenhum')
      a.npc('Caio', 10, 5, '#22c55e', 'nenhum')
    })
    step(2)
    const buttons = () => Array.from(document.querySelectorAll('button')).map((b) => b.textContent)
    w.npcAsk(
      'Bia',
      'Vamos?',
      'Sim',
      () => answered++,
      'Não',
      () => answered++,
    )
    step(1)
    expect(buttons()).toContain('1· Sim')
    w.removeNamed('Bia')
    step(1)
    expect(buttons()).not.toContain('1· Sim')
    tap(step, '1', 'Digit1')
    expect(answered).toBe(0)
    // Sem pergunta presa, o outro amigo pergunta na hora.
    w.npcAsk(
      'Caio',
      'E agora?',
      'Bora',
      () => answered++,
      'Fico',
      () => {},
    )
    step(1)
    expect(buttons()).toContain('1· Bora')
    tap(step, '1', 'Digit1')
    expect(answered).toBe(1)
  })

  it('teleporte do mapa grande a bordo do barco leva o BARCO', async () => {
    const { w, step } = await world((a) => {
      // Chão plano abaixo da água: o mundo inteiro é lago (o barco nasce em x 8).
      a.terrain(0, 10)
      a.water(1)
      a.car({ style: 'passeio', color: '#ff0000' })
      a.boat('#ffffff')
      a.person('#3b82f6', 'nenhum')
      a.personPlace(6, 0, 0)
      a.minimap('teleporte')
    })
    step(2)
    w.carPlace(30, 30, 0)
    step(2)
    tap(step, 'e', 'KeyE')
    expect(w.isDriving()).toBe(true)
    expect(w.playerPos('x')).toBeCloseTo(8, 0)
    tap(step, 'm', 'KeyM')
    const map = Array.from(document.querySelectorAll('canvas')).find((c) => c.width === 420)
    if (!map) throw new Error('o mapa grande não abriu')
    map.getBoundingClientRect = () => ({ left: 0, top: 0, width: 420, height: 420 }) as DOMRect
    // Clique em (x −30, z −30) do mundo de 120 m.
    map.dispatchEvent(new PointerEvent('pointerdown', { clientX: 105, clientY: 105 }))
    step(2)
    expect(w.isDriving()).toBe(true)
    expect(w.playerPos('x')).toBeCloseTo(-30, 0)
    expect(w.playerPos('z')).toBeCloseTo(-30, 0)
  })

  it('lua e nuvens seguem o jogador a pé, não o carro estacionado', async () => {
    const { api, renderers, step } = await world((a) => {
      a.car({ style: 'passeio', color: '#ff0000' })
      a.person('#3b82f6', 'nenhum')
      a.personPlace(50, 0, 0)
      a.setTime('noite')
      a.clouds('muitas')
    })
    // O carro estacionado longe, do outro lado do mundo (o jogador está a pé em x 50).
    ;(api as unknown as Any).carPlace(-50, 0, 0)
    step(3)
    const scene = renderers[0]?.scene as RealTHREE.Scene
    let moon: RealTHREE.Mesh | null = null
    let clouds: RealTHREE.Points | null = null
    scene.traverse((o) => {
      if ((o as RealTHREE.Mesh).geometry?.type === 'CircleGeometry') moon = o as RealTHREE.Mesh
      if ((o as RealTHREE.Points).isPoints && (o as RealTHREE.Points).material) {
        const mat = (o as RealTHREE.Points).material as RealTHREE.PointsMaterial
        if (mat.size === 34) clouds = o as RealTHREE.Points
      }
    })
    if (!moon || !clouds) throw new Error('lua ou nuvens não entraram na cena')
    // Embrulho das nuvens = jogador + 0,95 × mundo (114 m): seguindo o carro em −50, nenhuma
    // nuvem passaria de 64 m. As duas medidas juntas: uma não esconde a outra.
    const pos = (clouds as RealTHREE.Points).geometry.attributes
      .position as RealTHREE.BufferAttribute
    let maxX = -Infinity
    for (let i = 0; i < pos.count; i++) maxX = Math.max(maxX, pos.getX(i))
    expect({
      moonX: Math.round((moon as RealTHREE.Mesh).position.x),
      cloudsFollowPlayer: maxX > 64 && maxX <= 50 + 114,
    }).toEqual({ moonX: 50 - 90, cloudsFollowPlayer: true })
  })

  it('o teto de 64 do chão conta só os pedidos feitos durante o jogo', async () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { w, step } = await world((a) => {
        a.terrain(20, 8)
        // 70 aplainados no Ao iniciar, longe do ponto do teste.
        for (let i = 0; i < 70; i++) a.flatten(-50 + (i % 10), -50 + Math.floor(i / 10), 2)
      })
      step(2)
      const far = () =>
        Math.abs((w.groundHeight(36, 30) as number) - (w.groundHeight(30, 30) as number))
      expect(far()).toBeGreaterThan(1)
      w.flatten(30, 30, 12)
      step(1)
      expect(far()).toBeLessThan(0.05)
      expect(warn.mock.calls.some((call) => String(call[0]).includes('teto'))).toBe(false)
      // Durante o jogo o teto continua valendo.
      for (let i = 0; i < 64; i++) w.flatten(0, 0, 1)
      expect(warn.mock.calls.some((call) => String(call[0]).includes('durante o jogo'))).toBe(true)
    } finally {
      warn.mockRestore()
    }
  })
})

describe('Mundo 3D — o que a criança lê no console', () => {
  it('erro dentro de um "Quando…" vira frase em português; o erro cru fica no console.debug', async () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    const debug = spyOn(console, 'debug').mockImplementation(() => {})
    try {
      const { w, step } = await world((a) => {
        a.person('#3b82f6', 'nenhum')
        a.onUpdate(() => {
          throw new TypeError('Cannot read properties of undefined')
        })
      })
      step(2)
      const said = warn.mock.calls.map((call) => String(call[0]))
      const line = said.find((text) => text.includes('A cada quadro'))
      expect(line).toBe('SZWorld3D: erro no "A cada quadro"')
      expect(said.some((text) => text.includes('Cannot read'))).toBe(false)
      expect(debug.mock.calls.some((call) => call[1] instanceof TypeError)).toBe(true)
      // O aviso da área fala do jogador (a pé, de carro ou de barco), não do carrinho.
      w.onZone('casa', 'sem blocos')
      expect(warn.mock.calls.map((call) => String(call[0]))).toContain(
        'SZWorld3D: "Quando o jogador entrar na área" precisa de blocos de fazer dentro',
      )
    } finally {
      warn.mockRestore()
      debug.mockRestore()
    }
  })
})

describe('Mundo 3D — listeners da partida', () => {
  it('abrir e fechar o mapa grande e responder perguntas não acumula listeners', async () => {
    const added: { target: EventTarget; type: string; fn: unknown }[] = []
    const removed: { target: EventTarget; type: string; fn: unknown }[] = []
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
      const { w, step } = await world((a) => {
        a.person('#3b82f6', 'nenhum')
        a.personPlace(-50, -50, 0)
        a.npc('Bia', 0, 5, '#f97316', 'nenhum')
        a.minimap('teleporte')
      })
      step(2)
      const baseline = added.length
      for (let i = 0; i < 3; i++) {
        tap(step, 'm', 'KeyM')
        expect(document.querySelector('canvas[width="420"]')).not.toBeNull()
        tap(step, 'm', 'KeyM')
        expect(document.querySelector('canvas[width="420"]')).toBeNull()
        w.npcAsk(
          'Bia',
          'Vamos?',
          'Sim',
          () => {},
          'Não',
          () => {},
        )
        step(1)
        tap(step, '1', 'Digit1')
      }
      // Nasceram 3 cliques do mapa e 6 botões; nenhum deles ficou pendurado.
      const fresh = added.slice(baseline)
      expect(fresh.length).toBeGreaterThanOrEqual(9)
      const missing = fresh.filter(
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
})

// Tipos que o harness não declara (o inventário completo é do blockAudit).
export type { WorldApi }

import { describe, expect, it } from 'bun:test'
import { type KitApi, loadStartedKit, runtimeBody } from './kitHarness'

/** Comportamento do motor: pool, FSM, vizinhança, combate e FÍSICA. A
 *  orientação/câmera vive em `direction.test.ts`; a bancada é a mesma. */

describe('SZGameKit3D — montagem', () => {
  it('monta a API pública sem THREE real e sem DOM no top-level', () => {
    const win = {
      addEventListener() {},
      SZGameKit3D: undefined,
    } as unknown as Record<string, unknown>
    new Function('THREE', 'window', runtimeBody)({}, win)
    const api = win.SZGameKit3D as Record<string, unknown> | undefined
    expect(api).toBeDefined()
    for (const key of ['setup', 'start', 'defineMold', 'spawn', 'onEntityStateUpdate', 'nearest']) {
      expect(typeof api?.[key]).toBe('function')
    }
  })
})

describe('SZGameKit3D — motor (fake THREE + happy-dom)', () => {
  it('pool: nascer/recolher reusa a entidade; FSM nasce em parado e roda o entrar', async () => {
    const { api } = await loadStartedKit()
    const entered: unknown[] = []
    api.defineMold('inimigo', { health: 30, speed: 3 }, () => {
      api.part({ shape: 'box', color: '#f00', w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0 })
    })
    api.onEnterEntityState('inimigo', 'parado', (e: unknown) => {
      entered.push(e)
    })
    api.setState('jogando')
    const e = api.spawn('inimigo', 1, 0, 2)
    expect(e).not.toBeNull()
    expect(entered).toEqual([e])
    expect(api.entityStateIs(e, 'parado')).toBe(true)
    expect(api.exists(e)).toBe(true)
    expect(api.countAlive('inimigo')).toBe(1)

    api.recycle(e)
    expect(api.exists(e)).toBe(false)
    expect(api.countAlive('inimigo')).toBe(0)
    const e2 = api.spawn('inimigo', 0, 0, 0)
    expect(e2).toBe(e) // pooling: o MESMO objeto volta
  })

  it('teto de entidades: acima de 200 o spawn devolve null', async () => {
    const { api } = await loadStartedKit()
    api.defineMold('m', { health: 1, speed: 1 }, () => {})
    api.setState('jogando')
    for (let i = 0; i < 200; i++) {
      expect(api.spawn('m', 0, 0, 0)).not.toBeNull()
    }
    expect(api.spawn('m', 0, 0, 0)).toBeNull()
  })

  it('vizinhança: nearest acha o mais perto; forEachNear respeita o raio e exclui a própria', async () => {
    const { api } = await loadStartedKit()
    api.defineMold('inimigo', { health: 10, speed: 1 }, () => {})
    api.setState('jogando')
    const a = api.spawn('inimigo', 0, 0, 0)
    const b = api.spawn('inimigo', 5, 0, 0)
    const c = api.spawn('inimigo', 30, 0, 0)
    expect(api.nearest('inimigo', a)).toBe(b)
    const seen: unknown[] = []
    api.forEachNear(a, 'inimigo', 10, (o: unknown) => {
      seen.push(o)
    })
    expect(seen).toEqual([b])
    expect(seen.includes(a)).toBe(false)
    expect(seen.includes(c)).toBe(false)
  })

  it('stateTimer: depois do tempo no estado, muda sozinho; setEntityState é idempotente', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('torre', { health: 100, speed: 0 }, () => {})
    const exits: string[] = []
    api.onExitEntityState('torre', 'parado', () => {
      exits.push('saiu')
    })
    api.stateTimer('torre', 'parado', 0.5, 'mirar')
    api.setState('jogando')
    const t = api.spawn('torre', 0, 0, 0)
    api.setEntityState(t, 'parado') // já está — não roda exit/enter de novo
    expect(exits).toEqual([])
    step(20) // ~0.66s em quadros de 1/30
    expect(api.entityStateIs(t, 'mirar')).toBe(true)
    expect(exits).toEqual(['saiu'])
  })

  it('combate: i-frames seguram o segundo hit; a derrota roda o gancho e recolhe', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('inimigo', { health: 30, speed: 1 }, () => {})
    const deaths: unknown[] = []
    api.onEntityDeath('inimigo', (e: unknown) => {
      deaths.push(e)
    })
    api.setState('jogando')
    const e = api.spawn('inimigo', 0, 0, 0)
    api.hurt(e, 10)
    expect(api.healthOf(e)).toBe(20)
    api.hurt(e, 10) // invencível: ignorado
    expect(api.healthOf(e)).toBe(20)
    step(20) // decai os i-frames (0.5s)
    api.hurt(e, 10)
    expect(api.healthOf(e)).toBe(10)
    step(20)
    api.hurt(e, 10)
    expect(deaths).toEqual([e])
    expect(api.exists(e)).toBe(false)
  })

  it('estados do jogo: entrar em jogando recolhe a arena; pausa não', async () => {
    const { api } = await loadStartedKit()
    api.defineMold('inimigo', { health: 10, speed: 1 }, () => {})
    api.setState('jogando')
    api.spawn('inimigo', 0, 0, 0)
    expect(api.countAlive('inimigo')).toBe(1)
    api.setState('pausado')
    api.setState('jogando') // despausar NÃO reseta
    expect(api.countAlive('inimigo')).toBe(1)
    api.setState('menu')
    api.setState('jogando') // recomeço: arena limpa
    expect(api.countAlive('inimigo')).toBe(0)
  })

  it('runProject recria o escopo e substitui os ganchos no Jogar de novo', async () => {
    const { api } = await loadStartedKit()
    const seen: number[] = []
    const runProject = (api as unknown as { runProject(fn: () => void): void }).runProject

    runProject(() => {
      let entradas = 0
      api.onEnterState('jogando', () => seen.push(++entradas))
    })
    api.setState('jogando')
    api.setState('fim')
    api.setState('jogando')

    expect(seen).toEqual([1, 1])
  })

  it('teclado: keyDown lê o mapa; blur solta as teclas', async () => {
    const { api } = await loadStartedKit()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }))
    expect(api.keyDown('w')).toBe(true)
    window.dispatchEvent(new Event('blur'))
    expect(api.keyDown('w')).toBe(false)
  })

  it('dispose no pagehide: renderer.dispose + forceContextLoss (higiene de contexto WebGL)', async () => {
    const { renderers } = await loadStartedKit()
    window.dispatchEvent(new Event('pagehide'))
    expect(renderers[0]?.disposeCalls).toBe(1)
    expect(renderers[0]?.forceContextLossCalls).toBe(1)
  })
})

/**
 * Física. A v0.2.0 foi para produção com o motor de colisão SEM NENHUM teste de
 * runtime — foi o que deixou os 14 defeitos passarem. Esta suíte é a rede.
 */
describe('SZGameKit3D — física', () => {
  /** Monta o molde `chao` do exemplo "Salto nas Nuvens", byte a byte. */
  function definePlatform(api: KitApi) {
    api.defineMold('chao', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#334155', w: 4, h: 0.6, d: 4, x: 0, y: 0, z: 0 })
    })
  }
  /** Molde do herói do exemplo (caixa 0.9×1.1 em y=0.55 + cabeça). */
  function defineHero(api: KitApi) {
    api.defineMold('heroi', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#38bdf8', w: 0.9, h: 1.1, d: 0.9, x: 0, y: 0.55, z: 0 })
      api.part({ shape: 'sphere', color: '#e0f2fe', w: 0.7, h: 0.7, d: 0.7, x: 0, y: 1.3, z: 0 })
    })
  }

  // ---- CONTRATO com o exemplo em produção (teste #1 do plano) ----
  it('CONTRATO: o herói de "Salto nas Nuvens" ainda pousa exatamente em y=1.8', async () => {
    const { api, step } = await loadStartedKit()
    definePlatform(api)
    defineHero(api)
    api.makeSolid('chao')
    api.setState('jogando')
    api.spawn('chao', 0, 1.5, 0)
    const heroi = api.spawn('heroi', 0, 3, 0)
    api.fall(heroi, 20)
    step(40)
    // A plataforma nasce em y=1.5 e tem meia-altura 0.3 → topo em 1.8. Os pés do
    // herói são a origem do molde, então ele PARA com p.y = 1.8. Se a caixa
    // min/max tivesse mudado o topo, este número mudaria — e o exemplo que já
    // está no ar mudaria junto.
    expect(api.posOf(heroi, 'y')).toBeCloseTo(1.8, 5)
    expect(api.onGround(heroi)).toBe(true)
  })

  it('CONTRATO: molde centrado tem a MESMA caixa de antes (hw/hd simétricos)', async () => {
    const { api, step } = await loadStartedKit()
    // Todas as peças dos 2 exemplos em produção estão em x=0,z=0 → a caixa
    // min/max é simétrica e idêntica ao hw/hd antigo. Prova indireta: o herói
    // encosta na parede exatamente a 0.45+0.5 = 0.95 do centro dela.
    api.defineMold('parede', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#fff', w: 1, h: 4, d: 1, x: 0, y: 2, z: 0 })
    })
    defineHero(api)
    api.makeSolid('parede')
    api.setState('jogando')
    api.spawn('parede', 5, 0, 0)
    const h = api.spawn('heroi', 0, 0, 0)
    api.setVelocity(h, 8, 0, 0)
    step(60)
    expect(api.posOf(h, 'x')).toBeCloseTo(5 - 0.5 - 0.45, 2)
  })

  // ---- Defeito 1: o gate da gravidade ----
  it('⭐ tiro SEM gravidade agora PARA na parede sólida (antes atravessava)', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('parede', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#fff', w: 1, h: 4, d: 1, x: 0, y: 2, z: 0 })
    })
    api.defineMold('tiro', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'sphere', color: '#ff0', w: 0.35, h: 0.35, d: 0.35, x: 0, y: 0, z: 0 })
    })
    api.makeSolid('parede')
    api.setState('jogando')
    api.spawn('parede', 5, 0, 0)
    const t = api.spawn('tiro', 0, 2, 0)
    api.setVelocity(t, 10, 0, 0) // sem gravidade nenhuma
    step(60)
    expect(api.posOf(t, 'x')).toBeLessThan(5)
  })

  it('fantasma (pass_through) volta a atravessar — o escape hatch', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('parede', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#fff', w: 1, h: 4, d: 1, x: 0, y: 2, z: 0 })
    })
    api.defineMold('tiro', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'sphere', color: '#ff0', w: 0.35, h: 0.35, d: 0.35, x: 0, y: 0, z: 0 })
    })
    api.makeSolid('parede')
    api.setState('jogando')
    api.spawn('parede', 5, 0, 0)
    const t = api.spawn('tiro', 0, 2, 0)
    api.passThrough(t, true)
    api.setVelocity(t, 10, 0, 0)
    step(60)
    expect(api.posOf(t, 'x')).toBeGreaterThan(6)
  })

  it('chão-base (y=0) segue SÓ para quem tem gravidade (drone não é preso)', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('drone', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#fff', w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0 })
    })
    api.setState('jogando')
    const d = api.spawn('drone', 0, 5, 0)
    api.setVelocity(d, 0, -2, 0) // desce por vontade própria, sem gravidade
    step(120)
    expect(api.posOf(d, 'y')).toBeLessThan(0)
  })

  // ---- Defeito 2: tunelamento ----
  it('⭐ tiro rápido NÃO atravessa parede fina (substepping)', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('parede', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#fff', w: 1, h: 4, d: 1, x: 0, y: 2, z: 0 })
    })
    api.defineMold('tiro', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'sphere', color: '#ff0', w: 0.35, h: 0.35, d: 0.35, x: 0, y: 0, z: 0 })
    })
    api.makeSolid('parede')
    api.setState('jogando')
    api.spawn('parede', 5, 0, 0)
    const t = api.spawn('tiro', 0, 2, 0)
    // 60 u/s com dt=1/30 = 2 unidades por quadro, contra parede de 1 → o modelo
    // antigo (integra e testa depois) passava direto.
    api.setVelocity(t, 60, 0, 0)
    step(30)
    expect(api.posOf(t, 'x')).toBeLessThan(5)
  })

  // ---- Defeito 7 + MIN_THICK: a regressão que o próprio fix cria ----
  it('⭐ piso de PLANO sólido não é atravessado (MIN_THICK)', async () => {
    const { api, step } = await loadStartedKit()
    // O plano tem espessura ZERO de verdade. Corrigir a caixa honestamente daria
    // um colisor sem volume — o MIN_THICK é o que segura.
    api.defineMold('piso', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'plane', color: '#888', w: 10, h: 10, d: 1, x: 0, y: 0, z: 0 })
    })
    defineHero(api)
    api.makeSolid('piso')
    api.setState('jogando')
    api.spawn('piso', 0, 2, 0)
    const h = api.spawn('heroi', 0, 5, 0)
    api.fall(h, 20)
    step(60)
    expect(api.posOf(h, 'y')).toBeGreaterThan(1.9)
  })

  // ---- Defeito 5: molde descentrado ----
  it('peça fora do centro não infla a caixa para o lado oposto', async () => {
    const { api, step } = await loadStartedKit()
    // Peça só em x=+5: a caixa vai de 4.5 a 5.5, NÃO de -5.5 a +5.5.
    api.defineMold('torto', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#fff', w: 1, h: 4, d: 1, x: 5, y: 2, z: 0 })
    })
    defineHero(api)
    api.makeSolid('torto')
    api.setState('jogando')
    api.spawn('torto', 0, 0, 0)
    const h = api.spawn('heroi', -3, 0, 0)
    api.setVelocity(h, -4, 0, 0) // anda para LONGE da peça
    step(30)
    // Antes: a caixa simétrica ±5.5 pegava o herói em x=-3 e o empurrava.
    expect(api.posOf(h, 'x')).toBeLessThan(-3)
  })

  // ---- Plataforma móvel ----
  it('⭐ plataforma que anda CARREGA quem está em cima', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('plat', { health: 1, speed: 1 }, () => {
      api.part({ shape: 'box', color: '#334155', w: 4, h: 0.6, d: 4, x: 0, y: 0, z: 0 })
    })
    defineHero(api)
    api.makeSolid('plat')
    api.setState('jogando')
    const plat = api.spawn('plat', 0, 1.5, 0)
    const h = api.spawn('heroi', 0, 3, 0)
    api.fall(h, 20)
    step(40) // pousa
    expect(api.onGround(h)).toBe(true)
    const x0 = api.posOf(h, 'x')
    api.setVelocity(plat, 3, 0, 0)
    step(30)
    // Sem a carona o herói ficaria parado enquanto a plataforma sai debaixo dele.
    expect(api.posOf(h, 'x') - x0).toBeGreaterThan(1)
  })

  // ---- Zonas ----
  // ⚠️ Os dois testes de zona incluem um SÓLIDO no mundo de propósito: o
  // resolveSolids só roda sob anySolid, então um mundo só-de-zonas nunca armava
  // o ramo que empurrava — e foi exatamente assim que "zona vira parede em
  // qualquer jogo com chão" passou verde por três versões.
  function defineFloor(api: KitApi) {
    api.defineMold('piso', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#333', w: 30, h: 0.5, d: 30, x: 0, y: 0, z: 0 })
    })
    api.makeSolid('piso')
  }

  it('⭐ zona dispara ao ENTRAR (uma vez), não a cada quadro — com sólido no mundo', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('moeda', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'sphere', color: '#fde047', w: 0.7, h: 0.7, d: 0.7, x: 0, y: 0, z: 0 })
    })
    defineHero(api)
    defineFloor(api)
    api.makeTrigger('moeda')
    api.setState('jogando')
    api.spawn('piso', 0, -0.5, 0)
    api.spawn('moeda', 3, 0.6, 0)
    const h = api.spawn('heroi', 0, 0, 0)
    api.fall(h, 20) // com gravidade E sólido, o caminho é o de um jogo real
    let hits = 0
    api.onOverlap('moeda', () => {
      hits += 1
    })
    api.setVelocity(h, 2, 0, 0)
    step(60) // atravessa a moeda inteira
    expect(hits).toBe(1)
  })

  it('⭐ zona NÃO empurra mesmo com sólidos no mundo: dá para atravessar', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('moeda', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'sphere', color: '#fde047', w: 0.7, h: 0.7, d: 0.7, x: 0, y: 0, z: 0 })
    })
    defineHero(api)
    defineFloor(api)
    api.makeTrigger('moeda')
    api.setState('jogando')
    api.spawn('piso', 0, -0.5, 0)
    api.spawn('moeda', 3, 0.6, 0)
    const h = api.spawn('heroi', 0, 0, 0)
    api.fall(h, 20)
    api.setVelocity(h, 3, 0, 0)
    step(60)
    // Antes do filtro do resolveSolids, a moeda BARRAVA o herói (parede) — ele
    // parava em x≈2.3 e o jogo inteiro de coleta morria em silêncio.
    expect(api.posOf(h, 'x')).toBeGreaterThan(4)
  })

  // ---- Quique ----
  it('quique: bounce=0 é o comportamento de hoje; bounce>0 devolve a bola', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('tramp', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#0f0', w: 6, h: 0.6, d: 6, x: 0, y: 0, z: 0 })
    })
    api.defineMold('bola', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'sphere', color: '#f00', w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0 })
    })
    api.makeSolid('tramp')
    api.setBounce('tramp', 0.9)
    api.setState('jogando')
    api.spawn('tramp', 0, 1.5, 0)
    const b = api.spawn('bola', 0, 8, 0)
    api.fall(b, 20)
    step(40) // cai e bate
    step(10)
    // Com quique, depois de bater a bola sobe: vy passa a ser positiva.
    expect(api.posOf(b, 'y')).toBeGreaterThan(1.8)
  })

  // ---- Material dos DOIS lados: "uma bola quica, mas um humano não" ----
  // O pedido da usuária. Antes era INEXPRIMÍVEL: o quique era só da superfície e
  // o piso-base (solidEnt null) não quicava nada — a bola era obrigada a não
  // quicar no chão comum e o humano era obrigado a quicar no trampolim.
  async function kitBolaEHumano() {
    const { api, step } = await loadStartedKit()
    api.defineMold('bola', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'sphere', color: '#f00', w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0 })
    })
    api.defineMold('humano', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#0af', w: 1, h: 1.8, d: 1, x: 0, y: 0.9, z: 0 })
    })
    api.setState('jogando')
    return { api, step }
  }

  it('⭐ a bola quica no PISO-BASE (antes: nada quicava nele)', async () => {
    const { api, step } = await kitBolaEHumano()
    api.setBounce('bola', 0.8)
    const b = api.spawn('bola', 0, 9, 0)
    api.fall(b, 20)
    step(45) // cai, bate no chão do mundo e volta
    let maisAlto = 0
    for (let i = 0; i < 40; i++) {
      step(1)
      maisAlto = Math.max(maisAlto, api.posOf(b, 'y'))
    }
    // Voltou a subir bem acima do repouso (o pé do molde é y=0 → repouso ~0).
    expect(maisAlto).toBeGreaterThan(1.5)
  })

  it('⭐ o humano NÃO quica no mesmo piso', async () => {
    const { api, step } = await kitBolaEHumano()
    const h = api.spawn('humano', 0, 9, 0)
    api.fall(h, 20)
    step(45)
    const pousou = api.posOf(h, 'y')
    for (let i = 0; i < 40; i++) step(1)
    // Pousou e ficou: sem subir de volta.
    expect(api.posOf(h, 'y')).toBeCloseTo(pousou, 2)
    expect(api.onGround(h)).toBe(true)
  })

  it('⭐ mas o humano continua sendo arremessado pelo trampolim (o Parkour)', async () => {
    const { api, step } = await kitBolaEHumano()
    api.defineMold('tramp', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#0f0', w: 6, h: 0.6, d: 6, x: 0, y: 0, z: 0 })
    })
    api.makeSolid('tramp')
    api.setBounce('tramp', 0.9) // o trampolim manda: max(0 do humano, 0.9) = 0.9
    api.spawn('tramp', 0, 1.5, 0)
    const h = api.spawn('humano', 0, 9, 0)
    api.fall(h, 20)
    step(40)
    step(10)
    expect(api.posOf(h, 'y')).toBeGreaterThan(2.5)
  })

  it('atrito: o mais escorregadio manda (disco de gelo em piso comum)', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('piso', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#333', w: 40, h: 1, d: 40, x: 0, y: 0, z: 0 })
    })
    api.defineMold('caixa', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#fff', w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0 })
    })
    api.defineMold('disco', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#0ff', w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0 })
    })
    api.makeSolid('piso')
    api.setFriction('piso', 0.9) // piso GRUDENTO
    api.setFriction('disco', 0.02) // o disco é de gelo
    api.setState('jogando')
    api.spawn('piso', 0, 0, 0)
    const cx = api.spawn('caixa', -5, 1.5, 0)
    const dc = api.spawn('disco', 5, 1.5, 0)
    api.fall(cx, 20)
    api.fall(dc, 20)
    step(20) // pousam
    api.setVelocity(cx, 10, 0, 0)
    api.setVelocity(dc, 10, 0, 0)
    step(30)
    // A caixa é freada pelo piso grudento; o disco de gelo desliza muito mais.
    expect(api.velocityOf(dc, 'x')).toBeGreaterThan(api.velocityOf(cx, 'x') + 3)
  })

  it('"ter física de": bola/personagem/flutuante saem coerentes de um bloco só', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('bola', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'sphere', color: '#f00', w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0 })
    })
    api.defineMold('balao', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'sphere', color: '#ff0', w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0 })
    })
    api.setPhysics('bola', 'bola')
    api.setPhysics('balao', 'flutuante')
    api.setState('jogando')
    const b = api.spawn('bola', 0, 9, 0)
    const g = api.spawn('balao', 4, 9, 0)
    // O preset da bola liga a queda E o quique de um bloco só — sem "fazer cair
    // com" e sem "quicar". Acompanha a trajetória inteira: cai até o chão e
    // VOLTA a subir.
    let fundo = 9
    for (let i = 0; i < 30; i++) {
      step(1)
      fundo = Math.min(fundo, api.posOf(b, 'y'))
    }
    expect(fundo).toBeLessThan(1) // caiu (a gravidade veio do preset)
    let apice = 0
    for (let i = 0; i < 25; i++) {
      step(1)
      apice = Math.max(apice, api.posOf(b, 'y'))
    }
    expect(apice).toBeGreaterThan(2) // quicou (o quique veio do preset)
    // ...e o flutuante NÃO cai.
    expect(api.posOf(g, 'y')).toBeCloseTo(9, 5)
  })

  // ---- 🎲 O sorteio do kit: a semente PRECISA valer (o setSeed prometia) ----
  it('⭐ mesma semente = mesma sequência de sorteios (a promessa do setSeed)', async () => {
    const { api } = await loadStartedKit()
    const roll = () => {
      api.setSeed(42)
      return [
        api.randomBetween(0, 100),
        api.randomBetween(0, 100),
        api.randomBetween(0, 100),
        api.randomChance(50),
      ]
    }
    const a = roll()
    const b = roll()
    expect(b).toEqual(a) // reprodutível: é o que faz "o bug acontece de novo"
    // Semente diferente = partida diferente.
    api.setSeed(7)
    const c = [api.randomBetween(0, 100), api.randomBetween(0, 100)]
    expect(c).not.toEqual([a[0], a[1]])
  })

  it('sortear respeita o intervalo (e aceita invertido)', async () => {
    const { api } = await loadStartedKit()
    api.setSeed(3)
    for (let i = 0; i < 60; i++) {
      const v = api.randomBetween(10, 20)
      expect(v).toBeGreaterThanOrEqual(10)
      expect(v).toBeLessThanOrEqual(20)
      const inv = api.randomBetween(20, 10) // de trás para a frente: mesmo intervalo
      expect(inv).toBeGreaterThanOrEqual(10)
      expect(inv).toBeLessThanOrEqual(20)
    }
    expect(api.randomChance(100)).toBe(true)
    expect(api.randomChance(0)).toBe(false)
  })

  // ---- ⏱️ Cronômetro ----
  it('cronômetro conta em jogando, CONGELA na pausa e avisa no fim', async () => {
    const { api, step } = await loadStartedKit()
    let acabou = 0
    api.onTimerEnd(() => {
      acabou += 1
    })
    api.setState('jogando')
    api.startTimer(1)
    step(15) // ~0.5s
    const meio = api.timeLeft()
    expect(meio).toBeLessThan(1)
    expect(meio).toBeGreaterThan(0.2)
    api.setState('pausado')
    step(20)
    expect(api.timeLeft()).toBeCloseTo(meio, 5) // congelou
    api.setState('jogando') // despausar NÃO reseta a arena
    step(30)
    expect(api.timeLeft()).toBe(0)
    expect(acabou).toBe(1) // avisa UMA vez, não a cada quadro
    step(10)
    expect(acabou).toBe(1)
  })

  // ---- 🎥 Tremor: não pode comer o sorteio na pausa (5º review) ----
  it('⭐ o tremor NÃO consome o gerador semeado enquanto pausado', async () => {
    // O comentário do applyShake prometia "mesma semente, mesmo tremor", mas com
    // dt=0 na pausa ele girava 3 rand()/quadro para sempre — e o tempo de pausa é
    // relógio de parede, então a mesma semente daria partidas diferentes.
    const { api, step } = await loadStartedKit()
    api.setState('jogando')
    api.setSeed(5)
    const semPausa = [api.randomBetween(0, 1000), api.randomBetween(0, 1000)]

    api.setSeed(5)
    api.cameraShake(0.5, 0.4) // tremor ativo...
    api.setState('pausado')
    step(40) // ...e uma pausa longa no meio dele
    api.setState('jogando')
    const comPausa = [api.randomBetween(0, 1000), api.randomBetween(0, 1000)]
    expect(comPausa).toEqual(semPausa) // a pausa não mexeu no sorteio
  })

  // ---- 🔊 Música é faixa PRÓPRIA, não o Audio dos efeitos ----
  it('⭐ playMusic não sequestra o Audio que o playSound usa', async () => {
    // Audio de mentira que grava cada instância: é o único jeito de VER que a
    // música é um elemento separado do efeito (antes os dois dividiam sounds[k]).
    const made: FakeAudio[] = []
    interface FakeAudio {
      src: string
      loop: boolean
      currentTime: number
      preload: string
      oncanplaythrough: null | (() => void)
      onerror: null | (() => void)
      play(): Promise<void>
      pause(): void
    }
    const RealAudio = (globalThis as { Audio?: unknown }).Audio
    ;(globalThis as { Audio?: unknown }).Audio = function (this: FakeAudio, src?: string) {
      const a: FakeAudio = {
        src: src || '',
        loop: false,
        currentTime: 0,
        preload: '',
        oncanplaythrough: null,
        onerror: null,
        play: () => Promise.resolve(),
        pause() {},
      }
      made.push(a)
      // loadSound espera o oncanplaythrough para resolver o `pending`.
      queueMicrotask(() => a.oncanplaythrough?.())
      return a
    } as unknown as typeof Audio
    try {
      const { api } = await loadStartedKit()
      const url =
        'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA='
      ;(api as unknown as { loadSound: (n: string, a: string) => void }).loadSound('tema', url)
      await new Promise((r) => setTimeout(r, 5)) // deixa o loadSound resolver
      const sfx = made.find((a) => a.src === url) // o Audio do EFEITO
      expect(sfx).toBeTruthy()
      const before = made.length

      api.playMusic('tema')
      // A música criou um Audio NOVO (não reusou o do efeito).
      expect(made.length).toBe(before + 1)
      const music = made[made.length - 1] as FakeAudio
      expect(music).not.toBe(sfx)
      expect(music.loop).toBe(true) // a música repete...
      expect(sfx?.loop).toBe(false) // ...e o efeito NÃO virou loop (era o bug)

      // O efeito toca sem reiniciar a música nem herdar o loop.
      ;(api as unknown as { playSound: (n: string) => void }).playSound('tema')
      expect(sfx?.loop).toBe(false)
    } finally {
      ;(globalThis as { Audio?: unknown }).Audio = RealAudio
    }
  })

  // ---- 🎥 Câmera não segue o slot reciclado por OUTRA entidade ----
  it('⭐ câmera: alvo reciclado + slot reusado → volta à origem (não segue o estranho)', async () => {
    const { api, step, renderers } = await loadStartedKit()
    api.defineMold('bicho', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#f00', w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0 })
    })
    api.setState('jogando')
    const chefe = api.spawn('bicho', 20, 0, 20) // longe da origem
    api.cameraOrbit(25)
    api.cameraLookAt(chefe) // a câmera orbita o chefe
    step(2)
    api.recycle(chefe)
    // O slot volta a nascer como OUTRO bicho, noutro lugar (o pool reusa o objeto).
    const novo = api.spawn('bicho', -18, 0, -18)
    expect(novo).toBe(chefe) // é o MESMO slot, com _gen novo
    step(2)
    const cam = (renderers as { camera?: { position: { x: number; z: number } } }[])[0]?.camera
    // A órbita agora olha para a ORIGEM (o alvo antigo morreu), não para o -18/-18
    // do estranho. A câmera fica no lado +X/+Z do pivô origem.
    expect(cam).toBeTruthy()
    const px = cam?.position.x ?? 0
    const pz = cam?.position.z ?? 0
    // Se seguisse o estranho em (-18,-18), a câmera estaria no octante negativo.
    expect(px).toBeGreaterThan(0)
    expect(pz).toBeGreaterThan(0)
  })

  // ---- ⚡ Matriz de quem está parado: congela, mas o setter ainda MOVE ----
  it('⭐ entidade parada congela a matriz, mas place() ainda move de verdade', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('parede', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#888', w: 2, h: 2, d: 2, x: 0, y: 1, z: 0 })
    })
    api.setState('jogando')
    const e = api.spawn('parede', 3, 0, 3) as {
      mesh: { matrixAutoUpdate: boolean; matrixWorld: { elements: number[] } }
    }
    step(3) // sem velocidade → vira estático
    expect(e.mesh.matrixAutoUpdate).toBe(false) // a matriz congelou
    // ...mas a matriz está CERTA (posição de spawn), não na origem: elements[12..14]
    // é a translação do matrixWorld.
    expect(e.mesh.matrixWorld.elements[12]).toBeCloseTo(3, 3)
    expect(e.mesh.matrixWorld.elements[14]).toBeCloseTo(3, 3)
    // O setter numa entidade CONGELADA tem de mover de verdade (o bug invisível
    // que o matrixAutoUpdate=false cria se um setter não recompuser).
    api.place(e, -5, 0, 8)
    step(1) // o render recompõe o matrixWorld (matrixWorldNeedsUpdate do updateMatrix)
    expect(e.mesh.matrixWorld.elements[12]).toBeCloseTo(-5, 3)
    expect(e.mesh.matrixWorld.elements[14]).toBeCloseTo(8, 3)
  })

  it('entidade que anda mantém o auto-update (não congela quem se mexe)', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('bola', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'sphere', color: '#0af', w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0 })
    })
    api.setState('jogando')
    const e = api.spawn('bola', 0, 5, 0) as { mesh: { matrixAutoUpdate: boolean } }
    api.setVelocity(e, 2, 0, 0)
    step(3)
    expect(e.mesh.matrixAutoUpdate).toBe(true) // quem anda não congela
  })

  // ---- ♻️ Entidade recolhida SAI da cena (não só invisível) ----
  it('⭐ recycle tira o mesh da cena; spawn o traz de volta', async () => {
    const { api } = await loadStartedKit()
    api.defineMold('bicho', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#f00', w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0 })
    })
    api.setState('jogando')
    const e = api.spawn('bicho', 0, 0, 0) as { mesh: { parent: unknown } }
    expect(e.mesh.parent).toBeTruthy() // na cena
    api.recycle(e)
    expect(e.mesh.parent).toBe(null) // saiu da cena (era só visible=false)
    const e2 = api.spawn('bicho', 1, 0, 0) as { mesh: { parent: unknown } }
    expect(e2).toBe(e as unknown as typeof e2) // mesmo slot do pool
    expect(e2.mesh.parent).toBeTruthy() // voltou para a cena
  })

  // ---- Defeito 11: arrasto ----
  it('arrasto do ar não briga mais com a gravidade (só X/Z)', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('cx', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#fff', w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0 })
    })
    api.setState('jogando')
    const a = api.spawn('cx', 0, 50, 0)
    api.fall(a, 20)
    api.setDrag(a, 5) // arrasto ALTO: antes segurava a queda (flutuava)
    step(60)
    expect(api.posOf(a, 'y')).toBeLessThan(30)
  })

  // ---- Cápsula / bola ----
  it('⭐ cápsula não engancha na quina: escorrega em vez de travar', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('quina', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#fff', w: 2, h: 2, d: 2, x: 0, y: 1, z: 0 })
    })
    defineHero(api)
    api.makeSolid('quina')
    api.setCollider('heroi', 'capsule')
    api.setState('jogando')
    api.spawn('quina', 0, 0, 0)
    // Mira DE RASPÃO na quina do cubo (diagonal): a caixa engata, a cápsula
    // desliza pelo canto arredondado e segue.
    const h = api.spawn('heroi', -4, 0, -1.6)
    api.setVelocity(h, 4, 0, 0)
    step(60)
    expect(api.posOf(h, 'x')).toBeGreaterThan(2)
  })

  it('bola: colisor esférico empurra pelo raio (sem quina)', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('parede', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#fff', w: 4, h: 4, d: 1, x: 0, y: 2, z: 0 })
    })
    api.defineMold('bola', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'sphere', color: '#f00', w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0 })
    })
    api.makeSolid('parede')
    api.setCollider('bola', 'sphere')
    api.setState('jogando')
    api.spawn('parede', 0, 0, 5)
    const b = api.spawn('bola', 0, 0, 0)
    api.setVelocity(b, 0, 0, 6)
    step(60)
    // Para encostando: face da parede em z=4.5, menos o raio 0.5 da bola.
    expect(api.posOf(b, 'z')).toBeCloseTo(4.0, 1)
  })

  // ---- Semente (determinismo do curso) ----
  it('⭐ a MESMA semente dá a MESMA partida (e sementes diferentes, partidas diferentes)', async () => {
    async function runWithSeed(seed: number): Promise<number[]> {
      const { api, step } = await loadStartedKit()
      api.defineMold('bicho', { health: 1, speed: 0 }, () => {
        api.part({ shape: 'box', color: '#f00', w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0 })
      })
      api.setSeed(seed)
      api.setState('jogando')
      // O nascedouro "em qualquer lugar" sorteia ângulo e distância — é acaso puro.
      api.startSpawner('bicho', 0.05, 'anywhere')
      step(20)
      const out: number[] = []
      api.forEachAlive('bicho', (e) => {
        out.push(Math.round(api.posOf(e, 'x') * 1000) / 1000)
      })
      return out.sort((a, b) => a - b)
    }
    const a = await runWithSeed(42)
    const b = await runWithSeed(42)
    const c = await runWithSeed(7)
    expect(a.length).toBeGreaterThan(0)
    expect(a).toEqual(b) // mesma semente → partida idêntica
    expect(a).not.toEqual(c) // semente diferente → outra partida
  })

  // ---- Rampa ----
  it('⭐ rampa: o herói sobe a inclinação em vez de bater nela', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('rampa', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'rampa', color: '#888', w: 4, h: 2, d: 8, x: 0, y: 0, z: 0 })
    })
    defineHero(api)
    api.makeSolid('rampa')
    api.setState('jogando')
    api.spawn('rampa', 0, 0, 0)
    const h = api.spawn('heroi', 0, 1, -3)
    api.fall(h, 20)
    step(20)
    const y0 = api.posOf(h, 'y')
    api.setVelocity(h, 0, 0, 3) // anda subindo a rampa (+Z)
    step(40)
    expect(api.posOf(h, 'y')).toBeGreaterThan(y0)
  })
})

describe('SZGameKit3D — 6º review: identidade, rumo, barras e jorros', () => {
  function defineBicho(api: KitApi, name = 'bicho', health = 100) {
    api.defineMold(name, { health, speed: 4 }, () => {
      api.part({ shape: 'box', color: '#f00', w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0 })
    })
  }

  it('⭐ estático renascido do pool RENDERIZA no lugar novo (matriz re-assada)', async () => {
    // O playthrough do Tiro ao Alvo pegou: a vida ESTÁTICA anterior congela a
    // matriz (matrixAutoUpdate=false) e o renascido ficava desenhado (e
    // clicável) no lugar da vida passada — .position no lugar novo, fantasma
    // na tela. Movedor se cura (re-arma o flag); o parado-para-sempre não.
    const { api, step } = await loadStartedKit()
    defineBicho(api)
    api.setState('jogando')
    const e = api.spawn('bicho', 3, 0, 3)
    step(5) // congela a matriz (split estático)
    api.recycle(e)
    const e2 = api.spawn('bicho', -8, 0, -8) // reusa o slot
    expect(e2).toBe(e)
    step(2) // o render (fake) roda scene.updateMatrixWorld()
    const mesh = (e2 as { mesh: { matrixWorld: { elements: number[] } } }).mesh
    const el = mesh.matrixWorld.elements
    expect(el[12]).toBeCloseTo(-8, 4) // a COLUNA de translação da matrixWorld
    expect(el[14]).toBeCloseTo(-8, 4)
  })

  it('isMold responde a identidade (o filtro do "quem" das zonas)', async () => {
    const { api } = await loadStartedKit()
    defineBicho(api)
    defineBicho(api, 'outro')
    api.setState('jogando')
    const e = api.spawn('bicho', 0, 0, 0)
    expect(api.isMold(e, 'bicho')).toBe(true)
    expect(api.isMold(e, 'outro')).toBe(false)
    api.recycle(e)
    expect(api.isMold(e, 'bicho')).toBe(false) // recolhido não é mais ninguém
  })

  it('seekPoint anda rumo ao ponto SÓ no plano e para ao chegar', async () => {
    const { api, step } = await loadStartedKit()
    defineBicho(api)
    api.setState('jogando')
    const e = api.spawn('bicho', 0, 0, 0)
    api.setVelocity(e, 0, 5, 0) // sobe — o rumo não pode roubar o Y
    api.seekPoint(e, 10, 0)
    expect(api.velocityOf(e, 'x')).toBeCloseTo(4) // velocidade do molde
    expect(api.velocityOf(e, 'y')).toBeCloseTo(5) // Y intocado
    step(3)
    // Em cima do destino: para de empurrar (senão vibra no ponto p/ sempre).
    api.place(e, 10, 0, 0)
    api.seekPoint(e, 10, 0)
    expect(api.velocityOf(e, 'x')).toBe(0)
    expect(api.velocityOf(e, 'z')).toBe(0)
  })

  it('⭐ barra de vida: nasce com o molde marcado, encolhe com o dano e some na morte', async () => {
    const { api, step } = await loadStartedKit()
    defineBicho(api)
    api.showHealthBar('bicho', true)
    api.setState('jogando')
    const e = api.spawn('bicho', 0, 0, 0)
    step(2)
    const barras = () => document.querySelectorAll('.szg3k-bar')
    expect(barras().length).toBe(1)
    api.hurt(e, 50)
    step(2)
    const fill = document.querySelector('.szg3k-bar i') as { style: { width: string } } | null
    expect(fill?.style.width).toBe('50%')
    step(20) // passa a invencibilidade (0.5 s)
    api.hurt(e, 60) // morre
    step(2)
    expect(barras().length).toBe(0)
  })

  it('⭐ DOIS jorros da mesma receita convivem (a tabela antiga apagava o 1º em silêncio)', async () => {
    const { api, step, renderers } = await loadStartedKit()
    api.setSeed(5)
    api.defineEmitter('fogo', {
      rate: 30,
      life: 1,
      speed: 0.5,
      cone: 10,
      gravity: 0,
      glow: true,
      curve: 'suave',
    })
    api.setState('jogando')
    api.startEmitter('fogo', 0, 1, 0)
    api.startEmitter('fogo', 10, 1, 0)
    step(30) // ~1 s: cada jorro mantém ~30 grãos vivos
    let vivos = 0
    renderers[0]?.scene?.traverse((o) => {
      const p = o as unknown as { isPoints?: boolean; geometry?: { drawRange?: { count: number } } }
      if (p.isPoints) vivos += p.geometry?.drawRange?.count ?? 0
    })
    // Um jorro só chegaria a ~30; dois convivendo passam com folga de 45.
    expect(vivos).toBeGreaterThan(45)
  })

  it('jorro preso em entidade morre com o slot RECICLADO (marca de geração)', async () => {
    const { api, step, renderers } = await loadStartedKit()
    api.setSeed(5)
    defineBicho(api)
    api.defineEmitter('rastro', {
      rate: 30,
      life: 0.4,
      speed: 0.5,
      cone: 10,
      gravity: 0,
      glow: true,
      curve: 'suave',
    })
    api.setState('jogando')
    const a = api.spawn('bicho', 0, 0, 0)
    api.emitterOn('rastro', a)
    step(10)
    const conta = () => {
      let vivos = 0
      renderers[0]?.scene?.traverse((o) => {
        const p = o as unknown as {
          isPoints?: boolean
          geometry?: { drawRange?: { count: number } }
        }
        if (p.isPoints) vivos += p.geometry?.drawRange?.count ?? 0
      })
      return vivos
    }
    expect(conta()).toBeGreaterThan(0) // controle: o rastro está aceso
    api.recycle(a)
    api.spawn('bicho', 5, 0, 5) // reusa o slot com OUTRA geração
    step(30) // 1 s ≫ vida 0.4 s: sem emissão nova, tudo apaga
    expect(conta()).toBe(0)
  })

  it('sombra do sol leva o normalBias do curso e a textura de peça é sRGB', async () => {
    ;(globalThis.window as unknown as Record<string, unknown>).__SZGAME_ASSETS = {
      'estampa.png':
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    }
    const { api, step, renderers } = await loadStartedKit((k) => {
      k.defineMold('caixa', { health: 1, speed: 0 }, () => {
        k.part({
          shape: 'box',
          color: '#fff',
          texture: 'estampa.png',
          w: 1,
          h: 1,
          d: 1,
          x: 0,
          y: 0.5,
          z: 0,
        })
      })
    })
    api.setState('jogando')
    const e = api.spawn('caixa', 0, 0, 0)
    step(1)
    let bias = -1
    renderers[0]?.scene?.traverse((o) => {
      const l = o as unknown as { isDirectionalLight?: boolean; shadow?: { normalBias: number } }
      if (l.isDirectionalLight && l.shadow) bias = l.shadow.normalBias
    })
    expect(bias).toBe(0.05)
    const ent = e as { mesh: { children: Array<{ material?: { map?: { colorSpace?: string } } }> } }
    const map = ent.mesh.children[0]?.material?.map
    expect(map?.colorSpace).toBe('srgb')
    delete (globalThis.window as unknown as Record<string, unknown>).__SZGAME_ASSETS
  })
})

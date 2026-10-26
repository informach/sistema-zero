import { afterEach, describe, expect, it, spyOn } from 'bun:test'
import { type FakeRenderer, type KitApi, loadStartedKit } from './kitHarness'

/**
 * Lote 12 do review 3D: patrulhar, a mochila 🎒, guardar o progresso e as fases, de ponta a
 * ponta no motor (THREE de verdade + happy-dom, a bancada do `runtime.test.ts`).
 */

interface Mesh {
  mesh: { position: { x: number; z: number }; rotation: { y: number } }
}

afterEach(() => {
  // Recolhe os palcos e listeners das instâncias anteriores (mesmo trato do playthrough).
  window.dispatchEvent(new Event('pagehide'))
})

/** O x de cada luz pontual da cena viva, em ordem (as luzes do "Acender uma luz"). */
function pointLightsX(renderers: FakeRenderer[]): number[] {
  const xs: number[] = []
  renderers[0]?.scene?.traverse((o) => {
    if ((o as { isPointLight?: boolean }).isPointLight) xs.push(o.position.x)
  })
  return xs.sort((a, b) => a - b)
}

/** Quantas faíscas vivas estão a menos de 1 m do x dado (os jorros daqui não se mexem). */
function sparksNear(renderers: FakeRenderer[], x: number): number {
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
    for (let i = 0; i < count; i++) if (Math.abs((array[i * 3] ?? 0) - x) < 1) n++
  })
  return n
}

function moldDoGuarda(api: KitApi) {
  api.defineMold('guarda', { health: 10, speed: 0 }, () => {
    api.part({ shape: 'box', color: '#f00', w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0 })
  })
}

describe('patrulhar', () => {
  it('vai até B virado para onde anda, para um pouco e volta para A', async () => {
    const { api, step } = await loadStartedKit()
    moldDoGuarda(api)
    api.onEntityStateUpdate('guarda', 'parado', (ela) => api.patrol(ela, -4, 0, 4, 0, 6))
    api.setState('jogando')
    const guarda = api.spawn('guarda', -4, 0, 0) as Mesh
    step(10)
    // Indo para +x: andou e está virado para +x (atan2(vx, vz) = 90°).
    expect(guarda.mesh.position.x).toBeGreaterThan(-3)
    expect(guarda.mesh.rotation.y).toBeCloseTo(Math.PI / 2, 3)
    let maxX = -Infinity
    for (let i = 0; i < 60; i++) {
      step(1)
      maxX = Math.max(maxX, guarda.mesh.position.x)
    }
    // Chegou à ponta B (sem passar muito dela) e já voltou, virado para −x.
    expect(maxX).toBeGreaterThan(3.6)
    expect(maxX).toBeLessThan(4.5)
    expect(guarda.mesh.position.x).toBeLessThan(maxX - 1)
    expect(guarda.mesh.rotation.y).toBeCloseTo(-Math.PI / 2, 3)
  })

  it('quem deixa de pedir a patrulha (outro estado) para de patrulhar', async () => {
    const { api, step } = await loadStartedKit()
    moldDoGuarda(api)
    api.onEntityStateUpdate('guarda', 'parado', (ela) => api.patrol(ela, -4, 0, 4, 0, 6))
    api.setState('jogando')
    const guarda = api.spawn('guarda', -4, 0, 0)
    step(6)
    api.setEntityState(guarda, 'quieto')
    api.setVelocity(guarda, 0, 0, 0)
    const x = api.posOf(guarda, 'x')
    step(20)
    expect(api.posOf(guarda, 'x')).toBeCloseTo(x, 5)
  })
})

describe('mochila', () => {
  const panel = () =>
    [...document.querySelectorAll('[data-szr-panel="mochila"]')].at(-1)?.textContent ?? ''

  it('pôr, tirar (nunca negativo), quantos, tem e esvaziar, com o canto da tela', async () => {
    const { api } = await loadStartedKit()
    api.setState('jogando')
    api.putInBag('chave', 2)
    api.putInBag('moeda', 3)
    expect(api.bagCount('chave')).toBe(2)
    expect(api.bagHas('moeda')).toBe(true)
    expect(panel()).toBe('🎒 chave ×2 · moeda ×3')
    api.takeFromBag('chave', 1)
    expect(api.bagCount('chave')).toBe(1)
    api.takeFromBag('chave', 5)
    expect(api.bagCount('chave')).toBe(0)
    expect(api.bagHas('chave')).toBe(false)
    expect(panel()).toBe('🎒 moeda ×3')
    api.putInBag('chave', 0)
    expect(api.bagHas('chave')).toBe(false)
    api.clearBag()
    expect(api.bagCount('moeda')).toBe(0)
    expect(panel()).toBe('')
  })

  it('zera quando a partida recomeça (fim → jogar de novo), não na pausa', async () => {
    const { api } = await loadStartedKit()
    api.setState('jogando')
    api.putInBag('chave', 1)
    api.setState('pausado')
    api.setState('jogando')
    expect(api.bagCount('chave')).toBe(1)
    api.endGame('perdeu')
    api.setState('jogando')
    expect(api.bagCount('chave')).toBe(0)
  })
})

describe('guardar o progresso', () => {
  it('guarda e lê pelo localStorage do jogo (o shim do preview), com o valor reserva', async () => {
    window.localStorage.removeItem('szg3k-val-recorde')
    const { api } = await loadStartedKit()
    expect(api.savedValue('recorde', 0)).toBe(0)
    api.saveValue('recorde', 7)
    expect(window.localStorage.getItem('szg3k-val-recorde')).toBe('7')
    expect(api.savedValue('recorde', 0)).toBe(7)
    api.saveValue('nome', 'Ana')
    expect(api.savedValue('nome', '')).toBe('Ana')
    expect(api.savedValue('nunca', 5)).toBe(5)
    // Um valor que não vira texto (ciclo) não é guardado e não quebra.
    const ciclo: Record<string, unknown> = {}
    ciclo.eu = ciclo
    api.saveValue('recorde', ciclo)
    expect(api.savedValue('recorde', 0)).toBe(7)
    window.localStorage.removeItem('szg3k-val-recorde')
    window.localStorage.removeItem('szg3k-val-nome')
  })

  it('⭐ o nome é aparado e o mesmo valor de novo não grava', async () => {
    window.localStorage.removeItem('szg3k-val-recorde')
    const { api } = await loadStartedKit()
    // O storage do jogo com um contador de gravações por cima (o shim do preview também
    // espelha cada gravação para fora do iframe: é esse custo que o dedupe poupa).
    const writes: string[] = []
    const real = window.localStorage
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage')
    const counting = {
      getItem: (key: string) => real.getItem(key),
      setItem: (key: string, value: string) => {
        writes.push(`${key}=${value}`)
        real.setItem(key, value)
      },
      removeItem: (key: string) => real.removeItem(key),
    }
    Object.defineProperty(window, 'localStorage', { configurable: true, get: () => counting })
    try {
      api.saveValue(' recorde ', 5)
      expect(window.localStorage.getItem('szg3k-val-recorde')).toBe('5')
      expect(api.savedValue('recorde ', 0)).toBe(5)
      // O recorde guardado no "A cada quadro": 60 pedidos iguais, UMA gravação.
      for (let i = 0; i < 60; i++) api.saveValue('recorde', 5)
      api.saveValue('recorde', 6)
      api.saveValue('recorde', 6)
      expect(writes).toEqual(['szg3k-val-recorde=5', 'szg3k-val-recorde=6'])
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original)
      else delete (window as { localStorage?: unknown }).localStorage
      window.localStorage.removeItem('szg3k-val-recorde')
    }
  })

  it('valor grande demais tem a frase própria (não "guarde um número ou um texto")', async () => {
    const { api } = await loadStartedKit()
    const warnings: string[] = []
    const warn = spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
      warnings.push(args.map(String).join(' '))
    })
    try {
      api.saveValue('mapa', 'x'.repeat(20001))
      const ciclo: Record<string, unknown> = {}
      ciclo.eu = ciclo
      api.saveValue('ciclo', ciclo)
    } finally {
      warn.mockRestore()
    }
    expect(window.localStorage.getItem('szg3k-val-mapa')).toBeNull()
    expect(warnings.some((w) => w.includes('"mapa"') && w.includes('grande demais'))).toBe(true)
    expect(warnings.some((w) => w.includes('"mapa"') && w.includes('guarde um número'))).toBe(false)
    expect(warnings.some((w) => w.includes('"ciclo"') && w.includes('guarde um número'))).toBe(true)
  })

  it('sem storage (bloqueado), guardar não quebra e ler devolve a reserva', async () => {
    const { api } = await loadStartedKit()
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError')
      },
    })
    try {
      expect(() => api.saveValue('recorde', 3)).not.toThrow()
      expect(api.savedValue('recorde', 9)).toBe(9)
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original)
      else delete (window as { localStorage?: unknown }).localStorage
    }
  })
})

describe('fases', () => {
  it('começar a partida é a fase 1; a próxima fase troca no quadro seguinte e limpa a arena', async () => {
    const { api, step } = await loadStartedKit()
    moldDoGuarda(api)
    const starts: number[] = []
    api.onLevelStart(() => {
      starts.push(api.level())
      api.spawn('guarda', 0, 0, 0)
    })
    api.setState('jogando')
    expect(starts).toEqual([1])
    api.addScore(3)
    api.putInBag('chave', 1)
    api.spawn('guarda', 2, 0, 0)
    api.startSpawner('guarda', 0.1, 'anywhere')
    api.startTimer(30)
    expect(api.countAlive('guarda')).toBe(2)
    api.nextLevel()
    // Adiado: nada muda antes do próximo quadro.
    expect(api.level()).toBe(1)
    step(1)
    expect(api.level()).toBe(2)
    expect(starts).toEqual([1, 2])
    // Só o guarda que a fase 2 pôs: os da fase 1 saíram e o nascer sem parar parou.
    expect(api.countAlive('guarda')).toBe(1)
    step(10)
    expect(api.countAlive('guarda')).toBe(1)
    // Pontos e mochila continuam; a contagem parou.
    expect(api.score()).toBe(3)
    expect(api.bagCount('chave')).toBe(1)
    const left = api.timeLeft()
    step(10)
    expect(api.timeLeft()).toBe(left)
  })

  it('recomeçar e voltar ao menu voltam para a fase 1; fora do jogo não troca', async () => {
    const { api, step } = await loadStartedKit()
    const starts: number[] = []
    api.onLevelStart(() => starts.push(api.level()))
    api.nextLevel()
    step(1)
    expect(api.level()).toBe(1)
    api.setState('jogando')
    api.nextLevel()
    step(1)
    expect(api.level()).toBe(2)
    api.endGame('ganhou')
    api.setState('jogando')
    expect(api.level()).toBe(1)
    api.nextLevel()
    step(1)
    api.setState('menu')
    expect(api.level()).toBe(1)
    expect(starts).toEqual([1, 2, 1, 2])
  })

  it('⭐ a luz acesa numa fase sai com ela; a da partida fica (não somam até o teto)', async () => {
    const { api, step, renderers } = await loadStartedKit()
    api.onEnterState('jogando', () => api.addLight('#ffffff', 0, 8, 0, 1))
    api.onLevelStart(() => api.addLight('#fb923c', api.level(), 2, 0, 1.5))
    api.setState('jogando')
    step(1)
    expect(pointLightsX(renderers)).toEqual([0, 1])
    for (let fase = 2; fase <= 9; fase++) {
      api.nextLevel()
      step(1)
      // Antes, as luzes de cada fase se somavam: na fase 8 o teto (8) já não deixava acender.
      expect(pointLightsX(renderers)).toEqual([0, fase])
    }
  })

  it('⭐ o jorro aceso antes da fase 1 continua; o aceso durante a fase apaga com ela', async () => {
    const { api, step, renderers } = await loadStartedKit((a) => {
      a.defineEmitter('chama', {
        colorFrom: '#ffffff',
        colorTo: '#000000',
        sizeFrom: 0.3,
        sizeTo: 0,
        rate: 40,
        speed: 0,
        cone: 0,
        gravity: 0,
      })
    })
    api.onEnterState('jogando', () => api.startEmitter('chama', -10, 1, 0)) // a tocha da partida
    api.onLevelStart(() => {
      if (api.level() === 1) api.startEmitter('chama', 10, 1, 0) // só a fase 1 tem esta
    })
    api.setState('jogando')
    step(20)
    expect(sparksNear(renderers, -10)).toBeGreaterThan(0)
    expect(sparksNear(renderers, 10)).toBeGreaterThan(0)
    api.nextLevel()
    step(1)
    step(20)
    expect(sparksNear(renderers, -10)).toBeGreaterThan(0)
    expect(sparksNear(renderers, 10)).toBe(0)
  })

  it('com a fábrica do projeto, o "Quando começar uma fase" não se repete a cada partida', async () => {
    const { api } = await loadStartedKit()
    let calls = 0
    api.runProject(() => {
      api.onLevelStart(() => {
        calls += 1
      })
    })
    api.setState('jogando')
    api.endGame('perdeu')
    api.setState('jogando')
    expect(calls).toBe(2)
  })
})

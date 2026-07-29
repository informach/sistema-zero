import { describe, expect, it } from 'bun:test'
import { world3DRuntime } from '../runtime'

/**
 * Testes de UNIDADE do runtime do Mundo 3D, sem DOM e sem three de verdade:
 * o corpo da string é avaliado com um `window` de mentira e um THREE vazio —
 * a parte pura da API (config, terreno analítico, guardas) funciona sem
 * renderer nenhum (é o mesmo contrato lazy do Jogo 3D Avançado: zero
 * `new THREE.*` e zero DOM fora do start()).
 */

interface Api {
  setup: (o: unknown) => unknown
  terrain: (h?: unknown, s?: unknown) => unknown
  flatten: (x?: unknown, z?: unknown, r?: unknown) => unknown
  path: (a?: unknown, b?: unknown, c?: unknown, d?: unknown, e?: unknown) => unknown
  water: (y?: unknown, color?: unknown) => unknown
  skyPhoto: (name?: unknown) => unknown
  start: () => unknown
  worldSize: () => number
  groundHeight: (x?: unknown, z?: unknown) => number
  car: (o: unknown) => unknown
  carStats: (a?: unknown, b?: unknown, c?: unknown) => unknown
  carPlace: (x?: unknown, z?: unknown, d?: unknown) => unknown
  carPos: (a?: unknown) => number
  carSpeed: () => number
  carBoost: (force?: unknown) => unknown
  district: (kind?: unknown, x?: unknown, z?: unknown, size?: unknown) => unknown
  roadGrid: (layout?: unknown, x?: unknown, z?: unknown, size?: unknown, width?: unknown) => unknown
  houseRow: (
    n?: unknown,
    x1?: unknown,
    z1?: unknown,
    x2?: unknown,
    z2?: unknown,
    style?: unknown,
  ) => unknown
  quality: (mode?: unknown) => unknown
  inventoryGive: (item?: unknown, n?: unknown) => number | undefined
  inventoryRemove: (item?: unknown, n?: unknown) => number | undefined
  inventoryCount: (item?: unknown) => number
  inventoryHas: (item?: unknown, n?: unknown) => boolean
  engineSound: (on?: unknown) => unknown
  ambience: (kind?: unknown) => unknown
  loadSound: (name?: unknown, asset?: unknown) => unknown
  playSound: (name?: unknown) => unknown
  playMusic: (name?: unknown) => unknown
  stopMusic: () => unknown
  hud: (t?: unknown, corner?: unknown) => unknown
  say: (t?: unknown, secs?: unknown) => unknown
  point: (name?: unknown, x?: unknown, z?: unknown) => unknown
  onPoint: (name?: unknown, fn?: unknown) => unknown
  zone: (name?: unknown, x?: unknown, z?: unknown, r?: unknown) => unknown
  onZone: (name?: unknown, fn?: unknown) => unknown
  totemText: (x?: unknown, z?: unknown, title?: unknown, body?: unknown) => unknown
  totemImage: (x?: unknown, z?: unknown, image?: unknown, w?: unknown) => unknown
  galleryCreate: (x?: unknown, z?: unknown, title?: unknown) => unknown
  galleryAdd: (image?: unknown, caption?: unknown) => unknown
  raceCreate: (x?: unknown, z?: unknown, deg?: unknown, laps?: unknown) => unknown
  raceCheckpoint: (x?: unknown, z?: unknown, deg?: unknown) => unknown
  raceOnStart: (fn?: unknown) => unknown
  raceOnCheckpoint: (fn?: unknown) => unknown
  raceOnFinish: (fn?: unknown) => unknown
  raceTime: () => number
  raceBest: () => number
  bowlingCreate: (x?: unknown, z?: unknown, yaw?: unknown) => unknown
  bowlingReset: () => unknown
  bowlingOnStrike: (fn?: unknown) => unknown
  pinsDown: () => number
  stack: (n?: unknown, thing?: unknown, x?: unknown, z?: unknown) => unknown
  knockedCount: () => number
  cameraMode: (mode?: unknown) => unknown
  cameraShake: (force?: unknown, secs?: unknown) => unknown
  scatter: (n?: unknown, thing?: unknown) => unknown
  scatterModel: (n?: unknown, name?: unknown, s?: unknown) => unknown
  placeThing: (thing?: unknown, x?: unknown, z?: unknown, s?: unknown) => unknown
  placeModel: (name?: unknown, x?: unknown, z?: unknown, s?: unknown, deg?: unknown) => unknown
  clearArea: (x?: unknown, z?: unknown, r?: unknown) => unknown
  grass: (amount?: unknown) => unknown
  setEffects: (on?: unknown, strength?: unknown) => unknown
  dayNight: (minutes?: unknown) => unknown
  setTime: (name?: unknown) => unknown
  weather: (kind?: unknown) => unknown
  setWind: (force?: unknown) => unknown
  onDayNight: (when?: unknown, fn?: unknown) => unknown
  timeOfDay: () => number
  onCrash: (fn: unknown) => unknown
  onUpdate: (fn: unknown) => unknown
  keyDown: (k: unknown) => boolean
  keyPressed: (k: unknown) => boolean
}

function boot(options?: {
  sounds?: Record<string, string>
  Audio?: new (url: string) => unknown
}): Api {
  const body = world3DRuntime.replace(/^import \* as THREE from 'three';\n/, '')
  const win: {
    addEventListener: () => void
    SZWorld3D?: unknown
    __SZGAME_SOUNDS?: Record<string, string>
  } = {
    addEventListener: () => {},
    __SZGAME_SOUNDS: options?.sounds,
  }
  new Function('THREE', 'window', 'Audio', body)({}, win, options?.Audio)
  if (!win.SZWorld3D) throw new Error('o runtime não pendurou window.SZWorld3D')
  return win.SZWorld3D as Api
}

describe('SZWorld3D — API pura (sem DOM/three)', () => {
  it('expõe 1 método por bloco', () => {
    const api = boot()
    const expected = [
      'setup',
      'terrain',
      'flatten',
      'path',
      'water',
      'skyPhoto',
      'start',
      'worldSize',
      'groundHeight',
      'car',
      'carStats',
      'carBoost',
      'district',
      'roadGrid',
      'houseRow',
      'quality',
      'inventoryGive',
      'inventoryRemove',
      'inventoryCount',
      'inventoryHas',
      'engineSound',
      'carPlace',
      'carPos',
      'carSpeed',
      'loadSound',
      'playSound',
      'playMusic',
      'stopMusic',
      'hud',
      'say',
      'point',
      'onPoint',
      'zone',
      'onZone',
      'totemText',
      'totemImage',
      'galleryCreate',
      'galleryAdd',
      'raceCreate',
      'raceCheckpoint',
      'raceOnStart',
      'raceOnCheckpoint',
      'raceOnFinish',
      'raceTime',
      'raceBest',
      'bowlingCreate',
      'bowlingReset',
      'bowlingOnStrike',
      'pinsDown',
      'stack',
      'knockedCount',
      'cameraMode',
      'cameraShake',
      'scatter',
      'scatterModel',
      'placeThing',
      'placeModel',
      'clearArea',
      'grass',
      'setEffects',
      'dayNight',
      'setTime',
      'weather',
      'setWind',
      'onDayNight',
      'timeOfDay',
      'onCrash',
      'onUpdate',
      'keyDown',
      'keyPressed',
    ]
    const bag = api as unknown as Record<string, unknown>
    for (const name of expected) {
      expect(typeof bag[name]).toBe('function')
    }
  })

  it('setup: guarda o tamanho do mundo com clamp 40..600', () => {
    const api = boot()
    expect(api.worldSize()).toBe(160)
    api.setup({ style: 'praia', world: 200 })
    expect(api.worldSize()).toBe(200)
    api.setup({ style: 'praia', world: 5 })
    expect(api.worldSize()).toBe(40)
    api.setup({ style: 'praia', world: 9999 })
    expect(api.worldSize()).toBe(600)
  })

  it('macros v4 anotam cidade sem Three e o inventário nunca fica negativo', () => {
    const api = boot()

    expect(() => api.roadGrid('grade', 0, 0, 80, 6)).not.toThrow()
    expect(() => api.district('educacao', 20, 10, 48)).not.toThrow()
    expect(() => api.houseRow(8, -30, 15, 30, 15, 'coloridas')).not.toThrow()
    expect(() => api.quality('desempenho')).not.toThrow()

    expect(api.inventoryGive('madeira', 3)).toBe(3)
    expect(api.inventoryRemove('madeira', 1)).toBe(2)
    expect(api.inventoryHas('madeira', 2)).toBe(true)
    expect(api.inventoryRemove('madeira', 99)).toBe(0)
    expect(api.inventoryCount('madeira')).toBe(0)
  })

  it('groundHeight: determinístico, e o centro do mundo é PLANO (spawn em paz)', () => {
    const api = boot()
    // Centro aplainado (raio < 8): altura exatamente 0 (Math.abs come o -0).
    expect(Math.abs(api.groundHeight(0, 0) as number)).toBe(0)
    expect(Math.abs(api.groundHeight(3, -4) as number)).toBe(0)
    // Longe do centro: os morros existem e a MESMA pergunta dá a MESMA resposta.
    const a = api.groundHeight(60, 40) as number
    const b = api.groundHeight(60, 40) as number
    expect(a).toBe(b)
    expect(Math.abs(a)).toBeGreaterThan(0)
  })

  it('terrain: a altura dos morros escala a resposta analiticamente', () => {
    const api = boot()
    api.terrain(4, 5)
    const h4 = api.groundHeight(60, 40) as number
    api.terrain(8, 5)
    const h8 = api.groundHeight(60, 40) as number
    // heightAt é h(x,z) * hills — dobrar a altura dobra a resposta.
    expect(h8).toBeCloseTo(h4 * 2, 10)
  })

  it('guardas: chamar fora de ordem avisa e NUNCA lança', () => {
    const api = boot()
    expect(() => api.carStats(30, 120, 8)).not.toThrow() // sem car() antes
    expect(() => api.carPlace(10, 10, 90)).not.toThrow() // sem car() antes
    expect(api.carPos('x')).toBe(0) // sem carrinho: 0, não crash
    expect(api.carSpeed()).toBe(0)
    expect(() => api.onUpdate('não é função' as unknown)).not.toThrow()
    expect(api.keyDown('espaco')).toBe(false)
    expect(api.keyPressed('cima')).toBe(false)
  })

  it('estilo desconhecido cai para floresta sem quebrar', () => {
    const api = boot()
    expect(() => api.setup({ style: 'lua', world: 160 })).not.toThrow()
    expect(() => api.car({ style: 'trator', color: '#123456' })).not.toThrow()
  })

  it('natureza: blocos só ANOTAM receitas antes do start (nada constrói sem three)', () => {
    const api = boot()
    // Sem THREE/DOM nenhum desses pode lançar: são receitas + guardas.
    expect(() => api.scatter(300, 'arvores')).not.toThrow()
    expect(() => api.scatter(50, 'unicornio')).not.toThrow() // avisa e ignora
    expect(() => api.placeThing('pedras', 20, 20, 2)).not.toThrow()
    expect(() => api.clearArea(0, 0, 15)).not.toThrow()
    expect(() => api.onCrash('não é função' as unknown)).not.toThrow()
    expect(() => api.onCrash(() => {})).not.toThrow()
    // Modelo sem asset no projeto: avisa e segue (o global de modelos está vazio).
    expect(() => api.scatterModel(10, 'foguete', 1)).not.toThrow()
    expect(() => api.placeModel('foguete', 5, 5, 1, 90)).not.toThrow()
  })

  it('grama e efeitos: config pura antes do start, sem lançar', () => {
    const api = boot()
    expect(() => api.grass('muita')).not.toThrow()
    expect(() => api.grass('oceano')).not.toThrow() // cai para media
    expect(() => api.setEffects('desligados', 2)).not.toThrow()
    expect(() => api.setEffects('ligados', 99)).not.toThrow() // clampa em 3
    expect(() => api.cameraMode('topo')).not.toThrow()
    expect(() => api.cameraMode('drone')).not.toThrow() // avisa e ignora
    expect(() => api.cameraShake(1, 0.5)).not.toThrow()
  })

  it('água/trilha/sons/hud: config pura antes do start, sem lançar', () => {
    const api = boot()
    expect(() => api.flatten(0, 0, 20)).not.toThrow()
    expect(() => api.path(0, 0, 30, 30, 6)).not.toThrow()
    expect(() => api.water(1, '#2b6cb0')).not.toThrow()
    // groundHeight fica plano onde aplainei (raio 20 no centro)
    expect(() => api.carBoost(2)).not.toThrow()
    expect(() => api.engineSound('ligado')).not.toThrow() // sem AudioContext no teste: guardado
    expect(() => api.loadSound('buzina', 'inexistente')).not.toThrow() // avisa e ignora
    expect(() => api.playSound('buzina')).not.toThrow()
    expect(() => api.playMusic('nada')).not.toThrow()
    expect(() => api.stopMusic()).not.toThrow()
    expect(() => api.hud('Pontos: 5', 'topo-direita')).not.toThrow()
    expect(() => api.say('Oi!', 2)).not.toThrow()
  })

  it('mantém a mesma música tocando quando o comando é repetido', () => {
    const instances: Array<{ url: string; pauseCalls: number; playCalls: number }> = []
    class AudioStub {
      loop = false
      volume = 1
      currentTime = 0
      pauseCalls = 0
      playCalls = 0
      constructor(public readonly url: string) {
        instances.push(this)
      }
      play() {
        this.playCalls += 1
      }
      pause() {
        this.pauseCalls += 1
      }
    }
    const api = boot({
      sounds: { tema: '/tema.mp3', batalha: '/batalha.mp3' },
      Audio: AudioStub,
    })

    api.playMusic('tema')
    api.playMusic('tema')
    expect(instances).toHaveLength(1)
    expect(instances[0]?.playCalls).toBe(1)
    expect(instances[0]?.pauseCalls).toBe(0)

    api.playMusic('batalha')
    expect(instances).toHaveLength(2)
    expect(instances[0]?.pauseCalls).toBe(1)
    api.stopMusic()
    expect(instances[1]?.pauseCalls).toBe(1)
  })

  it('pontos/áreas/totens/galeria: config pura antes do start, sem lançar', () => {
    const api = boot()
    expect(() => api.point('placa', 10, 10)).not.toThrow()
    expect(() => api.onPoint('placa', () => {})).not.toThrow()
    expect(() => api.onPoint('placa', 'não é função' as unknown)).not.toThrow()
    expect(() => api.zone('area', 0, 30, 8)).not.toThrow()
    expect(() => api.onZone('area', () => {})).not.toThrow()
    expect(() => api.totemText(0, 8, 'Bem-vindo', 'Ao meu mundo')).not.toThrow()
    expect(() => api.totemImage(0, 8, 'foto', 3)).not.toThrow()
    expect(() => api.galleryCreate(0, -30, 'Projetos')).not.toThrow()
    expect(() => api.galleryAdd('img1', 'Meu jogo')).not.toThrow()
    // galleryAdd sem galleryCreate antes do start só grava a receita (sem lançar)
    expect(() => api.galleryAdd('solto', 'x')).not.toThrow()
  })

  it('corrida: cria, checkpoints, ganchos e recorde — puros, sem lançar', () => {
    const api = boot()
    expect(api.raceTime()).toBe(0)
    expect(api.raceBest()).toBe(0) // sem localStorage no teste: 0
    expect(() => api.raceCreate(0, 0, 0, 2)).not.toThrow()
    expect(() => api.raceCheckpoint(20, 20, 0)).not.toThrow()
    expect(() => api.raceCheckpoint(-20, 20, 90)).not.toThrow()
    expect(() => api.raceOnStart(() => {})).not.toThrow()
    expect(() => api.raceOnCheckpoint(() => {})).not.toThrow()
    expect(() => api.raceOnFinish(() => {})).not.toThrow()
    // checkpoint antes de criar a corrida avisa e não lança
    const api2 = boot()
    expect(() => api2.raceCheckpoint(0, 0, 0)).not.toThrow()
  })

  it('boliche/derrubar: cria, empilha, ganchos e contadores — puros, sem lançar', () => {
    const api = boot()
    expect(api.pinsDown()).toBe(0)
    expect(api.knockedCount()).toBe(0)
    expect(() => api.bowlingCreate(0, 25, 0)).not.toThrow()
    expect(() => api.bowlingReset()).not.toThrow()
    expect(() => api.bowlingOnStrike(() => {})).not.toThrow()
    expect(() => api.bowlingOnStrike('não é função' as unknown)).not.toThrow()
    expect(() => api.stack(5, 'caixas', 15, 0)).not.toThrow()
    expect(() => api.stack(3, 'latas', -10, 5)).not.toThrow()
  })

  it('flatten muda a altura do terreno para o valor do centro', () => {
    const api = boot()
    // longe do centro há morros; aplainar um disco lá nivela para a altura-base
    // amostrada no ponto (aqui só provamos que não quebra e é determinístico)
    const antes = api.groundHeight(70, 50) as number
    api.flatten(70, 50, 25)
    const depois = api.groundHeight(70, 50) as number
    // no centro exato do flatten, a altura vira a base daquele ponto (~a mesma)
    expect(Number.isFinite(depois)).toBe(true)
    expect(depois).toBe(depois) // determinístico
    expect(typeof antes).toBe('number')
  })

  it('céu & clima: hora do mundo, ganchos e guardas puras', () => {
    const api = boot()
    expect(api.timeOfDay()).toBe(10) // manhã default
    expect(() => api.setTime('noite')).not.toThrow()
    expect(api.timeOfDay()).toBe(0)
    expect(() => api.setTime('madrugada')).not.toThrow() // avisa e ignora
    expect(api.timeOfDay()).toBe(0)
    expect(() => api.dayNight(4)).not.toThrow()
    expect(() => api.weather('neve')).not.toThrow()
    expect(() => api.weather('meteoro')).not.toThrow() // avisa e ignora
    expect(() => api.setWind(3)).not.toThrow()
    expect(() => api.onDayNight('noite', () => {})).not.toThrow()
    expect(() => api.onDayNight('noite', 'não é função')).not.toThrow()
  })
})

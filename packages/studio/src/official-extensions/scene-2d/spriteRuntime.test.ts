import { describe, expect, test } from 'bun:test'
import { SNOW_COURSE } from '../../examples/snowDescentAssets'
import { snowDescentSource } from '../../examples/snowDescentSource'
import type { SceneTwoDApi } from './contract'
import { sceneTwoDRuntime } from './runtime'
import type { SceneSprite, SpriteSceneController } from './spriteContract'
import type { SpriteSceneHost } from './spriteHostContract'
import { spriteSceneRuntime } from './spriteRuntime'

function harness() {
  const warnings: string[] = []
  const drawn: Array<{ sprite: SceneSprite; geometry: number[] }> = []
  const destroyed = new Set<SceneSprite>()
  const transforms: number[][] = []
  const backdrops: number[][] = []
  let imageSize = { width: 640, height: 720 }
  let state: ReturnType<SpriteSceneHost['state']> = 'playing'
  let direction = 0
  let lives = 3
  let restarts = 0
  const context = {
    save() {},
    restore() {},
    translate: (...v: number[]) => transforms.push(v),
    scale() {},
    drawImage(_image: unknown, ...rect: number[]) {
      backdrops.push(rect)
    },
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D
  const scene = new Function('host', `${sceneTwoDRuntime}; return createScene2D(host);`)({
    width: () => 640,
    height: () => 720,
    context: () => context,
    screen() {},
    clear() {},
    image: () => imageSize,
    camera: () => ({ x: 0, y: 0 }),
    warn: (s: string) => warnings.push(s),
  }) as SceneTwoDApi
  const host: SpriteSceneHost = {
    width: () => 640,
    height: () => 720,
    context: () => context,
    screen() {},
    image: () => imageSize,
    camera: () => ({ x: 0, y: 0 }),
    spriteAlive: (s) => !destroyed.has(s),
    moldName: () => '',
    copySprite: (s) => ({ ...s }),
    destroySprite: (s) => {
      destroyed.add(s)
    },
    drawSprite: (_ctx, s) => drawn.push({ sprite: s, geometry: [s.x, s.y, s.w, s.h] }),
    hitbox: (s) => s,
    motion() {},
    health: () => lives,
    setHealth: (_sprite, value) => {
      lives = value
    },
    hurt: (_s, amount) => {
      lives = Math.max(0, lives - amount)
    },
    animate() {},
    direction: () => direction,
    pointer: () => ({ x: 0, y: 0, down: false }),
    state: () => state,
    setState: (s) => {
      state = s
    },
    setPaused: (paused) => {
      state = paused ? 'paused' : 'playing'
    },
    restart: () => {
      restarts++
    },
    wake() {},
    invoke: (fn) => fn(),
    drawHud() {},
    warn: (message) => warnings.push(message),
  }
  const api = new Function(
    'host',
    'scene',
    `${spriteSceneRuntime}; return createSpriteScene(host, scene);`,
  )(host, scene) as SpriteSceneController
  const player = { x: 0, y: 0, w: 26, h: 42 }
  api.createSpriteTrack('neve')
  api.trackPlayer('neve', player, 3)
  api.trackTravel('neve', 320, 6600)
  return {
    api,
    host,
    scene,
    player,
    drawn,
    destroyed,
    warnings,
    transforms,
    backdrops,
    imageSize: (width: number, height: number) => {
      imageSize = { width, height }
    },
    direction: (v: number) => {
      direction = v
    },
    state: () => state,
    restarts: () => restarts,
  }
}
const star = (): SceneSprite => ({ x: 0, y: 0, w: 22, h: 22 })

test('ending a game stops every remaining track in the same simulation step', () => {
  const { api, state } = harness()
  api.sceneGameScreens('Teste', '')
  api.input('start')
  api.trackTravel('neve', 320, 1)
  api.createSpriteTrack('outra')
  api.trackPlayer('outra', star(), 1)
  api.trackTravel('outra', 100, 1000)
  const obstacle = star()
  api.putTrackSprite('outra', obstacle, 0, 1)
  api.onTrackEncounter('outra', obstacle, () => api.trackHurt('outra', 1))
  api.step(0.05)
  expect(state()).toBe('won')
  expect(api.trackPosition('outra', 'distance')).toBe(0)
})

for (const nextState of ['paused', 'won', 'lost'] as const) {
  for (const trigger of ['encounter', 'finish'] as const) {
    test(`${trigger}: native ${nextState} stops other tracks without ready screens`, () => {
      const { api, host, state } = harness()
      api.createSpriteTrack('outra')
      api.trackSpeed('outra', 100)
      const transition = () => host.setState(nextState)
      if (trigger === 'finish') {
        api.trackFinishLine('neve', 1)
        api.onTrackFinish('neve', transition)
      } else {
        const item = star()
        api.putTrackSprite('neve', item, 0, 1)
        api.onTrackEncounter('neve', item, transition)
      }
      api.step(0.05)
      expect(state()).toBe(nextState)
      expect(api.trackPosition('outra', 'distance')).toBe(0)
    })
  }
}

test('sprite decorations use the current camera, depth order and visibility in world and HUD passes', () => {
  const { api, host, drawn } = harness()
  const near = star(),
    far = star(),
    hidden = star()
  api.putTrackSprite('neve', near, 80, 400)
  api.putTrackSprite('neve', far, 80, 900)
  api.putTrackSprite('neve', hidden, 0, 5000)
  api.draw('back')
  const decorated: SceneSprite[] = []
  const boxes: unknown[] = []
  for (const sprite of [near, far, hidden]) {
    expect(
      api.decorate(sprite, (box) => {
        expect(drawn.at(-1)?.sprite).toBe(sprite)
        decorated.push(sprite)
        boxes.push(box)
      }),
    ).toBe(true)
  }
  // Change camera after requesting the overlay; it must follow this frame's geometry.
  api.step(0.5)
  host.camera = () => ({ x: 300, y: 200 })
  api.draw('world')
  expect(decorated).toEqual([far, near])
  expect(boxes).toEqual([api.bounds(far), api.bounds(near)])
  expect(api.bounds(hidden)).toBeNull()
  let hudBox: unknown
  expect(
    api.decorate(near, (box) => {
      hudBox = box
    }),
  ).toBe(true)
  expect(hudBox).toEqual(api.bounds(near))
  expect(
    api.decorate(star(), () => {
      throw new Error('ordinary sprite is drawn by its engine')
    }),
  ).toBe(false)
})

test('repositioning a followed sprite or a copy preserves its role, family and velocity', () => {
  const { api, player } = harness()
  api.putTrackSprite('neve', player, 40, 200)
  api.step(0.5)
  expect(api.trackPosition('neve', 'lateral')).toBe(40)
  expect(api.trackPosition('neve', 'distance')).toBe(360)
  const source = star()
  api.putTrackSprite('neve', source, 0, 800)
  api.repeatTrackSprite('neve', source, 2, 200, 'line')
  api.trackSpriteVelocity(source, 10, 0)
  const copies: SceneSprite[] = []
  api.forEachTrackSprite(source, (copy) => copies.push(copy))
  api.putTrackSprite('neve', copies[1]!, 80, 1200)
  api.step(1)
  expect(copies[1]!.x + copies[1]!.w / 2).toBe(90)
  let count = 0
  api.forEachTrackSprite(source, () => count++)
  expect(count).toBe(2)
})

for (const variant of ['g2d', 'gk'] as const) {
  test(`${variant}: the new blocks reconstruct all 108 placements of the original snow course`, () => {
    const { api, host } = harness()
    const sprites: SceneSprite[] = []
    const create = (options: Partial<SceneSprite> & Pick<SceneSprite, 'w' | 'h'>) => {
      const sprite = { x: 0, y: 0, ...options }
      sprites.push(sprite)
      return sprite
    }
    host.copySprite = create
    new Function(variant === 'g2d' ? 'SZGame2D' : 'SZGameKit', snowDescentSource(variant))({
      ...api,
      createSprite: create,
      createCharacter: create,
      setupStage() {},
      setup() {},
      setStageDescription() {},
      setHealth() {},
      setProperty() {},
      setScreenText() {},
      setPauseKey() {},
      onDrawHud() {},
      onGameClick() {},
    })
    const kinds: Record<string, string> = {
      'neve-estrela': 'star',
      'neve-bandeira': 'flag',
      'neve-gelo': 'ice',
      'neve-pinheiro': 'pine',
    }
    const course = sprites.flatMap((sprite) => {
      const kind = kinds[(sprite as SceneSprite & { image: string }).image]
      return kind
        ? [{ kind, x: sprite.x + sprite.w / 2, z: sprite.y, w: sprite.w, h: sprite.h }]
        : []
    })
    expect(course.sort((a, b) => a.z - b.z || a.x - b.x)).toEqual(
      [...SNOW_COURSE].sort((a, b) => a.z - b.z || a.x - b.x),
    )
  })
}

describe('sprites in an automatic perspective scene', () => {
  test('projects the same sprite without overwriting its geometry; paints far to near', () => {
    const { api, player, drawn } = harness()
    const near = star(),
      far = star()
    api.putTrackSprite('neve', near, -80, 600)
    api.putTrackSprite('neve', far, 80, 1000)
    const geometry = [near.x, near.y, near.w, near.h]
    api.draw('back')
    api.draw('world')
    expect(drawn.map((d) => d.sprite)).toEqual([far, near, player])
    expect(drawn[1]?.geometry).toEqual(geometry)
    expect([near.x, near.y, near.w, near.h]).toEqual(geometry)
    expect(api.bounds(player)).toEqual({ x: 287.5, y: 496.6, w: 65, h: 105 })
    expect(api.owns(near)).toBe(true)
  })

  test('collects only the encountered copy and does not call the event twice', () => {
    const { api, destroyed } = harness()
    const item = star()
    api.putTrackSprite('neve', item, 0, 100)
    api.repeatTrackSprite('neve', item, 3, 100, 'line')
    let hits = 0
    api.onTrackEncounter('neve', item, () => {
      hits++
      api.collectTrackItem()
      api.trackScore('neve', 1)
    })
    api.step(0.4)
    expect(hits).toBe(1)
    expect(destroyed.size).toBe(1)
    api.step(0)
    expect(hits).toBe(1)
    api.step(0.6)
    expect(hits).toBe(3)
    expect(api.spriteTrackValue('neve', 'score')).toBe(3)
    expect(destroyed.size).toBe(3)
  })

  test('detects an independently approaching sprite with a stationary player', () => {
    const { api } = harness()
    api.trackTravel('neve', 0, 6600)
    const item = star()
    api.putTrackSprite('neve', item, 0, 100)
    api.trackSpriteVelocity(item, 0, -200)
    let hits = 0
    api.onTrackEncounter('neve', item, () => {
      hits++
    })
    api.step(1)
    expect(hits).toBe(1)
    api.step(1)
    expect(hits).toBe(1)
  })

  test('interpolates lateral position at the moment of a swept encounter', () => {
    const { api, direction } = harness()
    api.trackControls('neve', 160, 200)
    const item = star()
    api.putTrackSprite('neve', item, 80, 160)
    direction(1)
    let hits = 0
    api.onTrackEncounter('neve', item, () => {
      hits++
    })
    api.step(1)
    expect(hits).toBe(1)
  })

  test('reset inside an encounter prevents the old track from dispatching more events', () => {
    const { api } = harness()
    const item = star()
    api.putTrackSprite('neve', item, 0, 100)
    api.repeatTrackSprite('neve', item, 3, 100, 'line')
    let hits = 0
    api.onTrackEncounter('neve', item, () => {
      hits++
      api.reset()
    })
    api.step(1)
    expect(hits).toBe(1)
    expect(api.active()).toBe(false)
    expect(api.owns(item)).toBe(false)
    expect(api.bounds(item)).toBeNull()
  })

  test('uses the engine state for start, pause and finish; finishes once', () => {
    const { api, state, restarts } = harness()
    api.sceneGameScreens('Corrida', 'Pegue estrelas')
    api.trackTravel('neve', 100, 100)
    let finished = 0
    api.onTrackFinish('neve', () => {
      finished++
    })
    api.step(1)
    expect(api.spriteTrackValue('neve', 'distance')).toBe(0)
    api.input('start')
    api.step(0.4)
    api.input('pause')
    api.step(1)
    expect(state()).toBe('paused')
    expect(api.spriteTrackValue('neve', 'distance')).toBe(40)
    api.input('start')
    api.step(1)
    api.step(1)
    expect(state()).toBe('won')
    expect(finished).toBe(1)
    api.input('start')
    expect(restarts()).toBe(1)
  })

  test('repeating includes the original, replaces previous copies and retains the selected pattern', () => {
    const { api, drawn } = harness()
    const item = star()
    api.putTrackSprite('neve', item, -80, 600)
    api.repeatTrackSprite('neve', item, 4, 100, 'weave')
    api.repeatTrackSprite('neve', item, 4, 100, 'weave')
    api.draw('world')
    const items = drawn.filter((d) => d.sprite !== item && d.sprite.w === 22)
    expect(items).toHaveLength(3)
    expect(items.map((d) => [d.sprite.x + 11, d.sprite.y])).toEqual([
      [0, 900],
      [80, 800],
      [0, 700],
    ])
  })
})

test('a long step dispatches encounters in travel order, and defeat stops later collections', () => {
  const { api, state } = harness()
  api.sceneGameScreens('Jogo', '')
  api.input('start')
  const laterStar = star(),
    earlierFlag = star()
  api.putTrackSprite('neve', laterStar, 0, 200)
  api.putTrackSprite('neve', earlierFlag, 0, 100)
  api.onTrackEncounter('neve', laterStar, () => api.trackScore('neve', 1))
  api.onTrackEncounter('neve', earlierFlag, () => api.trackHurt('neve', 3))
  api.step(1)
  expect(state()).toBe('lost')
  expect(api.spriteTrackValue('neve', 'score')).toBe(0)
})

test('invalid movement leaves a usable track and replacing it lets go of its old sprites', () => {
  const { api, player, destroyed } = harness()
  api.trackTravel('neve', Infinity, 0)
  api.step(1)
  expect(api.spriteTrackValue('neve', 'distance')).toBe(320)
  api.trackSpriteVelocity(player, 10, -20)
  api.step(1)
  expect(api.spriteTrackValue('neve', 'distance')).toBe(620)
  expect(api.spriteTrackValue('neve', 'lateral')).toBe(10)
  const item = star()
  api.putTrackSprite('neve', item, 0, 900)
  api.repeatTrackSprite('neve', item, 2, 100, 'line')
  const copies: SceneSprite[] = []
  api.forEachTrackSprite(item, (copy) => {
    if (copy !== item) copies.push(copy)
  })
  expect(copies).toHaveLength(1)
  api.createSpriteTrack('neve')
  // The child's own sprites survive, only detached; the copies the track made go away.
  expect(destroyed.has(player)).toBe(false)
  expect(destroyed.has(item)).toBe(false)
  expect(destroyed.has(copies[0]!)).toBe(true)
  expect(api.owns(player)).toBe(false)
  expect(api.owns(item)).toBe(false)
})
test('the same view asked every frame does not rebuild the track nor blame the track block', () => {
  const { api, warnings } = harness()
  for (let i = 0; i < 120; i++) {
    api.trackCameraView('neve', 'wide')
    api.step(1 / 60)
  }
  expect(warnings.filter((message) => message.includes('Criar pista'))).toEqual([])
  expect(api.spriteTrackValue('neve', 'distance')).toBeGreaterThan(0)
})
test('surviving copies remain addressable after the original was collected', () => {
  const { api, host } = harness()
  const item = star()
  const clones: SceneSprite[] = []
  host.copySprite = (s) => {
    const clone = { ...s }
    clones.push(clone)
    return clone
  }
  const animated: SceneSprite[] = []
  host.animate = (s) => {
    animated.push(s)
  }
  api.putTrackSprite('neve', item, 0, 100)
  api.repeatTrackSprite('neve', item, 3, 500, 'line')
  api.onTrackEncounter('neve', item, () => api.collectTrackItem())
  api.step(0.4)
  expect(host.spriteAlive(item)).toBe(false)
  api.sceneAnimation(item, 'sheet', 'blink', false)
  expect(animated).toEqual(clones)
})
test('surviving copies can change velocity after original collection', () => {
  const { api, host } = harness()
  const item = star()
  const clones: SceneSprite[] = []
  host.copySprite = (s) => {
    const clone = { ...s }
    clones.push(clone)
    return clone
  }
  api.putTrackSprite('neve', item, 0, 100)
  api.repeatTrackSprite('neve', item, 3, 500, 'line')
  api.onTrackEncounter('neve', item, () => api.collectTrackItem())
  api.step(0.4)
  const before = clones[0]!.x
  api.trackSpriteVelocity(item, 10, 0)
  api.step(0.1)
  expect(clones[0]!.x).toBeCloseTo(before + 1)
})
test('automatic cover accepts a small pixel-art image', () => {
  const { api, imageSize, warnings, backdrops } = harness()
  imageSize(4, 4)
  api.addSceneBackdrop('pixel', 'pixel', 'back')
  api.draw('back')
  expect(warnings).toEqual([])
  expect(backdrops).toContainEqual([-40, 0, 720, 720])
})

test('reset inside a per-copy action does not visit sprites from the old game', () => {
  const { api } = harness()
  const source = star()
  api.putTrackSprite('neve', source, 0, 400)
  api.repeatTrackSprite('neve', source, 3, 200, 'line')
  let calls = 0
  api.forEachTrackSprite(source, () => {
    calls++
    api.reset()
  })
  expect(calls).toBe(1)
  expect(api.active()).toBe(false)
})
test('moving sprites are independent of selecting a player', () => {
  const { api } = harness()
  api.createSpriteTrack('display')
  const item = star()
  api.putTrackSprite('display', item, 0, 400)
  api.trackSpriteVelocity(item, 0, -100)
  api.step(1)
  expect(item.y).toBe(300)
})

import { describe, expect, it } from 'bun:test'
import { behaviorStatements, type JSStatement, type SZIRInput, SZIRInputSchema } from '#ir'
import { collectHTMLAccessibilityIssues } from '../html/accessibility'
import { mapTwoDBootstrap } from '../official-extensions/map-2d/bootstrap'
import { assembleTilemapGameProject, type TilemapGamePayload } from './tilemapGame'

const DATA = 'data:image/png;base64,AAAA'
const SHEET = { dataUrl: DATA, width: 32, height: 16 }

function payload(over: Partial<TilemapGamePayload> = {}): TilemapGamePayload {
  return {
    name: 'minha-fase',
    dataUrl: DATA,
    width: 64,
    height: 48,
    tilemap: {
      tileSize: 16,
      cols: 4,
      rows: 3,
      grid: '0 1 1 0;. . 2 .;0 0 0 0',
      solid: [1],
      tileset: SHEET,
    },
    ...over,
  }
}

/** Monta o projeto e devolve o IR já garantido não-nulo (`Project.ir` é `SZIR | null`). */
function irOf(over: Partial<TilemapGamePayload> = {}): SZIRInput {
  const project = assembleTilemapGameProject(payload(over))
  if (!project?.ir) throw new Error('esperava projeto com IR')
  return project.ir
}

/** Corpo do loop `updateEachFrame` (statements desenhados por quadro). */
function loopBody(ir: SZIRInput): JSStatement[] {
  const loop = behaviorStatements(ir).find((s) => s.type === 'g2d:updateEachFrame')
  // ⚠️ Estreitar pelo TIPO, não por `'body' in loop`: existem statements cujo `body`
  // é TEXTO (o totem e a porta do Mundo 3D), e o `in` os traz junto.
  return loop?.type === 'g2d:updateEachFrame' ? loop.body : []
}

describe('assembleTilemapGameProject', () => {
  it('cenário completo nasce no início, traz os mapas das portas e conserva os vínculos de edição', () => {
    const scene = {
      version: 1,
      id: 'vila',
      name: 'vila',
      tileSize: 16,
      cols: 4,
      rows: 4,
      tilesets: [
        { id: 'ts', name: 'ts', image: DATA, columns: 1, count: 1, solid: [], platform: [] },
      ],
      layers: [
        {
          id: 'o',
          name: 'Objetos',
          kind: 'objects',
          visible: true,
          objects: [
            {
              id: 's',
              name: 'Início',
              type: '',
              shape: 'point',
              role: 'start',
              x: 48,
              y: 32,
              width: 0,
              height: 0,
              properties: {},
            },
          ],
        },
      ],
    }
    const project = assembleTilemapGameProject(
      payload({
        id: 'vila',
        libRevision: 7,
        scene,
        maps: [
          {
            id: 'cabana',
            libRevision: 8,
            name: 'cabana',
            dataUrl: DATA,
            width: 16,
            height: 16,
            scene: { ...scene, id: 'cabana', name: 'cabana' },
          },
        ],
      }),
    )
    expect(project?.assets?.map((a) => a.libId)).toEqual(['personal:vila', 'personal:cabana'])
    expect(project?.assets?.map((a) => a.libRevision)).toEqual([7, 8])
    const nodes = project?.ir ? behaviorStatements(project.ir) : []
    // O início e o tamanho são blocos que LEEM o cenário, nunca números do mapa de hoje.
    const lido = (method: string, axis: string) => ({
      type: 'g2d:sceneValue',
      method,
      args: [
        { type: 'str', value: 'mapa' },
        { type: 'str', value: axis },
      ],
    })
    expect(nodes.find((s) => s.type === 'g2d:createSprite')).toMatchObject({
      x: lido('mapSpawn', 'x'),
      y: lido('mapSpawn', 'y'),
    })
    expect(nodes.find((s) => s.type === 'g2d:createWorld')).toMatchObject({
      width: lido('mapSize', 'width'),
      height: lido('mapSize', 'height'),
    })
    const script = project?.files['script.js'] ?? ''
    expect(script).not.toMatch(/\b48\b/)
    expect(nodes.some((s) => s.type === 'g2d:sceneEvent' && s.method === 'mapArea')).toBe(true)
    expect(project?.blocksState).toBeTruthy()
    expect(collectHTMLAccessibilityIssues(project!.ir!.html)).toEqual([])
    expect(SZIRInputSchema.safeParse(project?.ir).success).toBe(true)
    expect(project?.files['script.js']).toContain('drawMapScene')
  })
  it('mudar o início no cenário muda onde o jogo começa, sem gerar o programa de novo', async () => {
    const cena = (x: number, y: number, cols: number) => ({
      version: 1,
      id: 'vila',
      name: 'vila',
      tileSize: 16,
      cols,
      rows: 4,
      tilesets: [
        { id: 'ts', name: 'ts', image: DATA, columns: 1, count: 1, solid: [], platform: [] },
      ],
      layers: [
        {
          id: 'o',
          name: 'Objetos',
          kind: 'objects',
          visible: true,
          objects: [
            {
              id: 's',
              name: 'Início',
              type: '',
              shape: 'point',
              role: 'start',
              x,
              y,
              width: 0,
              height: 0,
              properties: {},
            },
          ],
        },
      ],
    })
    const project = assembleTilemapGameProject(payload({ id: 'vila', scene: cena(48, 32, 4) }))
    const script = project?.files['script.js'] ?? ''
    const nome = project?.assets?.[0]?.name ?? ''
    // O MESMO texto de programa roda contra o motor de verdade, com o material de antes e o
    // de depois de a criança mexer no mapa.
    const motor = await mapTwoDBootstrap('g2d', { code: script })
    const jogar = (scene: unknown) => {
      const win = {
        addEventListener() {},
        performance: { now: () => 0 },
        devicePixelRatio: 1,
        __SZGAME_ASSET_META: { [nome]: { scene } },
        __SZGAME_ASSETS: { [nome]: DATA },
        __SZProjectLifecycle: { begin: () => ({}) },
      } as Record<string, unknown>
      new Function('window', 'requestAnimationFrame', motor)(win, () => 0)
      const real = win.SZGame2D as Record<string, (...args: unknown[]) => unknown>
      const nasceu: Array<{ x: number; y: number }> = []
      const mundos: unknown[][] = []
      const api = {
        ...real,
        onStart: (run: () => void) => run(),
        gameLoop: () => {},
        createSprite: (options: { x: number; y: number }) => {
          nasceu.push({ x: options.x, y: options.y })
          return real.createSprite?.(options)
        },
        createWorld: (...args: unknown[]) => {
          mundos.push(args)
          return real.createWorld?.(...args)
        },
      }
      new Function('SZGame2D', 'window', 'ctx', script)(api, win, null)
      return { nasceu, mundos }
    }
    const antes = jogar(cena(48, 32, 4))
    expect(antes.nasceu).toEqual([{ x: 48, y: 32 }])
    expect(antes.mundos).toEqual([[64, 64]])
    const depois = jogar(cena(8, 56, 10))
    expect(depois.nasceu).toEqual([{ x: 8, y: 56 }])
    expect(depois.mundos).toEqual([[160, 64]])
  })
  it('monta um projeto jogável: asset do mapa + IR do game-2d + blocos + arquivos', () => {
    const project = assembleTilemapGameProject(payload())
    if (!project?.ir) throw new Error('esperava projeto com IR')
    // asset do mapa com o metadado (nome batendo o que o bloco referencia)
    const asset = project.assets?.find((a) => a.name === 'minha-fase')
    expect(asset?.tilemap?.grid).toBe('0 1 1 0;. . 2 .;0 0 0 0')
    // a extensão game-2d entra instalada
    expect(project.installedExtensions.some((e) => e.id === 'game-2d')).toBe(true)
    // IR usa createTileMapFromAsset com o nome do asset
    const create = behaviorStatements(project.ir).find(
      (s) => s.type === 'g2d:createTileMapFromAsset',
    )
    expect(create && 'image' in create && create.image).toBe('minha-fase')
    const types = new Set(behaviorStatements(project.ir).map((statement) => statement.type))
    expect(types.has('g2d:createWorldFromTileMap')).toBe(true)
    expect(types.has('g2d:configureWorldCamera')).toBe(true)
    expect(project.files['script.js']).not.toContain('cameraFollow(')
    // arquivos gerados de verdade (o jogo roda)
    expect(project.files['script.js']?.length ?? 0).toBeGreaterThan(0)
    expect(project.blocksState).toBeTruthy()
  })

  it('mapa SEM plataforma → mecânica TOP-DOWN', () => {
    const body = loopBody(irOf())
    expect(body.some((s) => s.type === 'g2d:topDown')).toBe(true)
    expect(body.some((s) => s.type === 'g2d:platformer')).toBe(false)
  })

  it('mapa que COLOCA peça plataforma na grade → mecânica PLATAFORMA (gravidade + pulo)', () => {
    // a peça 2 está na grade ('…;. . 2 .;…') e NÃO é sólida (solid:[1]) → marcá-la
    // plataforma sobrevive ao sanitize (sólido venceria) e vira jogo de pulo.
    const base = payload().tilemap as Record<string, unknown>
    const body = loopBody(irOf({ tilemap: { ...base, platform: [2] } }))
    expect(body.some((s) => s.type === 'g2d:platformer')).toBe(true)
    expect(body.some((s) => s.type === 'g2d:topDown')).toBe(false)
  })

  it('tileset DECLARA plataforma mas a grade não COLOCA → segue TOP-DOWN', () => {
    // a peça 3 NÃO aparece na grade ('0 1 1 0;. . 2 .;0 0 0 0') → nada de gravidade.
    const base = payload().tilemap as Record<string, unknown>
    const body = loopBody(irOf({ tilemap: { ...base, platform: [3] } }))
    expect(body.some((s) => s.type === 'g2d:topDown')).toBe(true)
    expect(body.some((s) => s.type === 'g2d:platformer')).toBe(false)
  })

  it('com camada da frente: 2º tilemap desenhado DEPOIS do jogador', () => {
    const project = assembleTilemapGameProject(
      payload({
        tilemapFront: {
          tileSize: 16,
          cols: 4,
          rows: 3,
          grid: '. . . .;. . . .;5 . . 5',
          solid: [],
          tileset: SHEET,
        },
      }),
    )
    if (!project?.ir) throw new Error('esperava projeto com IR')
    // dois assets (mapa + mapa-frente)
    expect(project.assets?.length).toBe(2)
    expect(project.assets?.some((a) => a.name === 'minha-fase-frente')).toBe(true)
    // no loop: o mapa preparado da frente vem DEPOIS do drawSprite
    const body = loopBody(project.ir)
    const drawSpriteIdx = body.findIndex((s) => s.type === 'g2d:drawSprite')
    let frontDrawIdx = -1
    for (let i = 0; i < body.length; i++) {
      if (body[i]?.type === 'g2d:drawPreparedTileMap') frontDrawIdx = i
    }
    expect(frontDrawIdx).toBeGreaterThan(drawSpriteIdx)
  })

  it('mapa inválido (sem grade/folha) → null', () => {
    expect(assembleTilemapGameProject(payload({ tilemap: { tileSize: 16 } }))).toBeNull()
  })
})

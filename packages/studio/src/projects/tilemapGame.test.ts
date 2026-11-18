import { describe, expect, it } from 'bun:test'
import { behaviorStatements, type JSStatement, type SZIRInput, SZIRInputSchema } from '#ir'
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
    expect(nodes.find((s) => s.type === 'g2d:createSprite')).toMatchObject({ x: 48, y: 32 })
    expect(nodes.some((s) => s.type === 'g2d:sceneEvent' && s.method === 'mapArea')).toBe(true)
    expect(project?.blocksState).toBeTruthy()
    expect(SZIRInputSchema.safeParse(project?.ir).success).toBe(true)
    expect(project?.files['script.js']).toContain('drawMapScene')
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

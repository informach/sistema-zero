import { describe, expect, it } from 'bun:test'
import type { SZIR } from '#ir'
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
function irOf(over: Partial<TilemapGamePayload> = {}): SZIR {
  const project = assembleTilemapGameProject(payload(over))
  if (!project?.ir) throw new Error('esperava projeto com IR')
  return project.ir
}

/** Corpo do loop `updateEachFrame` (statements desenhados por quadro). */
function loopBody(ir: SZIR): SZIR['js'] {
  const loop = ir.js.find((s) => s.type === 'g2d:updateEachFrame')
  return loop && 'body' in loop ? loop.body : []
}

describe('assembleTilemapGameProject', () => {
  it('monta um projeto jogável: asset do mapa + IR do game-2d + blocos + arquivos', () => {
    const project = assembleTilemapGameProject(payload())
    if (!project?.ir) throw new Error('esperava projeto com IR')
    // asset do mapa com o metadado (nome batendo o que o bloco referencia)
    const asset = project.assets?.find((a) => a.name === 'minha-fase')
    expect(asset?.tilemap?.grid).toBe('0 1 1 0;. . 2 .;0 0 0 0')
    // a extensão game-2d entra instalada
    expect(project.installedExtensions.some((e) => e.id === 'game-2d')).toBe(true)
    // IR usa createTileMapFromAsset com o nome do asset
    const create = project.ir.js.find((s) => s.type === 'g2d:createTileMapFromAsset')
    expect(create && 'image' in create && create.image).toBe('minha-fase')
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
    // no loop: o drawTileMap da frente vem DEPOIS do drawSprite
    const body = loopBody(project.ir)
    const drawSpriteIdx = body.findIndex((s) => s.type === 'g2d:drawSprite')
    let frontDrawIdx = -1
    for (let i = 0; i < body.length; i++) {
      if (body[i]?.type === 'g2d:drawTileMap') frontDrawIdx = i
    }
    expect(frontDrawIdx).toBeGreaterThan(drawSpriteIdx)
  })

  it('mapa inválido (sem grade/folha) → null', () => {
    expect(assembleTilemapGameProject(payload({ tilemap: { tileSize: 16 } }))).toBeNull()
  })
})

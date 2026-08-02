import { describe, expect, it } from 'bun:test'
import { behaviorStatements, type JSStatement } from '#ir'
import { AVENTURA_GRID, AVENTURA_HEROI_SOURCE as SOURCE } from '../__gen_aventuraHeroi'
import { collectTypes } from '../__gen_dinoCorredor'
import { aventuraHeroiExample } from '../examples'
import { registerExampleContractTests, setupGameTwoDExampleTests } from './exampleContractHarness'

/**
 * Drift do exemplo "Aventura do Herói" — o degrau BÁSICO da família
 * Zelda-style Adventure (Clear Code). A IR embutida em examples/clearcode/aventuraHeroi.ts
 * foi GERADA pelo parser real a partir do SOURCE (que mora no
 * __gen_aventuraHeroi.ts, importado aqui para que fonte e teste NUNCA possam
 * divergir). O preparo do palco é injetado pelo wrapper `beginnerGameExample`
 * e conferido à parte.
 */

setupGameTwoDExampleTests()

describe('Exemplo Aventura do Herói — drift contra o parser real', () => {
  it('está registrado no manifest, é da extensão game-2d e embute os 2 assets', () => {
    expect(gameTwoDExamples).toContain(aventuraHeroiExample)
    expect(aventuraHeroiExample.ir.extensions).toEqual([{ extensionId: 'game-2d' }])
    expect(aventuraHeroiExample.name).toBe('Aventura do Herói')
    expect(aventuraHeroiExample.experience).toBe('game')
    // 100% procedural: os dois assets são SVGs minúsculos gerados.
    expect(aventuraHeroiExample.assets?.map((asset) => asset.name)).toEqual([
      'pecas-da-vila',
      'arvore',
    ])
    for (const asset of aventuraHeroiExample.assets ?? []) {
      expect(asset.dataUrl.startsWith('data:image/svg+xml;base64,')).toBe(true)
    }
  })

  registerExampleContractTests({
    example: aventuraHeroiExample,
    source: SOURCE,
    stage: { width: 480, height: 360, bg: '#7ec850' },
  })

  it('exercita a mecânica prometida do degrau básico', () => {
    const types = collectTypes(behaviorStatements(aventuraHeroiExample.ir))
    for (const t of [
      'g2d:createTileMap', // mundo em grade, com paredes sólidas
      'g2d:tileMapCollide',
      'g2d:cameraFollow', // mundo MAIOR que a tela
      'g2d:topDown', // movimento de vista de cima
      'g2d:setHitboxScale', // ⭐ colisão de dano perdoadora no herói
      'g2d:drawGroupByY', // ⭐ profundidade: o herói passa ATRÁS da árvore
      'g2d:breakTile', // ⭐ mato destrutível
      'g2d:tileAtSprite', // só quebra a peça de MATO (índice 2), nunca a parede
      'g2d:pruneOld', // ⭐ espada temporária (0,3s de vida)
      'g2d:emitParticles',
      'g2d:drawParticles',
      'g2d:defineEnemyType', // inimigos do kit, comportamento perseguir
      'g2d:spawnEnemy',
      'g2d:updateEnemyType',
      'g2d:drawEnemyType',
      'g2d:onEnemyDefeated',
      'g2d:hurtByEnemy', // dano no herói com i-frames (piscar)
      'g2d:isInvincible',
      'g2d:onGroupOverlap', // espada × inimigo
      'g2d:removeFromGroup',
      'g2d:keyDown', // a direção olhada vem das setas
      'g2d:flipSprite',
      'g2d:drawSpriteHealth', // corações
      'g2d:countGroup', // vitória = derrotar todos os guardiões
      'g2d:healthDepleted',
      'arrayPush', // o herói entra na LISTA do grupo do cenário
      'memberGet',
      'g2d:setScene',
      'g2d:showScreen',
      'g2d:restart',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // A espada REPETE a cada golpe: afterSeconds (one-shot) não serve aqui.
    expect(types.has('g2d:afterSeconds')).toBe(false)
  })

  it('o herói entra no MESMO grupo das árvores para o drawGroupByY valer entre eles', () => {
    const start = aventuraHeroiExample.ir.behavior.start
    const raw = JSON.stringify(start)
    // const pecasDoCenario = cenario.items (o grupo é só um objeto com a lista).
    expect(raw).toContain(
      '"type":"var","name":"pecasDoCenario","value":{"type":"memberGet","object":{"type":"var","name":"cenario"},"name":"items"}',
    )
    expect(raw).toContain(
      '"type":"arrayPush","arrayVar":"pecasDoCenario","value":{"type":"var","name":"heroi"}',
    )
    // As árvores são sprites de imagem do MESMO grupo.
    const trees = start.filter((statement) => statement.type === 'g2d:spawnImageInGroup')
    expect(trees.length).toBe(6)
    for (const tree of trees) {
      expect(JSON.stringify(tree)).toContain('"groupVar":"cenario"')
      expect(JSON.stringify(tree)).toContain('"image":"arvore"')
    }
    // E o grupo do cenário é desenhado ORDENADO PELA BASE (não pelo drawGroup).
    const rawLoops = JSON.stringify(aventuraHeroiExample.ir.behavior.loops)
    expect(rawLoops).toContain('"type":"g2d:drawGroupByY","groupVar":"cenario"')
    expect(rawLoops).not.toContain('"type":"g2d:drawGroup","groupVar":"cenario"')
  })

  it('espada temporária: nasce na direção olhada, vive 0,3s e NUNCA usa afterSeconds', () => {
    const raw = JSON.stringify(behaviorStatements(aventuraHeroiExample.ir))
    // pruneOld de 0,3s no grupo dos golpes.
    expect(raw).toContain(
      '"type":"g2d:pruneOld","groupVar":"golpes","seconds":{"type":"num","value":0.3}',
    )
    // A direção olhada mora em variáveis alimentadas pelas setas (keyDown).
    expect(raw).toContain('"type":"g2d:keyDown","key":"ArrowRight"')
    expect(raw).toContain('"type":"g2d:keyDown","key":"ArrowLeft"')
    expect(raw).toContain('"type":"g2d:keyDown","key":"ArrowUp"')
    expect(raw).toContain('"type":"g2d:keyDown","key":"ArrowDown"')
    expect(raw).toContain('"name":"miraX"')
    expect(raw).toContain('"name":"miraY"')
    // O golpe nasce a partir do CENTRO do herói somado à mira.
    expect(raw).toContain('"type":"g2d:centerX","spriteVar":"heroi"')
    expect(raw).toContain('"type":"g2d:centerY","spriteVar":"heroi"')
  })

  it('mato destrutível: quebra SÓ a peça 2, com ponto e partículas; a colisão é perdoadora', () => {
    const raw = JSON.stringify(behaviorStatements(aventuraHeroiExample.ir))
    // Só quebra quando o tile sob o golpe é o MATO (índice 2).
    expect(raw).toContain('"type":"g2d:tileAtSprite","mapVar":"mapa","spriteVar":"golpe"')
    expect(raw).toContain('"type":"g2d:breakTile","mapVar":"mapa","spriteVar":"golpe"')
    // ⭐ setHitboxScale ~80% no herói.
    expect(raw).toContain(
      '"type":"g2d:setHitboxScale","spriteVar":"heroi","percent":{"type":"num","value":80}',
    )
    // O mapa declara pedra E mato como sólidos (cortar o mato ABRE caminho).
    const tileMap = aventuraHeroiExample.ir.behavior.start.find(
      (statement): statement is Extract<JSStatement, { type: 'g2d:createTileMap' }> =>
        statement.type === 'g2d:createTileMap',
    )
    expect(tileMap?.solid).toBe('1 2')
    expect(tileMap?.grid).toBe(AVENTURA_GRID)
    // Mundo 40×30 células de 40px = 1600×1200, o MESMO retângulo da câmera.
    const rows = AVENTURA_GRID.split(';')
    expect(rows.length).toBe(30)
    for (const row of rows) {
      expect(row.split(' ').length).toBe(40)
    }
    expect(raw).toContain(
      '"type":"g2d:cameraFollow","spriteVar":"heroi","worldW":{"type":"num","value":1600},"worldH":{"type":"num","value":1200}',
    )
  })

  it('são 4 guardiões perseguidores; vitória ao derrotar todos, derrota sem vida', () => {
    const start = aventuraHeroiExample.ir.behavior.start
    const enemyType = start.find(
      (statement): statement is Extract<JSStatement, { type: 'g2d:defineEnemyType' }> =>
        statement.type === 'g2d:defineEnemyType',
    )
    expect(enemyType?.behavior).toBe('perseguidor')
    expect(start.filter((statement) => statement.type === 'g2d:spawnEnemy').length).toBe(4)
    const raw = JSON.stringify(behaviorStatements(aventuraHeroiExample.ir))
    expect(raw).toContain('"type":"g2d:countGroup","groupVar":"guarda"')
    expect(raw).toContain('"type":"g2d:healthDepleted","spriteVar":"heroi"')
    // Dano no herói com i-frames: hurtByEnemy + o gate "não está invencível".
    expect(raw).toContain('"type":"g2d:hurtByEnemy","spriteVar":"heroi","enemyVar":"inimigo"')
    expect(raw).toContain('"type":"g2d:isInvincible","spriteVar":"heroi"')
  })
})

import { gameTwoDExamples } from '../exampleCatalog'

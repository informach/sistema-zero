import { describe, expect, it } from 'bun:test'
import { compileStatements, generateCSS, generateHTML } from '#generators'
import { G3D_STATEMENT_TYPES, type JSStatement, SZIRSchema } from '#ir'
import { crossingExample, dodgeExample, rotatingCubeExample } from '../examples'
import { gameThreeDExtension } from '../index'

describe('game-3d — definição da extensão', () => {
  it('manifest válido, no catálogo, nível avançado, com three via CDN', () => {
    expect(gameThreeDExtension.manifest.id).toBe('game-3d')
    expect(gameThreeDExtension.minLevel).toBe('avancado')
    expect(gameThreeDExtension.runtime.esmImports?.three).toMatch(/^https:\/\/esm\.sh\/three@/)
    // NÃO declara 'network' (senão liberaria o fetch do aluno via permissionGuard).
    expect(gameThreeDExtension.manifest.permissions).not.toContain('network')
  })

  it('a bootstrap é um módulo (importa three)', () => {
    expect(gameThreeDExtension.runtime.bootstrapScript).toMatch(/^import \* as THREE from 'three'/)
    expect(gameThreeDExtension.runtime.bootstrapScript).toContain('window.SZGame3D')
  })
})

describe('game-3d — gerador', () => {
  const gen = (stmt: JSStatement) => compileStatements([stmt], 0)

  it('cena, fundo, câmera, cubo e esfera', () => {
    expect(gen({ type: 'g3d:createScene', canvasId: 'tela', varName: 'cena' })).toBe(
      'const cena = SZGame3D.createScene("tela");',
    )
    expect(gen({ type: 'g3d:setBackground', worldVar: 'cena', color: '#000' })).toBe(
      'SZGame3D.setBackground(cena, "#000");',
    )
    expect(
      gen({ type: 'g3d:createBox', varName: 'caixa', worldVar: 'cena', size: 2, color: '#0ff' }),
    ).toBe('const caixa = SZGame3D.createBox(cena, { size: 2, color: "#0ff" });')
    expect(
      gen({
        type: 'g3d:createSphere',
        varName: 'bola',
        worldVar: 'cena',
        radius: 0.5,
        color: '#fa0',
      }),
    ).toBe('const bola = SZGame3D.createSphere(cena, { radius: 0.5, color: "#fa0" });')
  })

  it('posição, rotação (com expressão) e loop de animação', () => {
    expect(
      gen({
        type: 'g3d:setRotation',
        objVar: 'caixa',
        x: { type: 'var', name: 'angulo' },
        y: { type: 'num', value: 0 },
        z: { type: 'num', value: 0 },
      }),
    ).toBe('SZGame3D.setRotation(caixa, angulo, 0, 0);')
    const anim = gen({
      type: 'g3d:animate',
      worldVar: 'cena',
      body: [{ type: 'consoleLog', value: { type: 'num', value: 1 } }],
    })
    expect(anim).toContain('SZGame3D.animate(cena, () => {')
    expect(anim).toContain('console.log(1);')
  })

  it('caixa, física, câmera-segue e Kit Desvie geram SZGame3D.*', () => {
    expect(
      gen({
        type: 'g3d:createBlock',
        varName: 'chao',
        worldVar: 'cena',
        width: 10,
        height: 0.5,
        depth: 50,
        color: '#0369a1',
      }),
    ).toBe(
      'const chao = SZGame3D.createBlock(cena, { width: 10, height: 0.5, depth: 50, color: "#0369a1" });',
    )
    expect(
      gen({
        type: 'g3d:setVelocity',
        objVar: 'p',
        x: { type: 'num', value: 0 },
        y: { type: 'num', value: 1 },
        z: { type: 'num', value: 0 },
      }),
    ).toBe('SZGame3D.setVelocity(p, 0, 1, 0);')
    expect(gen({ type: 'g3d:applyGravity', objVar: 'p', groundVar: 'chao' })).toBe(
      'SZGame3D.applyGravity(p, chao);',
    )
    expect(gen({ type: 'g3d:controlWithKeys', objVar: 'p', speed: 0.05 })).toBe(
      'SZGame3D.controlWithKeys(p, 0.05);',
    )
    expect(gen({ type: 'g3d:cameraFollow', worldVar: 'cena', objVar: 'p' })).toBe(
      'SZGame3D.cameraFollow(cena, p);',
    )
    expect(gen({ type: 'g3d:createGroup', varName: 'inimigos' })).toBe(
      'const inimigos = SZGame3D.createGroup();',
    )
    expect(
      gen({
        type: 'g3d:runEnemies',
        worldVar: 'cena',
        groupVar: 'inimigos',
        groundVar: 'chao',
        every: 200,
        speed: 0.02,
      }),
    ).toBe('SZGame3D.runEnemies(cena, inimigos, chao, 200, 0.02);')
    expect(gen({ type: 'g3d:stop', worldVar: 'cena' })).toBe('SZGame3D.stop(cena);')
    // Pergunta (booleano) dentro de um "se": gera SZGame3D.keyDown(...).
    expect(gen({ type: 'if', cond: { type: 'g3d:keyDown', key: 'Space' }, then: [] })).toContain(
      'SZGame3D.keyDown("Space")',
    )
  })

  it('Travessia + grade genérica geram SZGame3D.*', () => {
    expect(gen({ type: 'g3d:createCrossingScene', canvasId: 'jogo', varName: 'mundo' })).toBe(
      'const mundo = SZGame3D.createCrossingScene("jogo");',
    )
    expect(
      gen({ type: 'g3d:createCrosser', varName: 'jogador', worldVar: 'mundo', color: '#fff' }),
    ).toBe('const jogador = SZGame3D.createCrosser(mundo, { color: "#fff" });')
    expect(
      gen({
        type: 'g3d:addRow',
        worldVar: 'mundo',
        rowIndex: { type: 'num', value: 5 },
        kind: 'car',
        direction: 'right',
        speed: 150,
      }),
    ).toBe('SZGame3D.addRow(mundo, 5, "car", "right", 150);')
    expect(gen({ type: 'g3d:crosserStep', objVar: 'jogador', worldVar: 'mundo' })).toBe(
      'SZGame3D.crosserStep(jogador, mundo);',
    )
    expect(gen({ type: 'g3d:moveTraffic', worldVar: 'mundo' })).toBe('SZGame3D.moveTraffic(mundo);')
    expect(gen({ type: 'g3d:isometricCamera', worldVar: 'mundo', followVar: 'jogador' })).toBe(
      'SZGame3D.isometricCamera(mundo, jogador);',
    )
    expect(gen({ type: 'g3d:isometricCamera', worldVar: 'mundo', followVar: '' })).toBe(
      'SZGame3D.isometricCamera(mundo, null);',
    )
    expect(gen({ type: 'g3d:gridStep', objVar: 'p' })).toBe('SZGame3D.gridStep(p);')
    expect(gen({ type: 'g3d:moveAcross', groupVar: 'carros', speed: 0.1, min: -10, max: 10 })).toBe(
      'SZGame3D.moveAcross(carros, 0.1, -10, 10);',
    )
    expect(
      gen({
        type: 'g3d:gridPosition',
        objVar: 'p',
        row: { type: 'num', value: 3 },
        col: { type: 'num', value: -2 },
      }),
    ).toBe('SZGame3D.gridPosition(p, 3, -2);')
    expect(
      gen({ type: 'if', cond: { type: 'g3d:crosserHit', objVar: 'p', worldVar: 'm' }, then: [] }),
    ).toContain('SZGame3D.crosserHit(p, m)')
    expect(
      gen({ type: 'if', cond: { type: 'g3d:touchesBox', objVar: 'p', groupVar: 'g' }, then: [] }),
    ).toContain('SZGame3D.touchesBox(p, g)')
  })
})

describe('game-3d — schema e exemplo', () => {
  it('todos os g3d:* estão em G3D_STATEMENT_TYPES', () => {
    for (const t of [
      'g3d:createScene',
      'g3d:setBackground',
      'g3d:setCameraPosition',
      'g3d:createBox',
      'g3d:createSphere',
      'g3d:setPosition',
      'g3d:setRotation',
      'g3d:animate',
      'g3d:createBlock',
      'g3d:setVelocity',
      'g3d:jump',
      'g3d:applyGravity',
      'g3d:controlWithKeys',
      'g3d:setScale',
      'g3d:cameraFollow',
      'g3d:createGroup',
      'g3d:runEnemies',
      'g3d:stop',
      'g3d:createCrossingScene',
      'g3d:createCrosser',
      'g3d:crosserMove',
      'g3d:crosserStep',
      'g3d:crosserReset',
      'g3d:gridPosition',
      'g3d:addRow',
      'g3d:generateRows',
      'g3d:moveTraffic',
      'g3d:isometricCamera',
      'g3d:gridStep',
      'g3d:gridMove',
      'g3d:moveAcross',
    ]) {
      expect(G3D_STATEMENT_TYPES.has(t)).toBe(true)
    }
  })

  it('o exemplo "Cubo girando" tem IR válido', () => {
    expect(SZIRSchema.safeParse(rotatingCubeExample.ir).success).toBe(true)
  })

  it('o exemplo "Desvie dos blocos" tem IR válido', () => {
    expect(SZIRSchema.safeParse(dodgeExample.ir).success).toBe(true)
  })

  it('o exemplo "Atravesse a rua" tem IR válido', () => {
    expect(SZIRSchema.safeParse(crossingExample.ir).success).toBe(true)
  })
})

describe('HTML/CSS para o HUD (melhorias)', () => {
  it('canvas aceita classe (<canvas class="game">)', () => {
    const html = generateHTML({ body: [{ type: 'canvas', id: 'jogo', class: 'game' }] })
    expect(html).toContain('class="game"')
    expect(html).toContain('id="jogo"')
  })

  it('@media aceita altura (min-height)', () => {
    const css = generateCSS([{ type: 'mediaQuery', feature: 'min-height', px: 425, rules: [] }])
    expect(css).toContain('@media (min-height: 425px)')
  })

  it('fonte do Google vira @import no topo', () => {
    const css = generateCSS([{ type: 'googleFont', family: 'Press Start 2P' }])
    expect(css).toContain('@import')
    expect(css).toContain('Press+Start+2P')
  })
})

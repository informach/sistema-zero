import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import {
  crossingExample,
  dodgeExample,
  rotatingCubeExample,
} from '../../official-extensions/game-3d/examples'
import { parseJS } from '../js'

function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) for (const item of value) collectTypes(item, out)
  else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.type === 'string') out.add(obj.type)
    for (const v of Object.values(obj)) collectTypes(v, out)
  }
  return out
}

describe('parseJS — helpers SZGame3D.* (game-3d)', () => {
  it('reconhece createScene / createBox / createSphere como var-init', () => {
    expect(parseJS('const cena = SZGame3D.createScene("tela");')).toEqual([
      { type: 'g3d:createScene', canvasId: 'tela', varName: 'cena' },
    ])
    // createBox: gerador emite (world, { size, color })
    expect(parseJS('const caixa = SZGame3D.createBox(cena, { size: 2, color: "#0ff" });')).toEqual([
      { type: 'g3d:createBox', varName: 'caixa', worldVar: 'cena', size: 2, color: '#0ff' },
    ])
    // createSphere: gerador emite (world, { radius, color })
    expect(
      parseJS('const bola = SZGame3D.createSphere(cena, { radius: 0.5, color: "#fa0" });'),
    ).toEqual([
      { type: 'g3d:createSphere', varName: 'bola', worldVar: 'cena', radius: 0.5, color: '#fa0' },
    ])
  })

  it('reconhece os comandos de uma linha (setBackground/setCameraPosition/setPosition/setRotation)', () => {
    expect(parseJS('SZGame3D.setBackground(cena, "#0b1020");')).toEqual([
      { type: 'g3d:setBackground', worldVar: 'cena', color: '#0b1020' },
    ])
    expect(parseJS('SZGame3D.setCameraPosition(cena, 0, 2, 5);')).toEqual([
      {
        type: 'g3d:setCameraPosition',
        worldVar: 'cena',
        x: { type: 'num', value: 0 },
        y: { type: 'num', value: 2 },
        z: { type: 'num', value: 5 },
      },
    ])
    expect(parseJS('SZGame3D.setPosition(caixa, 1, 0, 0);')).toEqual([
      {
        type: 'g3d:setPosition',
        objVar: 'caixa',
        x: { type: 'num', value: 1 },
        y: { type: 'num', value: 0 },
        z: { type: 'num', value: 0 },
      },
    ])
    expect(parseJS('SZGame3D.setRotation(caixa, angulo, angulo, 0);')).toEqual([
      {
        type: 'g3d:setRotation',
        objVar: 'caixa',
        x: { type: 'var', name: 'angulo' },
        y: { type: 'var', name: 'angulo' },
        z: { type: 'num', value: 0 },
      },
    ])
  })

  it('reconhece SZGame3D.animate(cena, () => {…}) com corpo mapeado', () => {
    const ir = parseJS('SZGame3D.animate(cena, () => { SZGame3D.setRotation(caixa, 0, 0, 0); });')
    expect(ir).toEqual([
      {
        type: 'g3d:animate',
        worldVar: 'cena',
        body: [
          {
            type: 'g3d:setRotation',
            objVar: 'caixa',
            x: { type: 'num', value: 0 },
            y: { type: 'num', value: 0 },
            z: { type: 'num', value: 0 },
          },
        ],
      },
    ])
  })
})

describe('roundtrip do rotatingCubeExample (gerar → parsear)', () => {
  it('o código gerado volta a virar blocos g3d (sem degradar para rawJS)', () => {
    const code = compileStatements(rotatingCubeExample.ir.js, 0)
    const ir = parseJS(code)
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    for (const expected of ['g3d:createScene', 'g3d:createBox', 'g3d:animate', 'g3d:setRotation']) {
      expect(types.has(expected)).toBe(true)
    }
  })
})

describe('parseJS — física, Kit Desvie e câmera (game-3d)', () => {
  it('reconhece createBlock / createGroup como var-init', () => {
    expect(
      parseJS(
        'const chao = SZGame3D.createBlock(cena, { width: 10, height: 0.5, depth: 50, color: "#0369a1" });',
      ),
    ).toEqual([
      {
        type: 'g3d:createBlock',
        varName: 'chao',
        worldVar: 'cena',
        width: 10,
        height: 0.5,
        depth: 50,
        color: '#0369a1',
      },
    ])
    expect(parseJS('const inimigos = SZGame3D.createGroup();')).toEqual([
      { type: 'g3d:createGroup', varName: 'inimigos' },
    ])
  })

  it('reconhece física, câmera e Kit como comandos de uma linha', () => {
    expect(parseJS('SZGame3D.setVelocity(jogador, 0, 1, 0);')).toEqual([
      {
        type: 'g3d:setVelocity',
        objVar: 'jogador',
        x: { type: 'num', value: 0 },
        y: { type: 'num', value: 1 },
        z: { type: 'num', value: 0 },
      },
    ])
    expect(parseJS('SZGame3D.jump(jogador, 0.08);')).toEqual([
      { type: 'g3d:jump', objVar: 'jogador', force: { type: 'num', value: 0.08 } },
    ])
    expect(parseJS('SZGame3D.applyGravity(jogador, chao);')).toEqual([
      { type: 'g3d:applyGravity', objVar: 'jogador', groundVar: 'chao' },
    ])
    expect(parseJS('SZGame3D.controlWithKeys(jogador, 0.05);')).toEqual([
      { type: 'g3d:controlWithKeys', objVar: 'jogador', speed: 0.05 },
    ])
    expect(parseJS('SZGame3D.setScale(caixa, 2);')).toEqual([
      { type: 'g3d:setScale', objVar: 'caixa', factor: { type: 'num', value: 2 } },
    ])
    expect(parseJS('SZGame3D.cameraFollow(cena, jogador);')).toEqual([
      { type: 'g3d:cameraFollow', worldVar: 'cena', objVar: 'jogador' },
    ])
    expect(parseJS('SZGame3D.runEnemies(cena, inimigos, chao, 200, 0.02);')).toEqual([
      {
        type: 'g3d:runEnemies',
        worldVar: 'cena',
        groupVar: 'inimigos',
        groundVar: 'chao',
        every: 200,
        speed: 0.02,
      },
    ])
    expect(parseJS('SZGame3D.stop(cena);')).toEqual([{ type: 'g3d:stop', worldVar: 'cena' }])
  })

  it('reconhece as perguntas (keyDown/collides/hitAny) dentro de um "se"', () => {
    expect(
      parseJS('if (SZGame3D.keyDown("Space")) { SZGame3D.jump(jogador, 0.08); }'),
    ).toMatchObject([{ type: 'if', cond: { type: 'g3d:keyDown', key: 'Space' } }])
    expect(parseJS('if (SZGame3D.collides(jogador, chao)) { SZGame3D.stop(cena); }')).toMatchObject(
      [{ type: 'if', cond: { type: 'g3d:collides', aVar: 'jogador', bVar: 'chao' } }],
    )
    expect(
      parseJS('if (SZGame3D.hitAny(jogador, inimigos)) { SZGame3D.stop(cena); }'),
    ).toMatchObject([
      { type: 'if', cond: { type: 'g3d:hitAny', objVar: 'jogador', groupVar: 'inimigos' } },
    ])
  })
})

describe('roundtrip do dodgeExample (gerar → parsear)', () => {
  it('o jogo "Desvie dos blocos" volta a virar blocos g3d (sem degradar para rawJS)', () => {
    const code = compileStatements(dodgeExample.ir.js, 0)
    const ir = parseJS(code)
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    for (const expected of [
      'g3d:createScene',
      'g3d:setBackground',
      'g3d:setCameraPosition',
      'g3d:createBox',
      'g3d:createBlock',
      'g3d:setPosition',
      'g3d:createGroup',
      'g3d:animate',
      'g3d:controlWithKeys',
      'g3d:jump',
      'g3d:applyGravity',
      'g3d:cameraFollow',
      'g3d:runEnemies',
      'g3d:keyDown',
      'g3d:hitAny',
      'g3d:stop',
    ]) {
      expect(types.has(expected)).toBe(true)
    }
  })
})

describe('parseJS — Travessia + grade genérica (game-3d)', () => {
  it('reconhece createCrossingScene / createCrosser como var-init', () => {
    expect(parseJS('const mundo = SZGame3D.createCrossingScene("jogo");')).toEqual([
      { type: 'g3d:createCrossingScene', canvasId: 'jogo', varName: 'mundo' },
    ])
    expect(parseJS('const jogador = SZGame3D.createCrosser(mundo, { color: "#fff" });')).toEqual([
      { type: 'g3d:createCrosser', varName: 'jogador', worldVar: 'mundo', color: '#fff' },
    ])
  })

  it('reconhece os comandos do Kit Travessia e da grade genérica', () => {
    expect(parseJS('SZGame3D.crosserMove(jogador, "forward");')).toEqual([
      { type: 'g3d:crosserMove', objVar: 'jogador', direction: 'forward' },
    ])
    expect(parseJS('SZGame3D.crosserStep(jogador, mundo);')).toEqual([
      { type: 'g3d:crosserStep', objVar: 'jogador', worldVar: 'mundo' },
    ])
    expect(parseJS('SZGame3D.crosserReset(jogador, mundo);')).toEqual([
      { type: 'g3d:crosserReset', objVar: 'jogador', worldVar: 'mundo' },
    ])
    expect(parseJS('SZGame3D.addRow(mundo, 5, "car", "right", 150);')).toEqual([
      {
        type: 'g3d:addRow',
        worldVar: 'mundo',
        rowIndex: { type: 'num', value: 5 },
        kind: 'car',
        direction: 'right',
        speed: 150,
      },
    ])
    expect(parseJS('SZGame3D.generateRows(mundo, 20);')).toEqual([
      { type: 'g3d:generateRows', worldVar: 'mundo', count: 20 },
    ])
    expect(parseJS('SZGame3D.moveTraffic(mundo);')).toEqual([
      { type: 'g3d:moveTraffic', worldVar: 'mundo' },
    ])
    expect(parseJS('SZGame3D.isometricCamera(mundo, jogador);')).toEqual([
      { type: 'g3d:isometricCamera', worldVar: 'mundo', followVar: 'jogador' },
    ])
    expect(parseJS('SZGame3D.isometricCamera(mundo, null);')).toEqual([
      { type: 'g3d:isometricCamera', worldVar: 'mundo', followVar: '' },
    ])
    expect(parseJS('SZGame3D.gridStep(jogador);')).toEqual([
      { type: 'g3d:gridStep', objVar: 'jogador' },
    ])
    expect(parseJS('SZGame3D.gridMove(jogador, "left");')).toEqual([
      { type: 'g3d:gridMove', objVar: 'jogador', direction: 'left' },
    ])
    expect(parseJS('SZGame3D.moveAcross(carros, 0.1, -10, 10);')).toEqual([
      { type: 'g3d:moveAcross', groupVar: 'carros', speed: 0.1, min: -10, max: 10 },
    ])
    expect(parseJS('SZGame3D.gridPosition(caixa, 3, -2);')).toEqual([
      {
        type: 'g3d:gridPosition',
        objVar: 'caixa',
        row: { type: 'num', value: 3 },
        col: { type: 'num', value: -2 },
      },
    ])
  })

  it('reconhece as perguntas crosserHit / touchesBox / crosserRow em posição de valor', () => {
    expect(
      parseJS('if (SZGame3D.crosserHit(jogador, mundo)) { SZGame3D.moveTraffic(mundo); }'),
    ).toMatchObject([
      { type: 'if', cond: { type: 'g3d:crosserHit', objVar: 'jogador', worldVar: 'mundo' } },
    ])
    expect(
      parseJS('if (SZGame3D.touchesBox(jogador, carros)) { SZGame3D.moveTraffic(mundo); }'),
    ).toMatchObject([
      { type: 'if', cond: { type: 'g3d:touchesBox', objVar: 'jogador', groupVar: 'carros' } },
    ])
    expect(parseJS('let p = SZGame3D.crosserRow(jogador);')).toMatchObject([
      { type: 'var', name: 'p', value: { type: 'g3d:crosserRow', objVar: 'jogador' } },
    ])
  })
})

describe('roundtrip do crossingExample (gerar → parsear)', () => {
  it('o jogo "Atravesse a rua" volta a virar blocos g3d (sem degradar para rawJS)', () => {
    const code = compileStatements(crossingExample.ir.js, 0)
    const ir = parseJS(code)
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    for (const expected of [
      'g3d:createCrossingScene',
      'g3d:createCrosser',
      'g3d:generateRows',
      'g3d:animate',
      'g3d:crosserStep',
      'g3d:moveTraffic',
      'g3d:crosserRow',
      'g3d:crosserHit',
      'g3d:crosserMove',
      'g3d:crosserReset',
    ]) {
      expect(types.has(expected)).toBe(true)
    }
  })
})

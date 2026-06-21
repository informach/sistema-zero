import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import {
  crossingExample,
  dodgeExample,
  nightExample,
  raceExample,
  rotatingCubeExample,
  shapesExample,
  stackExample,
  swarmExample,
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

  it('createFullscreenScene: var-init com cor e round-trip (gerar → parsear)', () => {
    expect(parseJS('const cena = SZGame3D.createFullscreenScene("#102030");')).toEqual([
      { type: 'g3d:createFullscreenScene', varName: 'cena', bg: '#102030' },
    ])
    // Sem o argumento de cor (código antigo) → cor de fundo padrão.
    const ir = parseJS('const cena = SZGame3D.createFullscreenScene();')
    expect(ir).toEqual([{ type: 'g3d:createFullscreenScene', varName: 'cena', bg: '#0b1020' }])
    const code = compileStatements(ir, 0)
    expect(code).toContain('SZGame3D.createFullscreenScene("#0b1020")')
    expect(parseJS(code)).toEqual(ir)
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

describe('roundtrip do shapesExample (gerar → parsear)', () => {
  it('o "Boneco de formas" volta a virar blocos g3d (sem degradar para rawJS)', () => {
    const code = compileStatements(shapesExample.ir.js, 0)
    const ir = parseJS(code)
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    for (const expected of [
      'g3d:createPlane',
      'g3d:createModel',
      'g3d:createSphere',
      'g3d:createCone',
      'g3d:createCylinder',
      'g3d:setMaterial',
      'g3d:addToModel',
    ]) {
      expect(types.has(expected)).toBe(true)
    }
  })
})

describe('roundtrip do nightExample (gerar → parsear)', () => {
  it('a "Noite enevoada" volta a virar blocos g3d (sem degradar para rawJS)', () => {
    const code = compileStatements(nightExample.ir.js, 0)
    const ir = parseJS(code)
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    for (const expected of [
      'g3d:setSky',
      'g3d:setFog',
      'g3d:setShadows',
      'g3d:addSunLight',
      'g3d:addPointLight',
    ]) {
      expect(types.has(expected)).toBe(true)
    }
  })
})

describe('roundtrip do swarmExample (gerar → parsear)', () => {
  it('o "Enxame que gira" volta a virar blocos g3d (incl. o "para cada" com corpo)', () => {
    const code = compileStatements(swarmExample.ir.js, 0)
    const ir = parseJS(code)
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    for (const expected of [
      'g3d:createSwarm',
      'g3d:spawnInSwarm',
      'g3d:setVisible',
      'g3d:forEachInSwarm',
      'g3d:rotateBy',
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

describe('parseJS — Corrida + genéricos top-down (game-3d)', () => {
  it('reconhece createRaceScene / createRaceCar como var-init', () => {
    expect(parseJS('const mundo = SZGame3D.createRaceScene("pista");')).toEqual([
      { type: 'g3d:createRaceScene', canvasId: 'pista', varName: 'mundo' },
    ])
    expect(parseJS('const carro = SZGame3D.createRaceCar(mundo, { color: "#ef2d56" });')).toEqual([
      { type: 'g3d:createRaceCar', varName: 'carro', worldVar: 'mundo', color: '#ef2d56' },
    ])
  })

  it('reconhece os comandos de corrida e os genéricos', () => {
    expect(parseJS('SZGame3D.topCamera(mundo, carro);')).toEqual([
      { type: 'g3d:topCamera', worldVar: 'mundo', followVar: 'carro' },
    ])
    expect(parseJS('SZGame3D.topCamera(mundo, null);')).toEqual([
      { type: 'g3d:topCamera', worldVar: 'mundo', followVar: '' },
    ])
    expect(parseJS('SZGame3D.moveInCircle(planeta, 7, 0.02);')).toEqual([
      { type: 'g3d:moveInCircle', objVar: 'planeta', radius: 7, speed: 0.02 },
    ])
    expect(parseJS('SZGame3D.createRaceTrack(mundo);')).toEqual([
      { type: 'g3d:createRaceTrack', worldVar: 'mundo' },
    ])
    expect(parseJS('SZGame3D.raceStep(carro, mundo);')).toEqual([
      { type: 'g3d:raceStep', objVar: 'carro', worldVar: 'mundo' },
    ])
    expect(parseJS('SZGame3D.raceControl(carro, "accelerate");')).toEqual([
      { type: 'g3d:raceControl', objVar: 'carro', mode: 'accelerate' },
    ])
    expect(parseJS('SZGame3D.runRivals(mundo);')).toEqual([
      { type: 'g3d:runRivals', worldVar: 'mundo' },
    ])
    expect(parseJS('SZGame3D.raceReset(carro, mundo);')).toEqual([
      { type: 'g3d:raceReset', objVar: 'carro', worldVar: 'mundo' },
    ])
  })

  it('reconhece as perguntas de corrida/genéricas em posição de valor', () => {
    expect(parseJS('let d = SZGame3D.distanceTo(carro, rival);')).toMatchObject([
      { type: 'var', name: 'd', value: { type: 'g3d:distanceTo', aVar: 'carro', bVar: 'rival' } },
    ])
    expect(
      parseJS('if (SZGame3D.isNear(carro, rival, 2)) { SZGame3D.runRivals(mundo); }'),
    ).toMatchObject([
      { type: 'if', cond: { type: 'g3d:isNear', aVar: 'carro', bVar: 'rival', dist: 2 } },
    ])
    expect(
      parseJS('if (SZGame3D.raceHit(carro, mundo)) { SZGame3D.runRivals(mundo); }'),
    ).toMatchObject([
      { type: 'if', cond: { type: 'g3d:raceHit', objVar: 'carro', worldVar: 'mundo' } },
    ])
    expect(parseJS('let v = SZGame3D.raceLaps(carro);')).toMatchObject([
      { type: 'var', name: 'v', value: { type: 'g3d:raceLaps', objVar: 'carro' } },
    ])
  })
})

describe('roundtrip do raceExample (gerar → parsear)', () => {
  it('o jogo "Corrida maluca" volta a virar blocos g3d (sem degradar para rawJS)', () => {
    const code = compileStatements(raceExample.ir.js, 0)
    const ir = parseJS(code)
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    for (const expected of [
      'g3d:createRaceScene',
      'g3d:createRaceTrack',
      'g3d:createRaceCar',
      'g3d:animate',
      'g3d:raceStep',
      'g3d:runRivals',
      'g3d:raceLaps',
      'g3d:raceHit',
      'g3d:raceControl',
      'g3d:raceReset',
    ]) {
      expect(types.has(expected)).toBe(true)
    }
  })
})

describe('parseJS — Empilhar + genéricos de movimento (game-3d)', () => {
  it('reconhece createStackScene como var-init', () => {
    expect(parseJS('const torre = SZGame3D.createStackScene("jogo");')).toEqual([
      { type: 'g3d:createStackScene', canvasId: 'jogo', varName: 'torre' },
    ])
  })

  it('reconhece os comandos de empilhar e os genéricos (incl. número negativo)', () => {
    expect(parseJS('SZGame3D.fall(peca);')).toEqual([{ type: 'g3d:fall', objVar: 'peca' }])
    expect(parseJS('SZGame3D.slideBetween(plataforma, "x", -5, 5, 0.05);')).toEqual([
      { type: 'g3d:slideBetween', objVar: 'plataforma', axis: 'x', min: -5, max: 5, speed: 0.05 },
    ])
    expect(parseJS('SZGame3D.spin(moeda, "y", 0.03);')).toEqual([
      { type: 'g3d:spin', objVar: 'moeda', axis: 'y', speed: 0.03 },
    ])
    expect(parseJS('SZGame3D.createStackTower(torre);')).toEqual([
      { type: 'g3d:createStackTower', worldVar: 'torre' },
    ])
    expect(parseJS('SZGame3D.stackDrop(torre);')).toEqual([
      { type: 'g3d:stackDrop', worldVar: 'torre' },
    ])
    expect(parseJS('SZGame3D.stackStep(torre);')).toEqual([
      { type: 'g3d:stackStep', worldVar: 'torre' },
    ])
    expect(parseJS('SZGame3D.stackReset(torre);')).toEqual([
      { type: 'g3d:stackReset', worldVar: 'torre' },
    ])
  })

  it('reconhece as perguntas de empilhar em posição de valor', () => {
    expect(parseJS('let p = SZGame3D.stackScore(torre);')).toMatchObject([
      { type: 'var', name: 'p', value: { type: 'g3d:stackScore', worldVar: 'torre' } },
    ])
    expect(
      parseJS('if (SZGame3D.stackGameOver(torre)) { SZGame3D.stackReset(torre); }'),
    ).toMatchObject([{ type: 'if', cond: { type: 'g3d:stackGameOver', worldVar: 'torre' } }])
  })
})

describe('roundtrip do stackExample (gerar → parsear)', () => {
  it('o jogo "Torre maluca" volta a virar blocos g3d (sem degradar para rawJS)', () => {
    const code = compileStatements(stackExample.ir.js, 0)
    const ir = parseJS(code)
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    for (const expected of [
      'g3d:createStackScene',
      'g3d:createStackTower',
      'g3d:animate',
      'g3d:stackStep',
      'g3d:stackScore',
      'g3d:stackGameOver',
      'g3d:stackDrop',
      'g3d:stackReset',
    ]) {
      expect(types.has(expected)).toBe(true)
    }
  })
})

describe('parseJS — Posição & direção (genéricos)', () => {
  it('reconhece os getters (posição/rotação/escala/dt) em posição de valor', () => {
    expect(parseJS('let v = SZGame3D.getPos(jogador, "y");')).toMatchObject([
      { type: 'var', name: 'v', value: { type: 'g3d:getPos', objVar: 'jogador', axis: 'y' } },
    ])
    expect(parseJS('let r = SZGame3D.getRot(jogador, "x");')).toMatchObject([
      { type: 'var', name: 'r', value: { type: 'g3d:getRot', objVar: 'jogador', axis: 'x' } },
    ])
    expect(parseJS('let s = SZGame3D.getScale(caixa);')).toMatchObject([
      { type: 'var', name: 's', value: { type: 'g3d:getScale', objVar: 'caixa' } },
    ])
    expect(parseJS('let d = SZGame3D.dt(cena);')).toMatchObject([
      { type: 'var', name: 'd', value: { type: 'g3d:dt', worldVar: 'cena' } },
    ])
  })

  it('um getter aninha numa conta dentro de "se"', () => {
    expect(
      parseJS('if (SZGame3D.getPos(jogador, "y") < 0) { SZGame3D.stop(cena); }'),
    ).toMatchObject([
      {
        type: 'if',
        cond: {
          type: 'binop',
          op: '<',
          left: { type: 'g3d:getPos', objVar: 'jogador', axis: 'y' },
          right: { type: 'num', value: 0 },
        },
      },
    ])
  })

  it('reconhece mover/girar relativo e suavizar', () => {
    expect(parseJS('SZGame3D.moveBy(jogador, 1, 0, 2);')).toEqual([
      {
        type: 'g3d:moveBy',
        objVar: 'jogador',
        x: { type: 'num', value: 1 },
        y: { type: 'num', value: 0 },
        z: { type: 'num', value: 2 },
      },
    ])
    expect(parseJS('SZGame3D.rotateBy(jogador, "y", 0.05);')).toEqual([
      { type: 'g3d:rotateBy', objVar: 'jogador', axis: 'y', amount: { type: 'num', value: 0.05 } },
    ])
    expect(parseJS('SZGame3D.moveTowards(alvo, 0, 5, 0, 0.2);')).toEqual([
      {
        type: 'g3d:moveTowards',
        objVar: 'alvo',
        x: { type: 'num', value: 0 },
        y: { type: 'num', value: 5 },
        z: { type: 'num', value: 0 },
        factor: 0.2,
      },
    ])
  })
})

describe('parseJS — Olhar & apontar (genéricos)', () => {
  it('reconhece olhar/apontar/andar-para-frente/face-velocity', () => {
    expect(parseJS('SZGame3D.lookAtObject(canhao, alvo);')).toEqual([
      { type: 'g3d:lookAtObject', aVar: 'canhao', bVar: 'alvo' },
    ])
    expect(parseJS('SZGame3D.lookAtPoint(jogador, 0, 1, 0);')).toEqual([
      {
        type: 'g3d:lookAtPoint',
        objVar: 'jogador',
        x: { type: 'num', value: 0 },
        y: { type: 'num', value: 1 },
        z: { type: 'num', value: 0 },
      },
    ])
    expect(parseJS('SZGame3D.moveForward(jogador, 0.1);')).toEqual([
      { type: 'g3d:moveForward', objVar: 'jogador', dist: { type: 'num', value: 0.1 } },
    ])
    expect(parseJS('SZGame3D.faceVelocity(nave);')).toEqual([
      { type: 'g3d:faceVelocity', objVar: 'nave' },
    ])
  })

  it('angleTo aninha em posição de valor', () => {
    expect(parseJS('let a = SZGame3D.angleTo(jogador, alvo);')).toMatchObject([
      { type: 'var', name: 'a', value: { type: 'g3d:angleTo', aVar: 'jogador', bVar: 'alvo' } },
    ])
  })
})

describe('parseJS — Mira & clique (raycast)', () => {
  it('reconhece os valores de mira/clique/chão', () => {
    expect(parseJS('let o = SZGame3D.pickAtMouse(cena);')).toMatchObject([
      { type: 'var', name: 'o', value: { type: 'g3d:pickAtMouse', worldVar: 'cena' } },
    ])
    expect(
      parseJS('if (SZGame3D.pointerOver(cena, botao)) { SZGame3D.stop(cena); }'),
    ).toMatchObject([
      { type: 'if', cond: { type: 'g3d:pointerOver', worldVar: 'cena', objVar: 'botao' } },
    ])
    expect(parseJS('let a = SZGame3D.aimAhead(cena, jogador, 50);')).toMatchObject([
      {
        type: 'var',
        name: 'a',
        value: { type: 'g3d:aimAhead', worldVar: 'cena', objVar: 'jogador', dist: 50 },
      },
    ])
    expect(parseJS('if (SZGame3D.onGround(cena, jogador)) { SZGame3D.stop(cena); }')).toMatchObject(
      [{ type: 'if', cond: { type: 'g3d:onGround', worldVar: 'cena', objVar: 'jogador' } }],
    )
    expect(parseJS('let h = SZGame3D.groundHeight(cena, jogador);')).toMatchObject([
      {
        type: 'var',
        name: 'h',
        value: { type: 'g3d:groundHeight', worldVar: 'cena', objVar: 'jogador' },
      },
    ])
  })
})

describe('parseJS — Física avançada (corpo/sólidos/presets)', () => {
  it('reconhece corpo, sólido, stepBody, presets e empurrão', () => {
    expect(parseJS('SZGame3D.body(jogador, -0.02);')).toEqual([
      { type: 'g3d:body', objVar: 'jogador', gravity: -0.02 },
    ])
    expect(parseJS('SZGame3D.setSolid(chao);')).toEqual([{ type: 'g3d:setSolid', objVar: 'chao' }])
    expect(parseJS('SZGame3D.stepBody(jogador, cena);')).toEqual([
      { type: 'g3d:stepBody', objVar: 'jogador', worldVar: 'cena' },
    ])
    expect(parseJS('SZGame3D.platformerControls(jogador, cena, 0.08, 0.18);')).toEqual([
      {
        type: 'g3d:platformerControls',
        objVar: 'jogador',
        worldVar: 'cena',
        speed: 0.08,
        jump: 0.18,
      },
    ])
    expect(parseJS('SZGame3D.fpsControls(jogador, cena, 0.1);')).toEqual([
      { type: 'g3d:fpsControls', objVar: 'jogador', worldVar: 'cena', speed: 0.1 },
    ])
    expect(parseJS('SZGame3D.resolveCollision(jogador, parede);')).toEqual([
      { type: 'g3d:resolveCollision', aVar: 'jogador', bVar: 'parede' },
    ])
  })
})

describe('parseJS — Câmera viva (FPS/orbital/3ª pessoa/FOV)', () => {
  it('reconhece as câmeras vivas', () => {
    expect(parseJS('SZGame3D.fpsCamera(cena, jogador);')).toEqual([
      { type: 'g3d:fpsCamera', worldVar: 'cena', objVar: 'jogador' },
    ])
    expect(parseJS('SZGame3D.orbitCamera(cena, jogador);')).toEqual([
      { type: 'g3d:orbitCamera', worldVar: 'cena', objVar: 'jogador' },
    ])
    expect(parseJS('SZGame3D.thirdPersonCamera(cena, jogador, 6, 3);')).toEqual([
      { type: 'g3d:thirdPersonCamera', worldVar: 'cena', objVar: 'jogador', dist: 6, height: 3 },
    ])
    expect(parseJS('SZGame3D.cameraLookAt(cena, jogador);')).toEqual([
      { type: 'g3d:cameraLookAt', worldVar: 'cena', objVar: 'jogador' },
    ])
    expect(parseJS('SZGame3D.setFOV(cena, 75);')).toEqual([
      { type: 'g3d:setFOV', worldVar: 'cena', deg: 75 },
    ])
  })

  it('Fase 6 — formas, materiais, texturas e modelo fazem round-trip', () => {
    expect(
      parseJS(
        'const cil = SZGame3D.createCylinder(cena, { radius: 0.5, height: 2, color: "#22d3ee" });',
      ),
    ).toEqual([
      {
        type: 'g3d:createCylinder',
        varName: 'cil',
        worldVar: 'cena',
        radius: 0.5,
        height: 2,
        color: '#22d3ee',
      },
    ])
    expect(
      parseJS('const ch = SZGame3D.createPlane(cena, { width: 10, depth: 8, color: "#67c240" });'),
    ).toEqual([
      {
        type: 'g3d:createPlane',
        varName: 'ch',
        worldVar: 'cena',
        width: 10,
        depth: 8,
        color: '#67c240',
      },
    ])
    expect(
      parseJS(
        'const anel = SZGame3D.createTorus(cena, { radius: 1, tube: 0.3, color: "#a78bfa" });',
      ),
    ).toEqual([
      {
        type: 'g3d:createTorus',
        varName: 'anel',
        worldVar: 'cena',
        radius: 1,
        tube: 0.3,
        color: '#a78bfa',
      },
    ])
    expect(parseJS('const m = SZGame3D.createModel(cena);')).toEqual([
      { type: 'g3d:createModel', varName: 'm', worldVar: 'cena' },
    ])
    expect(parseJS('SZGame3D.setColor(obj, "#ff5577");')).toEqual([
      { type: 'g3d:setColor', objVar: 'obj', color: '#ff5577' },
    ])
    expect(parseJS('SZGame3D.setOpacity(obj, 0.5);')).toEqual([
      { type: 'g3d:setOpacity', objVar: 'obj', opacity: 0.5 },
    ])
    expect(parseJS('SZGame3D.setMaterial(obj, "metal");')).toEqual([
      { type: 'g3d:setMaterial', objVar: 'obj', kind: 'metal' },
    ])
    expect(parseJS('SZGame3D.setTexture(obj, "grama");')).toEqual([
      { type: 'g3d:setTexture', objVar: 'obj', asset: 'grama' },
    ])
    expect(parseJS('SZGame3D.setVisible(obj, "hide");')).toEqual([
      { type: 'g3d:setVisible', objVar: 'obj', mode: 'hide' },
    ])
    expect(parseJS('SZGame3D.remove(cena, obj);')).toEqual([
      { type: 'g3d:removeObject', worldVar: 'cena', objVar: 'obj' },
    ])
    expect(parseJS('SZGame3D.addToModel(modelo, peca);')).toEqual([
      { type: 'g3d:addToModel', modelVar: 'modelo', partVar: 'peca' },
    ])
  })

  it('Fase 7 — luz e céu fazem round-trip', () => {
    expect(parseJS('SZGame3D.addAmbientLight(cena, "#ffffff", 0.6);')).toEqual([
      { type: 'g3d:addAmbientLight', worldVar: 'cena', color: '#ffffff', intensity: 0.6 },
    ])
    expect(parseJS('SZGame3D.addSunLight(cena, "#fff8e1", 0.9);')).toEqual([
      { type: 'g3d:addSunLight', worldVar: 'cena', color: '#fff8e1', intensity: 0.9 },
    ])
    expect(parseJS('SZGame3D.addPointLight(cena, "#ffd27f", 1, 0, 2, 0);')).toEqual([
      {
        type: 'g3d:addPointLight',
        worldVar: 'cena',
        color: '#ffd27f',
        intensity: 1,
        x: 0,
        y: 2,
        z: 0,
      },
    ])
    expect(parseJS('SZGame3D.setFog(cena, "#9ca3af", 1, 30);')).toEqual([
      { type: 'g3d:setFog', worldVar: 'cena', color: '#9ca3af', near: 1, far: 30 },
    ])
    expect(parseJS('SZGame3D.setSky(cena, "#1e3a8a", "#93c5fd");')).toEqual([
      { type: 'g3d:setSky', worldVar: 'cena', top: '#1e3a8a', bottom: '#93c5fd' },
    ])
    expect(parseJS('SZGame3D.setShadows(cena, "on");')).toEqual([
      { type: 'g3d:setShadows', worldVar: 'cena', mode: 'on' },
    ])
  })

  it('Fase 8 — enxames e som fazem round-trip (incl. forEachInSwarm com corpo)', () => {
    expect(parseJS('const e = SZGame3D.createSwarm(cena);')).toEqual([
      { type: 'g3d:createSwarm', varName: 'e', worldVar: 'cena' },
    ])
    expect(parseJS('SZGame3D.spawnInSwarm(e, modelo, 1, 2, 3);')).toEqual([
      { type: 'g3d:spawnInSwarm', swarmVar: 'e', originalVar: 'modelo', x: 1, y: 2, z: 3 },
    ])
    expect(parseJS('SZGame3D.removeFromSwarm(e, item);')).toEqual([
      { type: 'g3d:removeFromSwarm', swarmVar: 'e', itemVar: 'item' },
    ])
    expect(parseJS('SZGame3D.pruneSwarm(e, "y", -10, 10);')).toEqual([
      { type: 'g3d:pruneSwarm', swarmVar: 'e', axis: 'y', min: -10, max: 10 },
    ])
    expect(parseJS('SZGame3D.playNote(440, 200);')).toEqual([
      { type: 'g3d:playNote', freq: 440, ms: 200 },
    ])
    expect(parseJS('SZGame3D.playEffect("coin");')).toEqual([
      { type: 'g3d:playEffect', kind: 'coin' },
    ])
    // O hat com corpo: o "para cada" volta a virar bloco com o corpo dentro.
    expect(
      parseJS('SZGame3D.forEachInSwarm(e, (item) => { SZGame3D.removeFromSwarm(e, item); });'),
    ).toEqual([
      {
        type: 'g3d:forEachInSwarm',
        swarmVar: 'e',
        itemName: 'item',
        body: [{ type: 'g3d:removeFromSwarm', swarmVar: 'e', itemVar: 'item' }],
      },
    ])
  })
})

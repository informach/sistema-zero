import { describe, expect, it } from 'bun:test'
import { compileStatements, generateCSS, generateHTML } from '#generators'
import { G3D_STATEMENT_TYPES, type JSStatement, SZIRSchema } from '#ir'
import {
  crossingExample,
  dodgeExample,
  nightExample,
  raceExample,
  rotatingCubeExample,
  shapesExample,
  stackExample,
  swarmExample,
} from '../examples'
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

  it('Corrida + genéricos top-down geram SZGame3D.*', () => {
    expect(gen({ type: 'g3d:createRaceScene', canvasId: 'pista', varName: 'mundo' })).toBe(
      'const mundo = SZGame3D.createRaceScene("pista");',
    )
    expect(gen({ type: 'g3d:createRaceTrack', worldVar: 'mundo' })).toBe(
      'SZGame3D.createRaceTrack(mundo);',
    )
    expect(
      gen({ type: 'g3d:createRaceCar', varName: 'carro', worldVar: 'mundo', color: '#ef2d56' }),
    ).toBe('const carro = SZGame3D.createRaceCar(mundo, { color: "#ef2d56" });')
    expect(gen({ type: 'g3d:raceStep', objVar: 'carro', worldVar: 'mundo' })).toBe(
      'SZGame3D.raceStep(carro, mundo);',
    )
    expect(gen({ type: 'g3d:runRivals', worldVar: 'mundo' })).toBe('SZGame3D.runRivals(mundo);')
    expect(gen({ type: 'g3d:raceControl', objVar: 'carro', mode: 'accelerate' })).toBe(
      'SZGame3D.raceControl(carro, "accelerate");',
    )
    expect(gen({ type: 'g3d:topCamera', worldVar: 'mundo', followVar: 'carro' })).toBe(
      'SZGame3D.topCamera(mundo, carro);',
    )
    expect(gen({ type: 'g3d:topCamera', worldVar: 'mundo', followVar: '' })).toBe(
      'SZGame3D.topCamera(mundo, null);',
    )
    expect(gen({ type: 'g3d:moveInCircle', objVar: 'p', radius: 7, speed: 0.02 })).toBe(
      'SZGame3D.moveInCircle(p, 7, 0.02);',
    )
    expect(
      gen({ type: 'if', cond: { type: 'g3d:raceHit', objVar: 'c', worldVar: 'm' }, then: [] }),
    ).toContain('SZGame3D.raceHit(c, m)')
    expect(
      gen({ type: 'if', cond: { type: 'g3d:isNear', aVar: 'a', bVar: 'b', dist: 2 }, then: [] }),
    ).toContain('SZGame3D.isNear(a, b, 2)')
  })

  it('Empilhar + genéricos de movimento geram SZGame3D.*', () => {
    expect(gen({ type: 'g3d:createStackScene', canvasId: 'jogo', varName: 'torre' })).toBe(
      'const torre = SZGame3D.createStackScene("jogo");',
    )
    expect(gen({ type: 'g3d:createStackTower', worldVar: 'torre' })).toBe(
      'SZGame3D.createStackTower(torre);',
    )
    expect(gen({ type: 'g3d:stackDrop', worldVar: 'torre' })).toBe('SZGame3D.stackDrop(torre);')
    expect(gen({ type: 'g3d:stackStep', worldVar: 'torre' })).toBe('SZGame3D.stackStep(torre);')
    expect(gen({ type: 'g3d:stackReset', worldVar: 'torre' })).toBe('SZGame3D.stackReset(torre);')
    expect(gen({ type: 'g3d:fall', objVar: 'peca' })).toBe('SZGame3D.fall(peca);')
    expect(
      gen({ type: 'g3d:slideBetween', objVar: 'p', axis: 'x', min: -5, max: 5, speed: 0.05 }),
    ).toBe('SZGame3D.slideBetween(p, "x", -5, 5, 0.05);')
    expect(gen({ type: 'g3d:spin', objVar: 'm', axis: 'y', speed: 0.03 })).toBe(
      'SZGame3D.spin(m, "y", 0.03);',
    )
    expect(
      gen({ type: 'if', cond: { type: 'g3d:stackGameOver', worldVar: 'torre' }, then: [] }),
    ).toContain('SZGame3D.stackGameOver(torre)')
    expect(
      gen({
        type: 'setProperty',
        targetId: 'score',
        property: 'textContent',
        value: { type: 'g3d:stackScore', worldVar: 'torre' },
      }),
    ).toContain('SZGame3D.stackScore(torre)')
  })

  it('Posição & direção: getters, relativo e suavizar geram SZGame3D.*', () => {
    expect(
      gen({
        type: 'g3d:moveBy',
        objVar: 'p',
        x: { type: 'num', value: 1 },
        y: { type: 'num', value: 0 },
        z: { type: 'num', value: 2 },
      }),
    ).toBe('SZGame3D.moveBy(p, 1, 0, 2);')
    expect(
      gen({ type: 'g3d:rotateBy', objVar: 'p', axis: 'y', amount: { type: 'num', value: 0.05 } }),
    ).toBe('SZGame3D.rotateBy(p, "y", 0.05);')
    expect(
      gen({
        type: 'g3d:moveTowards',
        objVar: 'p',
        x: { type: 'num', value: 0 },
        y: { type: 'num', value: 5 },
        z: { type: 'num', value: 0 },
        factor: 0.2,
      }),
    ).toBe('SZGame3D.moveTowards(p, 0, 5, 0, 0.2);')
    expect(
      gen({ type: 'if', cond: { type: 'g3d:getPos', objVar: 'p', axis: 'y' }, then: [] }),
    ).toContain('SZGame3D.getPos(p, "y")')
    expect(
      gen({ type: 'if', cond: { type: 'g3d:getRot', objVar: 'p', axis: 'x' }, then: [] }),
    ).toContain('SZGame3D.getRot(p, "x")')
    expect(gen({ type: 'if', cond: { type: 'g3d:getScale', objVar: 'p' }, then: [] })).toContain(
      'SZGame3D.getScale(p)',
    )
    expect(gen({ type: 'if', cond: { type: 'g3d:dt', worldVar: 'cena' }, then: [] })).toContain(
      'SZGame3D.dt(cena)',
    )
  })

  it('Olhar & apontar geram SZGame3D.*', () => {
    expect(gen({ type: 'g3d:lookAtObject', aVar: 'a', bVar: 'b' })).toBe(
      'SZGame3D.lookAtObject(a, b);',
    )
    expect(
      gen({
        type: 'g3d:lookAtPoint',
        objVar: 'p',
        x: { type: 'num', value: 0 },
        y: { type: 'num', value: 1 },
        z: { type: 'num', value: 0 },
      }),
    ).toBe('SZGame3D.lookAtPoint(p, 0, 1, 0);')
    expect(gen({ type: 'g3d:moveForward', objVar: 'p', dist: { type: 'num', value: 0.5 } })).toBe(
      'SZGame3D.moveForward(p, 0.5);',
    )
    expect(gen({ type: 'g3d:faceVelocity', objVar: 'p' })).toBe('SZGame3D.faceVelocity(p);')
    expect(
      gen({ type: 'if', cond: { type: 'g3d:angleTo', aVar: 'a', bVar: 'b' }, then: [] }),
    ).toContain('SZGame3D.angleTo(a, b)')
  })

  it('Mira & clique (raycast) geram SZGame3D.*', () => {
    expect(
      gen({ type: 'if', cond: { type: 'g3d:pointerOver', worldVar: 'c', objVar: 'b' }, then: [] }),
    ).toContain('SZGame3D.pointerOver(c, b)')
    expect(
      gen({ type: 'if', cond: { type: 'g3d:onGround', worldVar: 'c', objVar: 'p' }, then: [] }),
    ).toContain('SZGame3D.onGround(c, p)')
    expect(
      gen({
        type: 'if',
        cond: { type: 'g3d:aimAhead', worldVar: 'c', objVar: 'p', dist: 50 },
        then: [],
      }),
    ).toContain('SZGame3D.aimAhead(c, p, 50)')
    expect(
      gen({ type: 'if', cond: { type: 'g3d:pickAtMouse', worldVar: 'c' }, then: [] }),
    ).toContain('SZGame3D.pickAtMouse(c)')
    expect(
      gen({ type: 'if', cond: { type: 'g3d:groundHeight', worldVar: 'c', objVar: 'p' }, then: [] }),
    ).toContain('SZGame3D.groundHeight(c, p)')
  })

  it('Física avançada gera SZGame3D.*', () => {
    expect(gen({ type: 'g3d:body', objVar: 'p', gravity: -0.02 })).toBe('SZGame3D.body(p, -0.02);')
    expect(gen({ type: 'g3d:setSolid', objVar: 'c' })).toBe('SZGame3D.setSolid(c);')
    expect(gen({ type: 'g3d:stepBody', objVar: 'p', worldVar: 'w' })).toBe(
      'SZGame3D.stepBody(p, w);',
    )
    expect(
      gen({
        type: 'g3d:platformerControls',
        objVar: 'p',
        worldVar: 'w',
        speed: 0.08,
        jump: 0.18,
      }),
    ).toBe('SZGame3D.platformerControls(p, w, 0.08, 0.18);')
    expect(gen({ type: 'g3d:fpsControls', objVar: 'p', worldVar: 'w', speed: 0.1 })).toBe(
      'SZGame3D.fpsControls(p, w, 0.1);',
    )
    expect(gen({ type: 'g3d:resolveCollision', aVar: 'a', bVar: 'b' })).toBe(
      'SZGame3D.resolveCollision(a, b);',
    )
  })

  it('Câmera viva gera SZGame3D.*', () => {
    expect(gen({ type: 'g3d:fpsCamera', worldVar: 'w', objVar: 'p' })).toBe(
      'SZGame3D.fpsCamera(w, p);',
    )
    expect(gen({ type: 'g3d:orbitCamera', worldVar: 'w', objVar: 'p' })).toBe(
      'SZGame3D.orbitCamera(w, p);',
    )
    expect(
      gen({ type: 'g3d:thirdPersonCamera', worldVar: 'w', objVar: 'p', dist: 6, height: 3 }),
    ).toBe('SZGame3D.thirdPersonCamera(w, p, 6, 3);')
    expect(gen({ type: 'g3d:cameraLookAt', worldVar: 'w', objVar: 'p' })).toBe(
      'SZGame3D.cameraLookAt(w, p);',
    )
    expect(gen({ type: 'g3d:setFOV', worldVar: 'w', deg: 75 })).toBe('SZGame3D.setFOV(w, 75);')
  })

  it('Fase 6 — formas, materiais e modelo geram SZGame3D.*', () => {
    expect(
      gen({
        type: 'g3d:createCylinder',
        varName: 'c',
        worldVar: 'w',
        radius: 0.5,
        height: 2,
        color: '#22d3ee',
      }),
    ).toBe('const c = SZGame3D.createCylinder(w, { radius: 0.5, height: 2, color: "#22d3ee" });')
    expect(
      gen({
        type: 'g3d:createCone',
        varName: 'c',
        worldVar: 'w',
        radius: 0.5,
        height: 2,
        color: '#f59e0b',
      }),
    ).toBe('const c = SZGame3D.createCone(w, { radius: 0.5, height: 2, color: "#f59e0b" });')
    expect(
      gen({
        type: 'g3d:createPlane',
        varName: 'ch',
        worldVar: 'w',
        width: 10,
        depth: 8,
        color: '#67c240',
      }),
    ).toBe('const ch = SZGame3D.createPlane(w, { width: 10, depth: 8, color: "#67c240" });')
    expect(
      gen({
        type: 'g3d:createTorus',
        varName: 'a',
        worldVar: 'w',
        radius: 1,
        tube: 0.3,
        color: '#a78bfa',
      }),
    ).toBe('const a = SZGame3D.createTorus(w, { radius: 1, tube: 0.3, color: "#a78bfa" });')
    expect(gen({ type: 'g3d:createModel', varName: 'm', worldVar: 'w' })).toBe(
      'const m = SZGame3D.createModel(w);',
    )
    expect(gen({ type: 'g3d:addToModel', modelVar: 'm', partVar: 'p' })).toBe(
      'SZGame3D.addToModel(m, p);',
    )
    expect(gen({ type: 'g3d:setColor', objVar: 'o', color: '#ff5577' })).toBe(
      'SZGame3D.setColor(o, "#ff5577");',
    )
    expect(gen({ type: 'g3d:setOpacity', objVar: 'o', opacity: 0.5 })).toBe(
      'SZGame3D.setOpacity(o, 0.5);',
    )
    expect(gen({ type: 'g3d:setMaterial', objVar: 'o', kind: 'metal' })).toBe(
      'SZGame3D.setMaterial(o, "metal");',
    )
    expect(gen({ type: 'g3d:setTexture', objVar: 'o', asset: 'grama' })).toBe(
      'SZGame3D.setTexture(o, "grama");',
    )
    expect(gen({ type: 'g3d:setVisible', objVar: 'o', mode: 'hide' })).toBe(
      'SZGame3D.setVisible(o, "hide");',
    )
    expect(gen({ type: 'g3d:removeObject', worldVar: 'w', objVar: 'o' })).toBe(
      'SZGame3D.remove(w, o);',
    )
  })

  it('Fase 7 — luz e céu geram SZGame3D.*', () => {
    expect(
      gen({ type: 'g3d:addAmbientLight', worldVar: 'w', color: '#ffffff', intensity: 0.6 }),
    ).toBe('SZGame3D.addAmbientLight(w, "#ffffff", 0.6);')
    expect(gen({ type: 'g3d:addSunLight', worldVar: 'w', color: '#fff8e1', intensity: 0.9 })).toBe(
      'SZGame3D.addSunLight(w, "#fff8e1", 0.9);',
    )
    expect(
      gen({
        type: 'g3d:addPointLight',
        worldVar: 'w',
        color: '#ffd27f',
        intensity: 1,
        x: 0,
        y: 2,
        z: 0,
      }),
    ).toBe('SZGame3D.addPointLight(w, "#ffd27f", 1, 0, 2, 0);')
    expect(gen({ type: 'g3d:setFog', worldVar: 'w', color: '#9ca3af', near: 1, far: 30 })).toBe(
      'SZGame3D.setFog(w, "#9ca3af", 1, 30);',
    )
    expect(gen({ type: 'g3d:setSky', worldVar: 'w', top: '#1e3a8a', bottom: '#93c5fd' })).toBe(
      'SZGame3D.setSky(w, "#1e3a8a", "#93c5fd");',
    )
    expect(gen({ type: 'g3d:setShadows', worldVar: 'w', mode: 'on' })).toBe(
      'SZGame3D.setShadows(w, "on");',
    )
  })

  it('Fase 8 — enxames e som geram SZGame3D.*', () => {
    expect(gen({ type: 'g3d:createSwarm', varName: 'e', worldVar: 'w' })).toBe(
      'const e = SZGame3D.createSwarm(w);',
    )
    expect(
      gen({ type: 'g3d:spawnInSwarm', swarmVar: 'e', originalVar: 'o', x: 1, y: 2, z: 3 }),
    ).toBe('SZGame3D.spawnInSwarm(e, o, 1, 2, 3);')
    const fe = gen({
      type: 'g3d:forEachInSwarm',
      swarmVar: 'e',
      itemName: 'item',
      body: [{ type: 'g3d:removeFromSwarm', swarmVar: 'e', itemVar: 'item' }],
    })
    expect(fe).toContain('SZGame3D.forEachInSwarm(e, (item) => {')
    expect(fe).toContain('SZGame3D.removeFromSwarm(e, item);')
    expect(gen({ type: 'g3d:removeFromSwarm', swarmVar: 'e', itemVar: 'it' })).toBe(
      'SZGame3D.removeFromSwarm(e, it);',
    )
    expect(gen({ type: 'g3d:pruneSwarm', swarmVar: 'e', axis: 'y', min: -10, max: 10 })).toBe(
      'SZGame3D.pruneSwarm(e, "y", -10, 10);',
    )
    expect(gen({ type: 'g3d:playNote', freq: 440, ms: 200 })).toBe('SZGame3D.playNote(440, 200);')
    expect(gen({ type: 'g3d:playEffect', kind: 'coin' })).toBe('SZGame3D.playEffect("coin");')
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
      'g3d:topCamera',
      'g3d:moveInCircle',
      'g3d:createRaceScene',
      'g3d:createRaceTrack',
      'g3d:createRaceCar',
      'g3d:raceStep',
      'g3d:raceControl',
      'g3d:runRivals',
      'g3d:raceReset',
      'g3d:fall',
      'g3d:slideBetween',
      'g3d:spin',
      'g3d:createStackScene',
      'g3d:createStackTower',
      'g3d:stackDrop',
      'g3d:stackStep',
      'g3d:stackReset',
      'g3d:moveBy',
      'g3d:rotateBy',
      'g3d:moveTowards',
      'g3d:lookAtObject',
      'g3d:lookAtPoint',
      'g3d:moveForward',
      'g3d:faceVelocity',
      'g3d:body',
      'g3d:stepBody',
      'g3d:setSolid',
      'g3d:platformerControls',
      'g3d:fpsControls',
      'g3d:resolveCollision',
      'g3d:fpsCamera',
      'g3d:orbitCamera',
      'g3d:thirdPersonCamera',
      'g3d:cameraLookAt',
      'g3d:setFOV',
      'g3d:createCylinder',
      'g3d:createCone',
      'g3d:createPlane',
      'g3d:createTorus',
      'g3d:createModel',
      'g3d:addToModel',
      'g3d:setVisible',
      'g3d:removeObject',
      'g3d:setColor',
      'g3d:setOpacity',
      'g3d:setMaterial',
      'g3d:setTexture',
      'g3d:addAmbientLight',
      'g3d:addSunLight',
      'g3d:addPointLight',
      'g3d:setFog',
      'g3d:setSky',
      'g3d:setShadows',
      'g3d:createSwarm',
      'g3d:spawnInSwarm',
      'g3d:forEachInSwarm',
      'g3d:removeFromSwarm',
      'g3d:pruneSwarm',
      'g3d:playNote',
      'g3d:playEffect',
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

  it('o exemplo "Corrida maluca" tem IR válido', () => {
    expect(SZIRSchema.safeParse(raceExample.ir).success).toBe(true)
  })

  it('o exemplo "Torre maluca" tem IR válido', () => {
    expect(SZIRSchema.safeParse(stackExample.ir).success).toBe(true)
  })

  it('o exemplo "Boneco de formas" tem IR válido', () => {
    expect(SZIRSchema.safeParse(shapesExample.ir).success).toBe(true)
  })

  it('o exemplo "Noite enevoada" tem IR válido', () => {
    expect(SZIRSchema.safeParse(nightExample.ir).success).toBe(true)
  })

  it('o exemplo "Enxame que gira" tem IR válido', () => {
    expect(SZIRSchema.safeParse(swarmExample.ir).success).toBe(true)
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

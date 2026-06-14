import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import { rotatingCubeExample } from '../../official-extensions/game-3d/examples'
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

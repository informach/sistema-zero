import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import { G3D_STATEMENT_TYPES, type JSStatement, SZIRSchema } from '#ir'
import { rotatingCubeExample } from '../examples'
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
    ]) {
      expect(G3D_STATEMENT_TYPES.has(t)).toBe(true)
    }
  })

  it('o exemplo "Cubo girando" tem IR válido', () => {
    expect(SZIRSchema.safeParse(rotatingCubeExample.ir).success).toBe(true)
  })
})

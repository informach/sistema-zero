import { describe, expect, test } from 'bun:test'
import { translateGlsl } from './raylibShaders'

describe('GLSL 330 do raylib do computador → GLSL ES 300 do navegador', () => {
  test('troca a versão, põe a precisão e mantém o resto do código', () => {
    const { code, defaults } = translateGlsl(
      '#version 330\nin vec2 fragTexCoord;\nout vec4 finalColor;\nvoid main() { finalColor = vec4(fragTexCoord, 0.0, 1.0); }\n',
    )
    expect(code.startsWith('#version 300 es\nprecision highp float;\nprecision highp int;\n')).toBe(
      true,
    )
    expect(code).toContain('void main() { finalColor = vec4(fragTexCoord, 0.0, 1.0); }')
    expect(defaults).toEqual([])
  })

  test('#version 330 core também vale, e a versão pode vir depois de um comentário', () => {
    expect(translateGlsl('// meu shader\n#version 330 core\nvoid main() {}').code).toContain(
      '// meu shader\n#version 300 es\n',
    )
  })

  test('o valor inicial de um uniform sai do código e vira o valor depois de ligar', () => {
    const { code, defaults } = translateGlsl(
      '#version 330\nuniform float altura = 0.5;\nuniform vec3 cor = vec3(1.0, 0.5, 0.0);\nuniform highp vec2 escala = vec2(2.0);\nuniform int vezes = 3;\nvoid main() {}',
    )
    expect(code).toContain('uniform float altura;')
    expect(code).toContain('uniform vec3 cor;')
    expect(code).toContain('uniform highp vec2 escala;')
    expect(code).not.toContain('=')
    expect(defaults).toEqual([
      { name: 'altura', type: 'float', values: [0.5] },
      { name: 'cor', type: 'vec3', values: [1, 0.5, 0] },
      { name: 'escala', type: 'vec2', values: [2, 2] },
      { name: 'vezes', type: 'int', values: [3] },
    ])
  })

  test('sem #version 330 o shader é recusado em português', () => {
    expect(() => translateGlsl('void main() {}')).toThrow('#version 330')
    expect(() => translateGlsl('#version 100\nvoid main() {}')).toThrow('#version 100')
  })

  test('o #extension vem antes da precisão, como o GLSL ES exige', () => {
    const { code } = translateGlsl(
      '#version 330\n#extension GL_OES_standard_derivatives : enable\nvoid main() {}',
    )
    const lines = code.split('\n')
    expect(lines[0]).toBe('#version 300 es')
    expect(lines[1]).toBe('#extension GL_OES_standard_derivatives : enable')
    expect(lines[2]).toBe('precision highp float;')
    expect(code.match(/#extension/g)).toHaveLength(1)
  })

  test('um valor inicial que não é número é recusado', () => {
    expect(() =>
      translateGlsl('#version 330\nuniform float a = sin(1.0);\nvoid main() {}'),
    ).toThrow('valor inicial')
  })
})

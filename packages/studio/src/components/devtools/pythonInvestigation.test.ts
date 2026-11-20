import { describe, expect, it } from 'bun:test'
import {
  pythonDeclarationLine,
  pythonTopLevelNames,
  pythonTraceSteps,
  pythonValueText,
} from './pythonInvestigation'

describe('o Investigar no Python', () => {
  it('pergunta pelas variáveis criadas no topo do arquivo, na ordem', () => {
    const source = [
      'import pgzrun',
      'WIDTH = 320',
      'pontos: int = 0',
      'x, (y, z) = 1, (2, 3)',
      'vidas += 1',
      '_interno = 9',
      'if pontos == 0:',
      '    escondido = 1',
      'def update():',
      '    global pontos',
      'nome = "a=b"  # comentário = não',
    ].join('\n')
    expect(pythonTopLevelNames(source)).toEqual(['WIDTH', 'pontos', 'x', 'y', 'z', 'vidas', 'nome'])
    expect(pythonDeclarationLine(source, 'pontos')).toBe(3)
    expect(pythonDeclarationLine(source, 'escondido')).toBeNull()
  })

  it('o caminho até o erro: só os passos do projeto, de dentro para fora', () => {
    const traceback = [
      'Traceback (most recent call last):',
      '  File "/lib/python3.12/site-packages/pgzero/game.py", line 10, in run',
      '  File "/studio/project/main.py", line 20, in update',
      '  File "/studio/project/inimigos.py", line 4, in mover',
      "NameError: name 'velocidade' is not defined",
    ].join('\n')
    expect(pythonTraceSteps(traceback)).toEqual([
      { file: 'inimigos.py', line: 4 },
      { file: 'main.py', line: 20 },
    ])
  })

  it('escreve o valor como o Python escreveria', () => {
    expect(pythonValueText(true)).toBe('True')
    expect(pythonValueText(null)).toBe('None')
    expect(pythonValueText('oi')).toBe("'oi'")
    expect(pythonValueText([1, 'a', false])).toBe("[1, 'a', False]")
    expect(pythonValueText({ x: 1 })).toBe("{'x': 1}")
    expect(pythonValueText('a'.repeat(200)).length).toBeLessThanOrEqual(81)
  })
})

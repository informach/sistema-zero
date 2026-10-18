import { describe, expect, it } from 'bun:test'
import { studioTutorContextHint, studioTutorModeViolation, studioTutorPolicy } from './tutorMode'

describe('contrato pedagógico do tutor', () => {
  it('Python keeps textual instructions in Pro and ordinary Portuguese labels in Classic', () => {
    for (const text of [
      'print(42)',
      'import turtle',
      'from turtle import Turtle',
      'for passo in range(4):',
      'pontos = 0',
      'python -m pip install pacote',
    ]) {
      expect(studioTutorModeViolation(text, 'classic', 'python')).toBe('code-in-blocks')
      expect(studioTutorModeViolation(text, 'pro', 'python')).toBeNull()
    }
    expect(
      studioTutorModeViolation(
        'Use o bloco Repetir para desenhar quatro lados.',
        'classic',
        'python',
      ),
    ).toBeNull()
    expect(
      studioTutorModeViolation('A função print mostra um valor.', 'classic', 'python'),
    ).toBeNull()
  })
  it('autoriza código somente no Pro, independentemente da visualização clássica', () => {
    expect(studioTutorPolicy('classic')).toMatchObject({ blocks: true, code: false })
    expect(studioTutorPolicy('pro')).toMatchObject({ blocks: false, code: true })
    expect(studioTutorContextHint('pro')).not.toContain('bloco')
  })
  it.each([
    'Escreva JavaScript para mover o herói.',
    'Abra o terminal.',
    'npm install three',
    'const x = 1',
  ])('bloqueia instrução textual no normal: %s', (text) => {
    expect(studioTutorModeViolation(text, 'classic')).toBe('code-in-blocks')
  })
  it.each([
    'Selecione um bloco.',
    'Arraste o bloco de movimento.',
    'Como uso o bloco de colisão?',
    'Procure na paleta de blocos.',
  ])('bloqueia instrução visual no Pro: %s', (text) => {
    expect(studioTutorModeViolation(text, 'pro')).toBe('blocks-in-pro')
  })
  it('preserva explicações e sintaxe legítimas de cada modo', () => {
    expect(studioTutorModeViolation('Use o bloco mover personagem.', 'classic')).toBeNull()
    expect(studioTutorModeViolation('A tag <img> mostra a imagem.', 'classic')).toBeNull()
    expect(studioTutorModeViolation('Selecione este bloco de código no arquivo.', 'pro')).toBeNull()
    expect(studioTutorModeViolation('Execute npm install three no terminal.', 'pro')).toBeNull()
    expect(
      studioTutorModeViolation('Adicione blocos de pedra ao cenário com THREE.Mesh.', 'pro'),
    ).toBeNull()
  })
})

import { describe, expect, it } from 'bun:test'
import { studioTutorContextHint, studioTutorModeViolation, studioTutorPolicy } from './tutorMode'

describe('contrato pedagógico do tutor', () => {
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

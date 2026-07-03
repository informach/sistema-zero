import { describe, expect, it } from 'bun:test'
import { hideChipLines, splitChips } from './chips'

describe('splitChips', () => {
  it('separa a linha final SUGESTÕES: em chips e a remove da exibição', () => {
    const content = 'Que legal! Quem vai jogar seu jogo?\nSUGESTÕES: Eu | Meus amigos | Todo mundo'
    const { display, chips } = splitChips(content)
    expect(display).toBe('Que legal! Quem vai jogar seu jogo?')
    expect(chips).toEqual(['Eu', 'Meus amigos', 'Todo mundo'])
  })

  it('sem linha de sugestões devolve o texto intacto e chips vazio', () => {
    const { display, chips } = splitChips('Oi! Me conta sua ideia.')
    expect(display).toBe('Oi! Me conta sua ideia.')
    expect(chips).toEqual([])
  })

  it('ignora opções vazias e apara espaços de cada chip', () => {
    const { chips } = splitChips('Texto\nSUGESTÕES:  Um dino  ||  Uma nave ')
    expect(chips).toEqual(['Um dino', 'Uma nave'])
  })

  it('com mais de uma linha marcada, nenhuma aparece e a ÚLTIMA vence', () => {
    const content = 'Parte 1\nSUGESTÕES: velha a | velha b\nParte 2\nSUGESTÕES: nova a | nova b'
    const { display, chips } = splitChips(content)
    expect(display).toBe('Parte 1\nParte 2')
    expect(chips).toEqual(['nova a', 'nova b'])
  })

  it('preserva quebras de linha do texto exibível', () => {
    const { display } = splitChips('Linha 1\n\nLinha 2\nSUGESTÕES: a | b')
    expect(display).toBe('Linha 1\n\nLinha 2')
  })
})

describe('hideChipLines (streaming)', () => {
  it('oculta linha completa que começa com SUGESTÕES:', () => {
    expect(hideChipLines('Boa ideia!\nSUGESTÕES: a | b')).toBe('Boa ideia!')
  })

  it('oculta a última linha PARCIAL que é prefixo do marcador', () => {
    expect(hideChipLines('Boa ideia!\nSUGES')).toBe('Boa ideia!')
    expect(hideChipLines('Boa ideia!\nSUGESTÕES: Um di')).toBe('Boa ideia!')
  })

  it('não oculta linha final comum', () => {
    expect(hideChipLines('Boa ideia!\nSim, pode ser.')).toBe('Boa ideia!\nSim, pode ser.')
  })

  it('texto sem marcador passa intacto', () => {
    expect(hideChipLines('Só texto')).toBe('Só texto')
  })
})

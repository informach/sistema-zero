import { describe, expect, it } from 'bun:test'
import { SZIRV2Schema } from '#ir'
import { THREE_KEY_OPTIONS } from '../../threeKeys'

/**
 * O zod das regras confere o "Quando…" por evento (itens 14-16 do review): campo de objeto ou
 * grupo vazio (que gerava `_` no código), campos de outro evento, tecla fora da lista e o nome de
 * quem encostou igual ao do grupo (que sombreava o grupo dentro do corpo).
 */
const project = (prefix: 'g3d' | 'w3d', statement: Record<string, unknown>) => ({
  version: 2,
  html: [{ type: 'canvas', id: 'tela', width: 480, height: 360 }],
  css: [],
  behavior: {
    start:
      prefix === 'g3d'
        ? [
            { type: 'g3d:createFullscreenScene', varName: 'cena', bg: '#000' },
            { type: 'g3d:createBox', varName: 'heroi', worldVar: 'cena', size: 1, color: '#fff' },
            { type: 'g3d:createGroup', varName: 'estrelas' },
          ]
        : [],
    events: [{ body: [], ...statement }],
    loops: [],
  },
  extensions: [{ extensionId: prefix === 'g3d' ? 'game-3d' : 'world-3d' }],
})
const issues = (prefix: 'g3d' | 'w3d', statement: Record<string, unknown>) => {
  const parsed = SZIRV2Schema.safeParse(project(prefix, statement))
  return parsed.success ? [] : [...new Set(parsed.error.issues.map((issue) => issue.message))]
}

describe('"Quando…" das regras: o zod confere evento ↔ campos', () => {
  it('os cinco eventos bem formados passam', () => {
    for (const statement of [
      { type: 'g3d:onGame', event: 'vida-acabou', objVar: 'heroi' },
      { type: 'g3d:onGame', event: 'tempo-acabou' },
      { type: 'g3d:onGame', event: 'tecla', key: 'Space' },
      { type: 'g3d:onGame', event: 'clique', objVar: 'heroi' },
      {
        type: 'g3d:onGame',
        event: 'encostar',
        objVar: 'heroi',
        groupVar: 'estrelas',
        itemName: 'estrela',
      },
    ]) {
      expect(issues('g3d', statement)).toEqual([])
    }
    expect(issues('w3d', { type: 'w3d:onGame', event: 'vida-acabou' })).toEqual([])
  })

  it('objeto ou grupo vazio é recusado com a frase do bloco', () => {
    expect(issues('g3d', { type: 'g3d:onGame', event: 'clique', objVar: '' })).toEqual([
      'Escolha o nome do objeto neste bloco (o campo ficou vazio).',
    ])
    expect(issues('g3d', { type: 'g3d:onGame', event: 'clique' })).toHaveLength(1)
    expect(
      issues('g3d', { type: 'g3d:onGame', event: 'encostar', objVar: 'heroi', groupVar: ' ' }),
    ).toEqual(['Escolha o grupo neste bloco (o campo ficou vazio).'])
    // (Estes dois moram no "Ao iniciar": aqui só importa a frase do campo vazio.)
    const empty = 'Escolha o nome do objeto neste bloco (o campo ficou vazio).'
    expect(
      issues('g3d', { type: 'g3d:life', op: 'dar', objVar: '', value: { type: 'num', value: 3 } }),
    ).toContain(empty)
    expect(
      issues('g3d', { type: 'g3d:blink', objVar: '', secs: { type: 'num', value: 1 } }),
    ).toContain(empty)
  })

  it('campos de outro evento são recusados', () => {
    expect(
      issues('g3d', { type: 'g3d:onGame', event: 'tempo-acabou', objVar: 'heroi', key: 'Space' }),
    ).toHaveLength(2)
    expect(
      issues('w3d', { type: 'w3d:onGame', event: 'vida-acabou', objVar: 'heroi' }),
    ).toHaveLength(1)
  })

  it('a tecla tem de estar na lista comum (threeKeys)', () => {
    expect(issues('g3d', { type: 'g3d:onGame', event: 'tecla', key: 'KeyZZ' })).toEqual([
      'A tecla "KeyZZ" não está na lista do bloco.',
    ])
    expect(issues('g3d', { type: 'g3d:onGame', event: 'tecla' })).toHaveLength(1)
    for (const [, code] of THREE_KEY_OPTIONS) {
      expect(issues('g3d', { type: 'g3d:onGame', event: 'tecla', key: code })).toEqual([])
    }
  })

  it('quem encostou não pode ter o nome do grupo nem do objeto', () => {
    const touch = { type: 'g3d:onGame', event: 'encostar', objVar: 'heroi', groupVar: 'estrelas' }
    expect(issues('g3d', { ...touch, itemName: 'estrelas' })[0]).toContain('o mesmo nome do grupo')
    expect(issues('g3d', { ...touch, itemName: 'heroi' })[0]).toContain('o mesmo nome do objeto')
  })
})

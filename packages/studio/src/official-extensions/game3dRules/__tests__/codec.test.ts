import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import { type JSStatement, JSStatementSchema } from '#ir'
import { parseJS } from '../../../parsers/js'
import { gameRulesStatementToBlock, gameRulesStatementToCode } from '../codec'
import {
  GAME_RULES_ENABLED_PREFIXES,
  type GameRulesStatement,
  gameRulesStatementTypesFor,
  isGameRulesStatement,
} from '../ir'

/**
 * O codec das regras de jogo: só os prefixos LIGADOS entram pela Ponte e pelos blocos, e o
 * código que não cabe num bloco fica como código (nada se perde).
 */

const rawTypes = (statements: unknown) => JSON.stringify(statements).includes('"rawJS"')

describe('regras de jogo 3D — codec', () => {
  it('clique na cena tem nó próprio do Jogo 3D, sem evento DOM ou alvo inventado', () => {
    const ir = parseJS('SZGame3D.onCanvasClick(() => { SZGame3D.addScore(1); });')
    expect(ir).toMatchObject([
      { type: 'g3d:onGame', event: 'clique-cena', body: [{ type: 'g3d:addScore' }] },
    ])
    expect(ir.every((statement) => JSStatementSchema.safeParse(statement).success)).toBe(true)
    expect(parseJS(compileStatements(ir, 0))).toMatchObject(ir)
  })
  it('a mira central é texto nativo e mantém código e IR nas três extensões', () => {
    for (const [global, prefix] of [
      ['SZGame3D', 'g3d'],
      ['SZWorld3D', 'w3d'],
      ['SZGameKit3D', 'g3k'],
    ]) {
      const source = `${global}.hudText("center", "+");`
      const ir = parseJS(source)
      expect(ir).toMatchObject([
        { type: `${prefix}:cornerText`, corner: 'center', text: { type: 'str', value: '+' } },
      ])
      expect(rawTypes(ir)).toBe(false)
      expect(ir.every((statement) => JSStatementSchema.safeParse(statement).success)).toBe(true)
      expect(compileStatements(ir, 0).trim()).toBe(source)
    }
  })
  it('as três extensões 3D estão ligadas (o Avançado entrou no lote 11)', () => {
    expect(GAME_RULES_ENABLED_PREFIXES).toEqual(['g3d', 'w3d', 'g3k'])
    const mundo: JSStatement = { type: 'w3d:addScore', value: { type: 'num', value: 1 } }
    const avancado: JSStatement = { type: 'g3k:addScore', value: { type: 'num', value: 1 } }
    expect(isGameRulesStatement(mundo)).toBe(true)
    expect(JSStatementSchema.safeParse(mundo).success).toBe(true)
    expect(JSStatementSchema.safeParse(avancado).success).toBe(true)
    expect(
      JSStatementSchema.safeParse({ type: 'g3d:addScore', value: { type: 'num', value: 1 } })
        .success,
    ).toBe(true)
    expect(gameRulesStatementTypesFor('g3d')).toContain('g3d:onGame')
  })

  it('o gerador escreve o global de cada prefixo', () => {
    const tools = {
      pad: '',
      id: (name: string) => name,
      expression: () => '1',
      body: () => '',
    }
    const rule = (type: string) =>
      ({ type, value: { type: 'num', value: 1 } }) as unknown as GameRulesStatement
    expect(gameRulesStatementToCode(rule('g3d:addScore'), tools)).toBe('SZGame3D.addScore(1);')
    expect(gameRulesStatementToCode(rule('w3d:addScore'), tools)).toBe('SZWorld3D.addScore(1);')
    expect(gameRulesStatementToCode(rule('g3k:addScore'), tools)).toBe('SZGameKit3D.addScore(1);')
  })

  it('regra que o prefixo NÃO oferece vira código avançado, nunca um bloco que não existe', () => {
    // O Avançado recomeça entrando em "jogando" (não tem o "Reiniciar o jogo" das regras).
    const raw = { type: 'sz_adv_raw_js' } as never
    const made: string[] = []
    const block = gameRulesStatementToBlock({ type: 'g3k:restart' } as JSStatement, {
      block: (type) => {
        made.push(type)
        return { type } as never
      },
      expression: () => null,
      statements: () => [],
      raw: () => raw,
    })
    expect(block).toBe(raw)
    expect(made).toEqual([])
  })

  it('a Ponte do Avançado lê as regras que ele oferece e deixa a vida dele com ele', () => {
    const ir = JSON.stringify(
      parseJS(
        [
          'SZGameKit3D.addScore(1);',
          'SZGameKit3D.hudText("top-left", "oi");',
          'SZGameKit3D.endGame("ganhou");',
          // A vida do Avançado é POR OBJETO (meio segundo de invencibilidade, derrota): o
          // global é o mesmo das regras, mas a chamada é da extensão.
          'SZGameKit3D.hurt(heroi, 1);',
          'SZGameKit3D.restart();',
        ].join('\n'),
      ),
    )
    expect(ir).toContain('g3k:addScore')
    expect(ir).toContain('g3k:cornerText')
    expect(ir).toContain('g3k:gameOver')
    expect(ir).toContain('"g3k:hurt"')
    expect(ir).not.toContain('g3k:life')
    expect(ir).not.toContain('g3k:restart')
  })

  it('Mundo 3D: a vida é do jogador (sem objeto) e volta igual pela Ponte', () => {
    const code = [
      'SZWorld3D.setLife(3);',
      'SZWorld3D.hurt(1);',
      'SZWorld3D.heal(2);',
      'SZWorld3D.onLifeOver(() => {',
      '  SZWorld3D.endGame("perdeu");',
      '});',
      'if (SZWorld3D.lifeOf() < 2) {',
      '  SZWorld3D.restart();',
      '}',
    ].join('\n')
    const ir = parseJS(code)
    expect(rawTypes(ir)).toBe(false)
    expect(JSON.stringify(ir)).not.toContain('objVar')
    expect(compileStatements(ir, 0)).toBe(code)
    // A forma do Jogo 3D (com objeto) não vira bloco no Mundo 3D, e vice-versa.
    expect(JSON.stringify(parseJS('SZWorld3D.setLife(heroi, 3);'))).not.toContain('w3d:life')
    expect(JSON.stringify(parseJS('SZGame3D.setLife(3);'))).not.toContain('g3d:life')
  })

  it('Mundo 3D não oferece piscar, tecla, clique nem encostar (ficam como código)', () => {
    for (const source of [
      'SZWorld3D.blink(heroi, 1);',
      'SZWorld3D.onKey("KeyE", () => {\n});',
      'SZWorld3D.onClickObject(botao, () => {\n});',
    ]) {
      const ir = parseJS(source)
      expect(
        ir.some((statement) => isGameRulesStatement(statement)),
        source,
      ).toBe(false)
    }
  })

  it('valor de regra cabe num "se" e volta igual', () => {
    const code = [
      'if (SZGame3D.randomChance(30) && SZGame3D.score() > 9) {',
      '  SZGame3D.endGame("ganhou");',
      '}',
    ].join('\n')
    const ir = parseJS(code)
    expect(rawTypes(ir)).toBe(false)
    expect(compileStatements(ir, 0)).toBe(code)
  })

  it('código que não cabe no bloco fica como código, sem perder nada', () => {
    for (const source of [
      'SZGame3D.hudText("meio", "oi");',
      'SZGame3D.endGame("empate");',
      'SZGame3D.setScreenText("menu", "a", "b", "c");',
      'SZGame3D.onKey("KeyZ", () => {\n});',
      'SZGame3D.onTouchGroup(heroi, estrelas, () => {\n});',
      'SZGame3D.restart(1);',
    ]) {
      const ir = parseJS(source)
      expect(
        ir.some((statement) => isGameRulesStatement(statement)),
        source,
      ).toBe(false)
      expect(compileStatements(ir, 0).replace(/\s+/g, '')).toBe(source.replace(/\s+/g, ''))
    }
  })
})

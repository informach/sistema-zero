import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import { SZIRSchema } from '#ir'

const project = (js: unknown[]) => ({
  html: [],
  css: [],
  js,
  extensions: [{ extensionId: 'game-2d' }],
})

describe('game-2d — contrato de ciclo de vida', () => {
  it('aceita “quando o jogo começar” e gera o registro reiniciável', () => {
    const start = {
      type: 'g2d:onStart',
      __id: 'inicio-1',
      body: [
        {
          type: 'g2d:setupStage',
          width: 400,
          height: 300,
          bg: '#101827',
          description: 'Use as setas para mover o herói.',
        },
      ],
    }
    const parsed = SZIRSchema.safeParse(project([start]))
    expect(parsed.success).toBe(true)
    expect(compileStatements([start] as never[], 0)).toContain('SZGame2D.onStart(function')
    expect(compileStatements([start] as never[], 0)).toContain('"inicio-1"')
    expect(compileStatements([start] as never[], 0)).toContain('"Use as setas para mover o herói."')
  })

  it('recusa evento registrado dentro de “a cada quadro”', () => {
    const parsed = SZIRSchema.safeParse(
      project([
        {
          type: 'g2d:updateEachFrame',
          body: [{ type: 'g2d:onPointer', xName: 'x', yName: 'y', body: [] }],
        },
      ]),
    )
    expect(parsed.success).toBe(false)
  })

  it('recusa dois nomes declarados iguais antes de gerar JavaScript inválido', () => {
    const parsed = SZIRSchema.safeParse(
      project([
        {
          type: 'g2d:onStart',
          body: [
            {
              type: 'g2d:createSprite',
              varName: 'jogador',
              x: 0,
              y: 0,
              w: 20,
              h: 20,
              color: '#fff',
            },
            {
              type: 'g2d:createSprite',
              varName: 'jogador',
              x: 30,
              y: 0,
              w: 20,
              h: 20,
              color: '#fff',
            },
          ],
        },
      ]),
    )
    expect(parsed.success).toBe(false)
  })

  it('recusa mais de um bloco de início', () => {
    const parsed = SZIRSchema.safeParse(
      project([
        { type: 'g2d:onStart', body: [] },
        { type: 'g2d:onStart', body: [] },
      ]),
    )
    expect(parsed.success).toBe(false)
  })

  it('recusa referência a sprite que não foi criado e aponta o campo do bloco', () => {
    const parsed = SZIRSchema.safeParse(
      project([
        {
          type: 'g2d:onStart',
          body: [
            { type: 'g2d:setupStage', width: 400, height: 300, bg: '#101827' },
            { type: 'g2d:drawSprite', __id: 'desenho-1', spriteVar: 'fantasma', ctxVar: 'ctx' },
          ],
        },
      ]),
    )

    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(
        parsed.error.issues.some((issue) => issue.path.join('.') === 'js.0.body.1.spriteVar'),
      ).toBe(true)
      expect(parsed.error.issues.some((issue) => issue.message.includes('fantasma'))).toBe(true)
    }
  })

  it('aceita os nomes locais entregues pelos blocos de grupo', () => {
    const parsed = SZIRSchema.safeParse(
      project([
        {
          type: 'g2d:onStart',
          body: [
            { type: 'g2d:createGroup', varName: 'moedas' },
            {
              type: 'g2d:forEachInGroup',
              groupVar: 'moedas',
              itemName: 'moeda',
              body: [{ type: 'g2d:drawSprite', spriteVar: 'moeda', ctxVar: 'ctx' }],
            },
          ],
        },
      ]),
    )

    expect(parsed.success).toBe(true)
  })
})

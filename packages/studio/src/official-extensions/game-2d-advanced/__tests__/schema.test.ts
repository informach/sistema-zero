import { describe, expect, it } from 'bun:test'
import type { JSExpr, JSStatement } from '#ir'
import { GK_STATEMENT_TYPES, SZIRSchema, statementIsExtension } from '#ir'

/**
 * F1 do Jogo 2D Avançado: todo nó `gk:` do IR valida no schema zod (união TS e
 * discriminatedUnion andam juntas) e os Sets/discriminadores enxergam o prefixo.
 */

// AMOSTRA dos statements gk: (os ~25 do v1) — só p/ um smoke test do schema zod.
// NÃO é um exemplar de cada tipo (hoje há 104 statements gk:); a completude 1:1
// (todo bloco ↔ tipo IR ↔ runtime) é garantida pelo blockAudit, não por aqui.
const GK_STATEMENTS: JSStatement[] = [
  { type: 'gk:setup', w: 1280, h: 720, bg: '#1a1a2e', accent: '#4a9eff' },
  { type: 'gk:start' },
  { type: 'gk:loadImage', name: 'heroi', asset: 'meu desenho' },
  {
    type: 'gk:setScreenText',
    screen: 'menu',
    title: 'Meu Jogo',
    text: { type: 'var', name: 'dica' },
    button: 'Jogar',
  },
  { type: 'gk:createScreen', name: 'vitoria', title: 'Você venceu!', text: 'Parabéns' },
  {
    type: 'gk:addButton',
    screen: 'vitoria',
    label: 'Jogar de novo',
    body: [{ type: 'gk:returnToMenu' }],
  },
  { type: 'gk:showScreen', name: 'vitoria' },
  { type: 'gk:hideScreens' },
  { type: 'gk:setState', name: 'jogando' },
  { type: 'gk:onEnterState', name: 'jogando', body: [{ type: 'gk:hideScreens' }] },
  { type: 'gk:pause' },
  { type: 'gk:resume' },
  { type: 'gk:returnToMenu' },
  { type: 'gk:endGame' },
  {
    type: 'gk:onUpdate',
    dtName: 'dt',
    body: [{ type: 'gk:moveWithKeys', charVar: 'heroi', dtVar: 'dt' }],
  },
  {
    type: 'gk:onDraw',
    ctxName: 'ctx',
    body: [{ type: 'gk:drawBackground', color: '#0f3460', grid: true }],
  },
  { type: 'gk:drawBackground', color: '#0f3460', grid: false },
  {
    type: 'gk:createCharacter',
    varName: 'heroi',
    image: 'heroi',
    w: 64,
    h: { type: 'num', value: 64 },
    speed: 300,
    color: '#4a9eff',
  },
  { type: 'gk:moveWithKeys', charVar: 'heroi', dtVar: 'dt' },
  { type: 'gk:keepOnScreen', charVar: 'heroi' },
  { type: 'gk:drawCharacter', charVar: 'heroi' },
  { type: 'gk:placeCharacter', charVar: 'moeda', x: 100, y: { type: 'var', name: 'y' } },
  { type: 'gk:resetCharacter', charVar: 'heroi' },
  { type: 'gk:setSpeedMultiplier', charVar: 'heroi', factor: 2 },
  { type: 'gk:setPauseKey', key: 'Escape' },
]

// AMOSTRA dos valores gk: (os 8 do v1) — smoke test do schema, não um de cada.
const GK_EXPRS: JSExpr[] = [
  { type: 'gk:gameWidth' },
  { type: 'gk:gameHeight' },
  { type: 'gk:gameState' },
  { type: 'gk:stateIs', name: 'jogando' },
  { type: 'gk:charactersTouch', aVar: 'heroi', bVar: 'moeda' },
  { type: 'gk:charX', charVar: 'heroi' },
  { type: 'gk:charY', charVar: 'heroi' },
  { type: 'gk:keyDown', key: 'w' },
]

describe('game-2d-advanced — IR no schema', () => {
  it('todos os statements gk: validam no SZIRSchema', () => {
    const parsed = SZIRSchema.safeParse({
      html: [],
      css: [],
      js: [
        { type: 'var', name: 'dica', value: { type: 'str', value: '' } },
        { type: 'var', name: 'y', value: { type: 'num', value: 0 } },
        ...GK_STATEMENTS,
      ],
      extensions: [{ extensionId: 'game-2d-advanced' }],
    })
    expect(parsed.success).toBe(true)
  })

  it('todos os valores gk: validam dentro de um statement', () => {
    const js: JSStatement[] = [
      { type: 'var', name: 'x', value: { type: 'num', value: 0 } },
      ...GK_EXPRS.map((expr) => ({
        type: 'assign' as const,
        name: 'x',
        value: expr,
      })),
    ]
    const parsed = SZIRSchema.safeParse({ html: [], css: [], js, extensions: [] })
    expect(parsed.success).toBe(true)
  })

  it('os statements exercitados (v1) são todos tipos gk: reconhecidos', () => {
    // A completude 1:1 (todo bloco ↔ tipo IR ↔ runtime) é garantida pelo
    // blockAudit; aqui só checamos que os exemplares v1 pertencem ao Set.
    for (const s of GK_STATEMENTS) expect(GK_STATEMENT_TYPES.has(s.type)).toBe(true)
    expect(GK_STATEMENT_TYPES.size).toBeGreaterThanOrEqual(GK_STATEMENTS.length)
  })

  it('statementIsExtension discrimina gk: como game-2d-advanced', () => {
    const stmt: JSStatement = { type: 'gk:start' }
    expect(statementIsExtension(stmt, 'game-2d-advanced')).toBe(true)
    expect(statementIsExtension(stmt, 'game-2d')).toBe(false)
    expect(statementIsExtension({ type: 'g2d:clear' }, 'game-2d-advanced')).toBe(false)
  })

  it('impede comportamento dentro do desenho do mapa', () => {
    const parsed = SZIRSchema.safeParse({
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-2d-advanced' }],
      js: [
        {
          type: 'gk:rpgCreateMap',
          map: 'vila',
          cols: 10,
          rows: 8,
          ctxName: 'ctx',
          body: [{ type: 'gk:rpgCreateNpc', name: 'guia', cx: 2, cy: 2, image: '', look: '' }],
        },
      ],
    })
    expect(parsed.success).toBe(false)
  })

  it('impede desenho dentro do evento de entrada do mapa', () => {
    const parsed = SZIRSchema.safeParse({
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-2d-advanced' }],
      js: [
        {
          type: 'gk:rpgOnEnterMap',
          map: 'vila',
          body: [{ type: 'gk:drawBackground', color: '#123456', grid: false }],
        },
      ],
    })
    expect(parsed.success).toBe(false)
  })
})

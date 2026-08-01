import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import { type JSStatement, JSStatementSchema, SZIRSchema } from '#ir'
import { parseJS } from '../../../parsers/js'
import { gameTwoDRuntime } from '../runtime'

/**
 * Nome OPCIONAL do sprite criado NO GRUPO (v0.53.0). Sem ele não dava para
 * animar (nem mexer em) um sprite de grupo: os blocos de criar no grupo não
 * devolviam alça nenhuma, e os de "criar sprite" são só de "Ao iniciar".
 *
 * O que estes testes protegem, que quebraria em SILÊNCIO:
 *  - projeto SEM nome tem que gerar o MESMO código de antes do campo existir;
 *  - com nome, o `const` entra e o parser tem que reconhecer as DUAS formas;
 *  - o nome vale só no trecho em que o sprite nasce (escopo).
 */

const num = (value: number) => ({ type: 'num', value }) as const

function spawn(extra: Record<string, unknown> = {}): JSStatement {
  return {
    type: 'g2d:spawnInGroup',
    groupVar: 'asteroides',
    x: num(10),
    y: num(20),
    w: num(30),
    h: num(30),
    color: '#9ca3af',
    vx: num(0),
    vy: num(2),
    ...extra,
  } as JSStatement
}

describe('criar no grupo: nome opcional do sprite', () => {
  it('SEM nome gera exatamente o código de sempre (projeto antigo intocado)', () => {
    const code = compileStatements([spawn()], 0)
    expect(code).toBe(
      'SZGame2D.spawn(asteroides, { x: 10, y: 20, w: 30, h: 30, color: "#9ca3af", vx: 0, vy: 2 });',
    )
  })

  it('COM nome declara a variável — a alça para animar logo depois', () => {
    const code = compileStatements([spawn({ varName: 'pedra' })], 0)
    expect(code).toBe(
      'const pedra = SZGame2D.spawn(asteroides, { x: 10, y: 20, w: 30, h: 30, color: "#9ca3af", vx: 0, vy: 2 });',
    )
  })

  it('a IR aceita os dois formatos (o campo é opcional)', () => {
    expect(JSStatementSchema.safeParse(spawn()).success).toBe(true)
    expect(JSStatementSchema.safeParse(spawn({ varName: 'pedra' })).success).toBe(true)
  })

  it('o parser reconhece as DUAS formas e devolve o mesmo bloco', () => {
    const semNome = parseJS(
      'SZGame2D.spawn(asteroides, { x: 10, y: 20, w: 30, h: 30, color: "#9ca3af", vx: 0, vy: 2 });',
    )
    expect(semNome[0]).toMatchObject({ type: 'g2d:spawnInGroup', groupVar: 'asteroides' })
    expect((semNome[0] as { varName?: string }).varName).toBeUndefined()

    const comNome = parseJS(
      'const pedra = SZGame2D.spawn(asteroides, { x: 10, y: 20, w: 30, h: 30, color: "#9ca3af", vx: 0, vy: 2 });',
    )
    expect(comNome[0]).toMatchObject({
      type: 'g2d:spawnInGroup',
      groupVar: 'asteroides',
      varName: 'pedra',
    })
  })

  it('sprite com imagem também aceita nome (ida e volta pelo código)', () => {
    const ir: JSStatement = {
      type: 'g2d:spawnImageInGroup',
      groupVar: 'inimigos',
      varName: 'bicho',
      x: num(0),
      y: num(0),
      w: num(16),
      h: num(16),
      image: 'inimigo',
      vx: num(0),
      vy: num(1),
    } as JSStatement
    const code = compileStatements([ir], 0)
    expect(code).toContain('const bicho = SZGame2D.spawn(inimigos,')
    expect(parseJS(code)[0]).toMatchObject({ type: 'g2d:spawnImageInGroup', varName: 'bicho' })
  })
})

describe('criar no grupo: o jogo que a criança monta roda', () => {
  interface Sprite {
    anim?: { from: number; to: number; fps: number; start: number }
  }
  interface Api {
    createGroup: () => { items: Sprite[] }
    spawn: (group: { items: Sprite[] }, opts: Record<string, unknown>) => Sprite | null
    loadSpriteSheet: (image: string, fw: number, fh: number) => unknown
    setAnimation: (s: Sprite, sheet: unknown, from: number, to: number, fps: number) => void
  }
  function load(): Api {
    const win = {
      addEventListener() {},
      SZGame2D: undefined,
      performance: { now: () => 0 },
    } as unknown as Record<string, unknown>
    new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
    return win.SZGame2D as Api
  }

  it('o sprite nomeado é o MESMO que entrou no grupo, e animar ele pega', () => {
    const api = load()
    const grupo = api.createGroup()
    const folha = api.loadSpriteSheet('pedra', 16, 16)

    // É isto que o código gerado faz: const pedra = SZGame2D.spawn(...)
    const pedra = api.spawn(grupo, { x: 0, y: 0, w: 16, h: 16, color: '#fff', vx: 0, vy: 2 })
    expect(pedra).not.toBeNull()
    expect(grupo.items[0]).toBe(pedra as Sprite)

    api.setAnimation(pedra as Sprite, folha, 0, 7, 10)
    expect((grupo.items[0] as Sprite).anim).toMatchObject({ from: 0, to: 7, fps: 10 })
  })

  it('cada um nasce com a PRÓPRIA animação (um não reinicia a do outro)', () => {
    const api = load()
    const grupo = api.createGroup()
    const folha = api.loadSpriteSheet('pedra', 16, 16)
    const a = api.spawn(grupo, { x: 0, y: 0, w: 16, h: 16, color: '#fff' }) as Sprite
    api.setAnimation(a, folha, 0, 7, 10)
    const b = api.spawn(grupo, { x: 40, y: 0, w: 16, h: 16, color: '#fff' }) as Sprite
    api.setAnimation(b, folha, 8, 11, 6)

    expect(a.anim).toMatchObject({ from: 0, to: 7, fps: 10 })
    expect(b.anim).toMatchObject({ from: 8, to: 11, fps: 6 })
    expect(grupo.items).toHaveLength(2)
  })
})

describe('criar no grupo: escopo do nome', () => {
  /** Monta o jogo inteiro (formato plano `js`) para exercitar a validação do schema. */
  function ir(rest: JSStatement[]) {
    return {
      html: [],
      css: [],
      js: [
        { type: 'g2d:createGroup', varName: 'asteroides' },
        {
          type: 'g2d:loadSpritesheet',
          varName: 'girando',
          image: 'pedra',
          frameW: num(16),
          frameH: num(16),
        },
        ...rest,
      ],
      extensions: [{ extensionId: 'game-2d' }],
    }
  }

  it('animar o sprite no MESMO trecho em que ele nasce é válido', () => {
    const parsed = SZIRSchema.safeParse(
      ir([
        {
          type: 'g2d:everySeconds',
          seconds: num(2),
          body: [
            spawn({ varName: 'pedra' }),
            {
              type: 'g2d:animateSprite',
              spriteVar: 'pedra',
              sheetVar: 'girando',
              from: num(0),
              to: num(7),
              fps: num(10),
            },
          ],
        } as JSStatement,
      ]),
    )
    expect(parsed.success).toBe(true)
  })

  it('usar o nome FORA do trecho onde ele nasce acusa (o sprite não existe lá)', () => {
    const parsed = SZIRSchema.safeParse(
      ir([
        {
          type: 'g2d:everySeconds',
          seconds: num(2),
          body: [spawn({ varName: 'pedra' })],
        } as JSStatement,
        {
          type: 'g2d:animateSprite',
          spriteVar: 'pedra',
          sheetVar: 'girando',
          from: num(0),
          to: num(7),
          fps: num(10),
        } as JSStatement,
      ]),
    )
    expect(parsed.success).toBe(false)
  })
})

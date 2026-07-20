import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import type { JSStatement } from '#ir'
import { gameTwoDRuntime } from '../runtime'

/**
 * ⭐ A REDE QUE FALTAVA — bloco → gerador → RUNTIME, executado de VERDADE.
 *
 * Na extensão irmã (gk) o `drawHearts` foi para PRODUÇÃO com os argumentos
 * trocados e os três testes existentes se cobriam sem NUNCA se cruzar: o de
 * runtime chamava a API na ordem certa à mão; o de exemplo comparava a STRING; o
 * blockAudit só conferia que o NOME do helper existe. Nenhum provava que o gerador
 * emite os argumentos na ordem que o RUNTIME espera.
 *
 * Aqui, para cada helper de desenho com >2 argumentos, compilamos a IR (a mesma
 * que o bloco produz) e RODAMOS o resultado no runtime real, com um ctx espião,
 * conferindo o EFEITO (o que foi pintado, ONDE). Todo draw novo com >2 args
 * merece um caso aqui.
 */

interface Rec {
  fillText: [string, number, number][]
  fillRect: [number, number, number, number][]
  fill: number
  moveTo: [number, number][]
  fillStyle: string[]
  textAlign: string[]
}

function spyCtx(rec: Rec) {
  return {
    canvas: { width: 640, height: 480 },
    set fillStyle(v: string) {
      rec.fillStyle.push(v)
    },
    get fillStyle() {
      return rec.fillStyle[rec.fillStyle.length - 1] ?? ''
    },
    set textAlign(v: string) {
      rec.textAlign.push(v)
    },
    get textAlign() {
      return rec.textAlign[rec.textAlign.length - 1] ?? ''
    },
    font: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    fillText: (t: string, x: number, y: number) => rec.fillText.push([t, x, y]),
    fillRect: (x: number, y: number, w: number, h: number) => rec.fillRect.push([x, y, w, h]),
    fill: () => {
      rec.fill += 1
    },
    moveTo: (x: number, y: number) => rec.moveTo.push([x, y]),
    beginPath() {},
    closePath() {},
    bezierCurveTo() {},
    arc() {},
    save() {},
    restore() {},
    measureText: () => ({ width: 10 }),
  }
}

/** Compila a IR do statement e RODA o JS resultante no runtime real com o ctx espião. */
function drawViaGenerator(
  stmt: JSStatement,
  variables: { jogador?: { hp?: number; hpMax?: number } } = {},
): Rec {
  const win = {
    addEventListener() {},
    performance: { now: () => 0 },
    devicePixelRatio: 1,
    SZGame2D: undefined,
  } as unknown as Record<string, unknown>
  new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
  const api = win.SZGame2D as Record<string, unknown>
  const rec: Rec = { fillText: [], fillRect: [], fill: 0, moveTo: [], fillStyle: [], textAlign: [] }
  const code = compileStatements([stmt], 0)
  new Function('SZGame2D', 'ctx', 'jogador', code)(api, spyCtx(rec), variables.jogador)
  return rec
}

const N = (value: number) => ({ type: 'num', value }) as unknown

describe('g2d — fiação bloco→gerador→runtime (executa de verdade)', () => {
  it('drawScore: "Placar:" 7 em (11,22) → fillText("Placar: 7", 11, 22)', () => {
    const stmt = {
      type: 'g2d:drawScore',
      ctxVar: 'ctx',
      label: 'Placar:',
      value: N(7),
      x: N(11),
      y: N(22),
      color: '#abcdef',
      size: N(33),
    } as unknown as JSStatement
    expect(compileStatements([stmt], 0).trim()).toBe(
      'SZGame2D.drawScore(ctx, "Placar:", 7, 11, 22, "#abcdef", 33);',
    )
    const rec = drawViaGenerator(stmt)
    expect(rec.fillText).toEqual([['Placar: 7', 11, 22]])
    expect(rec.fillStyle).toContain('#abcdef')
  })

  it('drawLabel: "Oi" em (11,22) alinhado ao centro → fillText no lugar, textAlign center', () => {
    const stmt = {
      type: 'g2d:drawLabel',
      ctxVar: 'ctx',
      text: 'Oi',
      x: N(11),
      y: N(22),
      color: '#abcdef',
      size: N(33),
      align: 'center',
    } as unknown as JSStatement
    const rec = drawViaGenerator(stmt)
    expect(rec.fillText).toEqual([['Oi', 11, 22]])
    expect(rec.textAlign).toContain('center')
  })

  it('⭐ drawHearts: 3 de 3 em (20,30) → TRÊS corações, o 1º EM (20,30) (não 3 corações em (3,3))', () => {
    const stmt = {
      type: 'g2d:drawHearts',
      ctxVar: 'ctx',
      count: N(3),
      x: N(20),
      y: N(30),
      size: N(22),
      color: '#ff0000',
    } as unknown as JSStatement
    expect(compileStatements([stmt], 0).trim()).toBe(
      'SZGame2D.drawHearts(ctx, 3, 20, 30, 22, "#ff0000");',
    )
    const rec = drawViaGenerator(stmt)
    // TRÊS corações (o count), não 22 nem 20 — a troca de args pintaria a quantidade errada.
    expect(rec.fill).toBe(3)
    // O 1º coração começa perto de (20,30): moveTo em (x + s/2, y + s*0.3) = (31, 36.6).
    expect(rec.moveTo[0]?.[0]).toBeCloseTo(31, 5)
    expect(rec.moveTo[0]?.[1]).toBeCloseTo(36.6, 5)
  })

  it('drawSpriteHealth lê as vidas do sprite e desenha corações automaticamente', () => {
    const stmt = {
      type: 'g2d:drawSpriteHealth',
      ctxVar: 'ctx',
      spriteVar: 'jogador',
      style: 'hearts',
      x: N(20),
      y: N(30),
      size: N(22),
      color: '#ff0000',
    } as unknown as JSStatement
    expect(compileStatements([stmt], 0).trim()).toBe(
      'SZGame2D.drawSpriteHealth(ctx, jogador, "hearts", 20, 30, 22, "#ff0000");',
    )

    const rec = drawViaGenerator(stmt, { jogador: { hp: 3, hpMax: 5 } })
    expect(rec.fill).toBe(3)
    expect(rec.moveTo[0]?.[0]).toBeCloseTo(31, 5)
  })

  it('drawSpriteHealth usa tamanho como largura e altura proporcional no formato barra', () => {
    const stmt = {
      type: 'g2d:drawSpriteHealth',
      ctxVar: 'ctx',
      spriteVar: 'jogador',
      style: 'bar',
      x: N(11),
      y: N(22),
      size: N(160),
      color: '#00ff00',
    } as unknown as JSStatement

    const rec = drawViaGenerator(stmt, { jogador: { hp: 3, hpMax: 4 } })
    expect(rec.fillRect).toContainEqual([11, 22, 160, 16])
    expect(rec.fillRect).toContainEqual([11, 22, 120, 16])
  })

  it('drawBar: valor 3/10 em (11,22) tam 44×8 → fundo cheio + preenchimento 30%', () => {
    const stmt = {
      type: 'g2d:drawBar',
      ctxVar: 'ctx',
      value: N(3),
      max: N(10),
      x: N(11),
      y: N(22),
      w: N(44),
      h: N(8),
      color: '#00ff00',
    } as unknown as JSStatement
    const rec = drawViaGenerator(stmt)
    // fundo: o retângulo INTEIRO em (11,22,44,8); preenchimento: 30% da largura.
    expect(rec.fillRect).toContainEqual([11, 22, 44, 8])
    expect(
      rec.fillRect.some(
        ([x, y, w, h]) => x === 11 && y === 22 && Math.abs(w - 13.2) < 1e-6 && h === 8,
      ),
    ).toBe(true)
  })
})

import { describe, expect, it } from 'bun:test'
import type { SZIR } from '#ir'
import { generateProjectFiles } from '../../generators'
import { parseProjectFiles } from '../../parsers'

const SNIPPET = `SZGame2D.defineShape("dino", (ctx) => {
  SZGame2D.paintRect(ctx, 20, 50, 8, 14, "#3f8f49");
  SZGame2D.paintRect(ctx, 34, 50, 8, 14, "#3f8f49");
  SZGame2D.paintTriangle(ctx, 8, 30, 8, 46, 0, 38, "#5fb45f");
  SZGame2D.paintRect(ctx, 8, 26, 40, 26, "#5fb45f");
  SZGame2D.paintRect(ctx, 38, 10, 22, 20, "#5fb45f");
  SZGame2D.paintTriangle(ctx, 16, 26, 20, 18, 24, 26, "#3f8f49");
  SZGame2D.paintTriangle(ctx, 26, 26, 30, 18, 34, 26, "#3f8f49");
  SZGame2D.paintCircle(ctx, 52, 18, 4, "#ffffff");
  SZGame2D.paintCircle(ctx, 53, 18, 2, "#20415c");
});`

/**
 * Regressão do bug 25/07: colar código DEPOIS do envelope de ciclo de vida (o
 * `SZGame2D.onStart(function __szProjectRun() {…}, "__sz-project");` que o gerador
 * emite) deixava o FECHAMENTO do envelope órfão no meio do arquivo — o strip só o
 * removia quando era a ÚLTIMA linha. O resto virava UM rawJS contendo o próprio
 * fechamento, que se re-embrulhava a cada ida e volta da Ponte e DUPLICAVA os
 * blocos existentes. Agora o fechamento é achado pela AST e o código colado
 * parseia como top-level normal.
 */
describe('Ponte — colar defineShape num projeto com conteúdo', () => {
  const ir: SZIR = {
    html: [],
    css: [],
    js: [
      {
        type: 'g2d:setupStage',
        width: { type: 'num', value: 480 },
        height: { type: 'num', value: 320 },
        bg: '#101820',
      },
      {
        type: 'g2d:createSprite',
        varName: 'dino',
        x: { type: 'num', value: 60 },
        y: { type: 'num', value: 200 },
        w: { type: 'num', value: 48 },
        h: { type: 'num', value: 48 },
        color: '#5fb45f',
      },
      { type: 'consoleLog', value: { type: 'str', value: 'oi' } },
    ],
    extensions: [{ extensionId: 'game-2d' }],
  }

  function statementTypes(parsed: ReturnType<typeof parseProjectFiles>): string[] {
    return parsed.behavior.start
      .concat(parsed.behavior.events, parsed.behavior.loops)
      .map((stmt) => stmt.type)
  }

  it('o trecho colado vira o bloco da figura e NADA duplica', () => {
    const files = generateProjectFiles({ ir, projectName: 'Dino' })
    const parsed = parseProjectFiles({
      'index.html': files['index.html'],
      'style.css': files['style.css'],
      'script.js': `${files['script.js']}\n${SNIPPET}\n`,
    })
    expect(statementTypes(parsed)).toEqual([
      'g2d:setupStage',
      'g2d:createSprite',
      'consoleLog',
      'g2d:defineShape',
    ])
  })

  it('FIXPOINT: gerar de novo e re-parsear fica estável (nada cresce entre idas da Ponte)', () => {
    const files = generateProjectFiles({ ir, projectName: 'Dino' })
    const pasted = parseProjectFiles({
      'index.html': files['index.html'],
      'style.css': files['style.css'],
      'script.js': `${files['script.js']}\n${SNIPPET}\n`,
    })
    const regenerated = generateProjectFiles({ ir: pasted, projectName: 'Dino' })
    const reparsed = parseProjectFiles(regenerated)
    expect(statementTypes(reparsed)).toEqual(statementTypes(pasted))
    // 2ª volta byte-estável: o código não muda mais (sem crescimento/duplicação).
    expect(generateProjectFiles({ ir: reparsed, projectName: 'Dino' })['script.js']).toBe(
      regenerated['script.js'],
    )
  })
})

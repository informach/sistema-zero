import { describe, expect, it } from 'bun:test'
import { collectCanvasContextSymbols, runtimeProvidedCanvasContexts } from '../canvasContexts'
import { validateProgrammingReferences } from '../programmingReferences'
import type { JSStatement } from '../schema'

const fillRect = (ctxVar: string): JSStatement =>
  ({
    type: 'canvasFillRect',
    ctxVar,
    x: { type: 'num', value: 0 },
    y: { type: 'num', value: 0 },
    w: { type: 'num', value: 32 },
    h: { type: 'num', value: 32 },
  }) as JSStatement

/**
 * Regressão do feedback 25/07: blocos de Canvas do NÚCLEO num jogo 2D acusavam
 * "pincel não preparado"/"não declarado" apesar de funcionarem — o `ctx` vem do
 * runtime (global preguiçoso do Preparar o jogo) ou do parâmetro da figura
 * (Desenhar a figura). O ferramental agora ENXERGA os dois.
 */
describe('canvas do núcleo × ctx do Jogo 2D', () => {
  it('dentro da figura (defineShape): ctx é parâmetro — sem issue de referência', () => {
    const js: JSStatement[] = [
      {
        type: 'g2d:defineShape',
        shapeName: 'pedra',
        body: [fillRect('ctx')],
      } as JSStatement,
    ]
    expect(validateProgrammingReferences(js)).toEqual([])
  })

  it('coletor de pincéis: uso LIGADO pelo corpo da figura não é uso órfão', () => {
    const js: JSStatement[] = [
      {
        type: 'g2d:defineShape',
        shapeName: 'pedra',
        body: [fillRect('ctx'), fillRect('outroPincel')],
      } as JSStatement,
    ]
    const { uses } = collectCanvasContextSymbols(js)
    // `ctx` está em escopo (parâmetro); `outroPincel` continua cobrado.
    expect(uses.map((use) => use.name)).toEqual(['outroPincel'])
  })

  it('runtime instalado entrega o ctx: game-2d → {ctx}; sem extensão → vazio', () => {
    expect([...runtimeProvidedCanvasContexts([{ extensionId: 'game-2d' }])]).toEqual(['ctx'])
    expect(runtimeProvidedCanvasContexts([]).size).toBe(0)
    expect(runtimeProvidedCanvasContexts(undefined).size).toBe(0)
  })

  it('canvas do núcleo FORA da figura: ok com o ctx do runtime; sem ele, cobra o preparo', () => {
    const js: JSStatement[] = [fillRect('ctx')]
    // Num jogo 2D o `ctx` global existe (Preparar o jogo) → nenhum aviso.
    expect(validateProgrammingReferences(js, ['js'], { providedCanvasContexts: ['ctx'] })).toEqual(
      [],
    )
    // Projeto SEM a extensão: o aviso pedagógico continua (use "Preparar a tela").
    const issues = validateProgrammingReferences(js)
    expect(issues).toHaveLength(1)
    expect(issues[0]?.message).toContain('pincel')
  })
})

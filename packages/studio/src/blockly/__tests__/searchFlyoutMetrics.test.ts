import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { SearchAwareFlyoutMetrics } from '../searchFlyoutMetrics'

/**
 * A rolagem do flyout da BUSCA.
 *
 * O espaço do campo de digitação é reservado por um separador no topo dos
 * resultados, e o separador do Blockly não tem DOM: o bounding box do canvas
 * (de onde sai a faixa rolável) não o conhece. Resultado: `G − MARGIN` pixels
 * inalcançáveis no rodapé, e o ÚLTIMO bloco do resultado cortado por mais que a
 * criança role.
 *
 * ⚠️ `bun test` não faz layout — o que se prova aqui é a ARITMÉTICA (a faixa
 * rolável alcança o fundo real do conteúdo). O pixel é QA de navegador.
 */

const MARGIN = 8

/** Só o que o cálculo lê: a escala do workspace e a margem do flyout. */
function metrics(scale = 1): SearchAwareFlyoutMetrics {
  const workspace = { scale } as unknown as Blockly.WorkspaceSvg
  const flyout = { MARGIN } as unknown as Blockly.IFlyout
  return new SearchAwareFlyoutMetrics(workspace, flyout)
}

/** Conteúdo em pixels: `top` é onde o primeiro bloco começa de fato. */
function regiao(top: number, height: number) {
  return { top, height, left: 0, width: 200 }
}

describe('rolagem do flyout da busca', () => {
  it('⭐ a faixa rolável alcança o FUNDO REAL do conteúdo da busca', () => {
    // Campo de 34px + 14px de respiro = separador de 48px; blocos somam 400px.
    // O primeiro bloco nasce em MARGIN + 48 = 56.
    const conteudo = regiao(56, 400)
    const alcance = metrics().getScrollMetrics(false, undefined, conteudo).height
    const fundoReal = conteudo.top + conteudo.height
    expect(alcance).toBeGreaterThanOrEqual(fundoReal)

    // E o cálculo CRU do Blockly não alcançava — é o defeito que isto conserta.
    const cru = new Blockly.FlyoutMetricsManager(
      { scale: 1 } as unknown as Blockly.WorkspaceSvg,
      { MARGIN } as unknown as Blockly.IFlyout,
    ).getScrollMetrics(false, undefined, conteudo).height
    expect(cru).toBeLessThan(fundoReal)
    expect(alcance - cru).toBe(48) // exatamente o separador que faltava
  })

  it('categoria NORMAL não muda em nada (o flyout é o mesmo para todas)', () => {
    // Sem separador, o conteúdo começa exatamente na margem.
    const conteudo = regiao(MARGIN, 400)
    const cru = new Blockly.FlyoutMetricsManager(
      { scale: 1 } as unknown as Blockly.WorkspaceSvg,
      { MARGIN } as unknown as Blockly.IFlyout,
    ).getScrollMetrics(false, undefined, conteudo)
    expect(metrics().getScrollMetrics(false, undefined, conteudo)).toEqual(cru)
  })

  it('conteúdo ACIMA da margem (bbox negativo) não encolhe a faixa', () => {
    const conteudo = regiao(-30, 400)
    const cru = new Blockly.FlyoutMetricsManager(
      { scale: 1 } as unknown as Blockly.WorkspaceSvg,
      { MARGIN } as unknown as Blockly.IFlyout,
    ).getScrollMetrics(false, undefined, conteudo)
    expect(metrics().getScrollMetrics(false, undefined, conteudo)).toEqual(cru)
  })

  it('com zoom, a compensação sai nas MESMAS unidades do resto da conta', () => {
    // Em coordenadas de workspace o Blockly divide tudo pela escala; a nossa
    // parcela tem que acompanhar, senão o conserto vira sobra (ou falta).
    const conteudo = regiao(56, 400)
    const emPixels = metrics(2).getScrollMetrics(false, undefined, conteudo).height
    const emWorkspace = metrics(2).getScrollMetrics(true, undefined, conteudo).height
    expect(emWorkspace).toBeCloseTo(emPixels / 2, 6)
  })

  it('medida quebrada do Blockly degrada para o cálculo original', () => {
    const workspace = { scale: 1 } as unknown as Blockly.WorkspaceSvg
    const quebrado = new SearchAwareFlyoutMetrics(
      workspace,
      {} as unknown as Blockly.IFlyout, // um upgrade que remova/renomeie o MARGIN
    )
    const conteudo = regiao(56, 400)
    const cru = new Blockly.FlyoutMetricsManager(
      workspace,
      {} as unknown as Blockly.IFlyout,
    ).getScrollMetrics(false, undefined, conteudo)
    expect(quebrado.getScrollMetrics(false, undefined, conteudo)).toEqual(cru)
  })
})

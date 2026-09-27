import { describe, expect, test } from 'bun:test'
import { PALETTES } from '@sistemazero/core/palette'
import { hexToRgb } from '../src/tokens/color'
import {
  auditPalette,
  auditTokens,
  describeFailure,
  knownContrastGaps,
  measureTokens,
  PAIRS_PER_PALETTE,
} from '../src/tokens/contrast'
import { derive } from '../src/tokens/derive'

/**
 * O contraste de TODA paleta, medido — e o teste enumera o catálogo, nunca nomeia uma cor. É
 * isso que faz um swatch novo passar por aqui sem ninguém lembrar de acrescentá-lo.
 */
describe('toda paleta continua legível', () => {
  test('⚠️⚠️ nenhuma dupla reprova, em nenhuma paleta', () => {
    const falhas = PALETTES.flatMap(auditPalette).map(describeFailure)
    expect(falhas).toEqual([])
  })

  test('as dívidas conhecidas seguem nos valores de hoje, e estão escritas', () => {
    // A catraca: elas não podem piorar em silêncio, e quem for pagá-las acha o porquê aqui.
    const gaps = knownContrastGaps()
    expect(gaps.length).toBeGreaterThan(0)
    for (const { label, gap, ratios } of gaps) {
      expect({ label, explicado: gap.why.length > 120 }).toEqual({ label, explicado: true })
      for (const [id, ratio] of Object.entries(ratios))
        expect({ label, id, acima: ratio >= gap.floor }).toEqual({ label, id, acima: true })
    }
  })

  test('⭐ o piso de cada dívida é JUSTO — ninguém a afrouxa sem alguém ver', () => {
    // Sem isto nada impediria trocar um `floor` por 3.5 e a dupla passar para sempre. O piso tem
    // de ficar colado no PIOR valor medido hoje: afrouxá-lo reprova aqui na hora.
    for (const { label, gap, min, ratios } of knownContrastGaps()) {
      const pior = Math.min(...Object.values(ratios))
      expect({ label, folga: Number((pior - gap.floor).toFixed(3)) < 0.06 }).toEqual({
        label,
        folga: true,
      })
      // E o piso é mesmo uma DÍVIDA: se ele já alcança o alvo, a exceção não deveria existir.
      expect({ label, aindaDevendo: gap.floor < min }).toEqual({ label, aindaDevendo: true })
    }
  })
})

/**
 * ⚠️⚠️ As três guardas anti-vácuo. Sem elas um teste de contraste passa por três caminhos
 * errados: medindo nada, não sabendo reprovar, ou aprovando uma paleta que zerou a cor.
 */
describe('a varredura não é de mentira', () => {
  test('mediu o que prometeu medir', () => {
    // ⚠️ Conta o que a auditoria REALMENTE devolveu. A versão anterior somava a constante num
    // laço e comparava com o mesmo produto — passava com a auditoria devolvendo `[]`.
    const medidas = PALETTES.flatMap((id) => measureTokens(derive(id), id))
    expect(medidas.length).toBe(PALETTES.length * PAIRS_PER_PALETTE)
    expect(PAIRS_PER_PALETTE).toBeGreaterThan(20)
    // E cada medição é um número de verdade, não um zero silencioso.
    for (const m of medidas) expect(Number.isFinite(m.ratio) && m.ratio >= 1).toBe(true)
  })

  test('⭐ o teste SABE reprovar: uma paleta deliberadamente ruim não passa', () => {
    const ruim = { ...derive('blue'), ink: '#dddddd', action: '#ffee00' }
    const falhas = auditTokens(ruim, 'paleta-de-teste-ruim')
    expect(falhas.map((f) => `${f.fg}/${f.bg}`)).toContain('ink/ground')
    expect(falhas.map((f) => `${f.fg}/${f.bg}`)).toContain('on-action/action')
  })

  /**
   * ⚠️ O modo de falha que estas três guardas existem para pegar é UM: alguém zerar o `t` da
   * receita dos neutros. Isso passaria em todo contraste (os neutros viram cinzas perfeitos) e
   * mataria em silêncio a promessa de a paleta inteira seguir a cor escolhida.
   *
   * O que elas deliberadamente NÃO cobram é que duas paletas quaisquer tenham chões
   * distinguíveis entre si: turquesa e verde são matizes vizinhas e de croma baixa no sRGB
   * (0,088 e 0,109), e os chões delas ficam a 2/255 — limite do monitor, não descuido. Quem as
   * separa é a ação (#00777c × #0b7a54), que é o que a pessoa vê nos botões e links.
   */
  test('⭐ zerar o tingimento não é jeito de passar: nenhum chão se repete', () => {
    const chaos = PALETTES.map((id) => derive(id).ground)
    expect(new Set(chaos).size).toBe(PALETTES.length)
  })

  test('⭐ e o tingimento é PERCEPTÍVEL onde a croma permite', () => {
    // Azul e rosa são as duas paletas aprovadas à mão, e as mais cromáticas: entre elas o chão
    // tem de andar de verdade. É o número da paleta que está em produção hoje.
    const a = hexToRgb(derive('blue').ground)
    const b = hexToRgb(derive('pink').ground)
    const distancia = Math.max(...a.map((c, k) => Math.abs(c - b[k]!) * 255))
    expect(distancia).toBeGreaterThanOrEqual(8)
  })

  test('⭐ e a ação de cada paleta é MESMO uma cor diferente', () => {
    const acoes = PALETTES.map((id) => derive(id).action)
    expect(new Set(acoes).size).toBe(PALETTES.length)
  })
})

import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { registerPtSearchCategory } from '../searchCategory'

/**
 * `searchCategory.ts` depende de internos PRIVADOS do Blockly/@blockly/toolbox-search
 * (createDom_, matchBlocks, flyoutItems_, blockSearcher, etc.), por isso o
 * comportamento completo só roda em e2e (precisa de um flyout/registro reais).
 *
 * O que dá pra provar SEM e2e é a degradação graciosa no ponto de entrada: se a
 * classe base registrada para `kind: 'search'` não expõe os métodos esperados
 * (incompatibilidade de versão do plugin), `registerPtSearchCategory()` NÃO pode
 * quebrar — deve virar no-op e deixar o registro intacto.
 */
const TOOLBOX_ITEM = Blockly.registry.Type.TOOLBOX_ITEM
const KIND = 'search'

describe('registerPtSearchCategory — guarda de compatibilidade', () => {
  it('degrada graciosamente (no-op, sem throw) quando a base não tem os internos esperados', () => {
    // Base "incompatível": é uma função (constrói algo), mas o prototype NÃO tem
    // createDom_/createIconDom_/createLabelDom_/getName/setSelected/dispose.
    class IncompatibleBase {}
    Blockly.registry.register(TOOLBOX_ITEM, KIND, IncompatibleBase as never, true)

    // Não pode lançar mesmo com a base incompatível.
    expect(() => registerPtSearchCategory()).not.toThrow()

    // E não pode ter sobrescrito o registro: a base segue sendo a nossa, ou seja,
    // a categoria PT-BR não foi instalada por cima de internos ausentes.
    const current = Blockly.registry.getClass(TOOLBOX_ITEM, KIND)
    expect(current).toBe(IncompatibleBase as never)
  })
})

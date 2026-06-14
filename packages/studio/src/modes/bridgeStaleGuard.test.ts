import { describe, expect, it } from 'bun:test'
import { isReverseParseResultStale } from './BridgeMode'

/**
 * Cobre o guard de obsolescência do handler de reverse-parse da Ponte. O bug
 * original: a staleness só comparava `requestId` contra o seq do lado-código.
 * Uma edição de BLOCO concorrente (regenerateFromBlocks atualiza o IR sem mexer
 * no seq) era então sobrescrita por um resultado código->blocos mais antigo que
 * ainda estava no worker. O `stateEpoch` fecha essa brecha.
 */
describe('isReverseParseResultStale', () => {
  it('não é obsoleto quando requestId casa e o epoch não avançou', () => {
    expect(
      isReverseParseResultStale({
        resultRequestId: 5,
        currentRequestSeq: 5,
        epochAtPost: 10,
        currentStateEpoch: 10,
      }),
    ).toBe(false)
  })

  it('é obsoleto quando o lado-código postou um pedido mais novo (requestId não casa)', () => {
    expect(
      isReverseParseResultStale({
        resultRequestId: 5,
        currentRequestSeq: 6,
        epochAtPost: 10,
        currentStateEpoch: 10,
      }),
    ).toBe(true)
  })

  it('é obsoleto quando uma edição de BLOCO avançou o epoch durante o reparse', () => {
    // requestId ainda casa (a edição de bloco NÃO bump o seq do lado-código),
    // mas o epoch avançou => o resultado código->blocos não pode clobberar a
    // edição de bloco mais nova. Era exatamente o cenário do bug.
    expect(
      isReverseParseResultStale({
        resultRequestId: 5,
        currentRequestSeq: 5,
        epochAtPost: 10,
        currentStateEpoch: 11,
      }),
    ).toBe(true)
  })

  it('é obsoleto quando AMBOS divergem (pedido novo + edição de bloco)', () => {
    expect(
      isReverseParseResultStale({
        resultRequestId: 5,
        currentRequestSeq: 7,
        epochAtPost: 10,
        currentStateEpoch: 12,
      }),
    ).toBe(true)
  })

  it('um único reparse aplicado (epoch igual no post e na chegada) não é dropado', () => {
    // Caso legítimo: nenhuma mudança de store entre o post e a chegada.
    let stateEpoch = 0
    // Post do pedido 1 no epoch atual.
    const epochAtPost = stateEpoch
    const requestSeq = 1
    // Chega o resultado do pedido 1 sem nenhuma edição no meio.
    expect(
      isReverseParseResultStale({
        resultRequestId: 1,
        currentRequestSeq: requestSeq,
        epochAtPost,
        currentStateEpoch: stateEpoch,
      }),
    ).toBe(false)
    // Agora simula uma edição de bloco APÓS o apply: o epoch avança, mas isso
    // só afetaria um PRÓXIMO pedido (que recapturaria epochAtPost).
    stateEpoch += 1
    expect(stateEpoch).toBe(1)
  })
})

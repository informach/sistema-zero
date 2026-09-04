/**
 * A régua do accordion POR MEDIDA da coluna direita do vetor (ver
 * `VectorRightColumn`): quando os painéis abertos não cabem, fecha o aberto há
 * mais tempo — nunca o último que sobrou (por construção, o recém-aberto).
 *
 * `recent` é a lista LRU (menos recente na FRENTE); `isCandidate` diz se a chave
 * está aberta E presente na tela (fechar um painel ausente não ganha altura e o
 * faria nascer recolhido quando aparecesse). Devolve a próxima vítima ou `null`
 * quando sobra um candidato só: daí em diante quem resolve é a rolagem.
 */
export function pickPanelToCollapse<K>(
  recent: readonly K[],
  isCandidate: (key: K) => boolean,
): K | null {
  const candidates = recent.filter(isCandidate)
  return candidates.length >= 2 ? (candidates[0] ?? null) : null
}

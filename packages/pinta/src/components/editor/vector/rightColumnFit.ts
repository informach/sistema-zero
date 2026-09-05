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
/**
 * ABRIR manda a chave para o FIM da lista LRU (vira a última a fechar).
 * Recolher NÃO chama isto: a lista fica como está. Já no fim → a MESMA
 * referência (nada mudou).
 */
export function touchRecent<K>(recent: readonly K[], key: K): readonly K[] {
  if (recent.at(-1) === key) return recent
  return [...recent.filter((k) => k !== key), key]
}

export function pickPanelToCollapse<K>(
  recent: readonly K[],
  isCandidate: (key: K) => boolean,
): K | null {
  const candidates = recent.filter(isCandidate)
  return candidates.length >= 2 ? (candidates[0] ?? null) : null
}

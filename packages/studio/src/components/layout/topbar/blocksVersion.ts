/**
 * A cópia em blocos de um Pro convertido ainda existe neste aparelho? (proposta aprovada em
 * 21/11/2026, "Abrir a versão em blocos"). `null` quando não deu para ler: o item fica ligado e
 * quem decide é a abertura. O banco dos projetos entra sob demanda, fora do pacote da barra.
 */
export async function blocksVersionExists(projectId: string): Promise<boolean | null> {
  try {
    const { loadProjectSummaryById } = await import('../../../state/persistence')
    return Boolean(await loadProjectSummaryById(projectId))
  } catch {
    return null
  }
}

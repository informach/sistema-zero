const shaPattern = /^[a-f0-9]{40}$/

export async function githubPages(get, path, field) {
  const rows = []
  for (let page = 1; page <= 20; page++) {
    const value = await get(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`)
    const items = field ? value[field] : value
    if (!Array.isArray(items)) throw new Error('Resposta GitHub inválida')
    rows.push(...items)
    if (field) {
      if (!Number.isSafeInteger(value.total_count) || value.total_count < rows.length)
        throw new Error('Contagem GitHub inválida')
      if (rows.length === value.total_count) return rows
    } else if (items.length < 100) return rows
    if (items.length === 0) throw new Error('Paginação GitHub incompleta')
  }
  throw new Error('Limite de paginação GitHub excedido')
}

/** Discovery only. The caller still proves the exact tree, CI attempt and plan. */
export async function findPromotedPullRequest(sha, get) {
  if (!shaPattern.test(sha ?? '')) throw new Error('SHA completo obrigatório')
  const associated = await githubPages(get, `/commits/${sha}/pulls`)
  // The commit association index can remain empty after a large merge. Read the
  // merged PR metadata from the closed list instead, with the same strict binding
  // to main, the merge SHA, internal repository and a unique valid head.
  const candidates = associated.length
    ? associated
    : await githubPages(get, '/pulls?state=closed&base=main&sort=updated&direction=desc')
  const eligible = candidates.filter(
    (pr) =>
      pr.merged_at &&
      pr.merge_commit_sha === sha &&
      pr.base?.ref === 'main' &&
      pr.head?.repo?.full_name === 'informach/sistema-zero',
  )
  if (
    eligible.length !== 1 ||
    !shaPattern.test(eligible[0].head?.sha ?? '') ||
    !Number.isSafeInteger(eligible[0].number) ||
    eligible[0].number <= 0
  )
    throw new Error('PR interno promovido único não encontrado')
  return eligible[0]
}

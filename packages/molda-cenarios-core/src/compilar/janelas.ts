/**
 * As janelas das regiões (lote 5 da conclusão do plano do Estúdio, 22/11/2026): o que o jogo
 * mantém carregado junto quando o personagem está numa região. A janela de uma região é ela, as
 * vizinhas e tudo o que é "de todas" (o que não aparece em lista de região nenhuma).
 *
 * O orçamento do Estúdio vale POR JANELA numa cena com regiões (decisão dela, 22/11/2026): cada
 * janela cabe em 48 malhas e em 128 MiB decodificados; os limites de arquivo continuam no total.
 * Cena sem regiões tem uma janela só, a cena inteira, e fica como era.
 */

interface RegiaoComListas {
  id: string
  vizinhas: readonly string[]
  nos: readonly string[]
  colisoes: readonly string[]
  aguas: readonly string[]
}

export interface ItensDasJanelas {
  regioes?: readonly RegiaoComListas[]
  nos: readonly { id: string; arquivo: string }[]
  colisoes: readonly { id: string; arquivo: string }[]
  aguas: readonly { id: string }[]
}

export interface JanelaDaRegiao {
  regiao: string
  nos: string[]
  colisoes: string[]
  aguas: string[]
}

/** Uma janela por região, na ordem das regiões; cada lista na ordem da cena. */
export function janelasDasRegioes(cena: ItensDasJanelas): JanelaDaRegiao[] {
  const regioes = cena.regioes ?? []
  if (!regioes.length) return []
  const porId = new Map(regioes.map((r) => [r.id, r]))
  const listados = (lista: 'nos' | 'colisoes' | 'aguas') =>
    new Set(regioes.flatMap((r) => r[lista]))
  const todos = { nos: listados('nos'), colisoes: listados('colisoes'), aguas: listados('aguas') }
  return regioes.map((regiao) => {
    const juntas = [regiao, ...regiao.vizinhas.map((v) => porId.get(v))].filter(
      (r): r is RegiaoComListas => r !== undefined,
    )
    const daJanela = (lista: 'nos' | 'colisoes' | 'aguas') => {
      const aqui = new Set(juntas.flatMap((r) => r[lista]))
      return (item: { id: string }) => aqui.has(item.id) || !todos[lista].has(item.id)
    }
    return {
      regiao: regiao.id,
      nos: cena.nos.filter(daJanela('nos')).map((n) => n.id),
      colisoes: cena.colisoes.filter(daJanela('colisoes')).map((c) => c.id),
      aguas: cena.aguas.filter(daJanela('aguas')).map((a) => a.id),
    }
  })
}

type ComArquivos = ItensDasJanelas & { arquivos: readonly { caminho: string; malhas?: number }[] }

/** As malhas de cada janela (a mesma conta do total: as malhas do arquivo de cada nó). */
export function malhasPorJanela(cena: ComArquivos): Record<string, number> {
  const malhas = new Map(cena.arquivos.map((a) => [a.caminho, a.malhas ?? 0]))
  const doNo = new Map(cena.nos.map((n) => [n.id, malhas.get(n.arquivo) ?? 0]))
  return Object.fromEntries(
    janelasDasRegioes(cena).map((j) => [
      j.regiao,
      j.nos.reduce((soma, id) => soma + (doNo.get(id) ?? 0), 0),
    ]),
  )
}

/** As malhas que o orçamento confere: as da maior janela, ou da cena inteira sem regiões. */
export function malhasDaMaiorJanela(cena: ComArquivos): number {
  if (!cena.regioes?.length) {
    const malhas = new Map(cena.arquivos.map((a) => [a.caminho, a.malhas ?? 0]))
    return cena.nos.reduce((soma, n) => soma + (malhas.get(n.arquivo) ?? 0), 0)
  }
  return Math.max(0, ...Object.values(malhasPorJanela(cena)))
}

/**
 * A memória decodificada de cada janela: os arquivos que os nós e as colisões dela usam, mais os
 * que não pertencem a região nenhuma (texturas do céu e do solo, alturas, o que é de todas).
 * `memoria` diz quanto cada arquivo ocupa decodificado; arquivo citado por duas janelas conta nas
 * duas.
 */
export function memoriaPorJanela(
  cena: ItensDasJanelas,
  memoria: ReadonlyMap<string, number>,
): Record<string, number> {
  const janelas = janelasDasRegioes(cena)
  if (!janelas.length) return {}
  const arquivoDoNo = new Map(cena.nos.map((n) => [n.id, n.arquivo]))
  const arquivoDaColisao = new Map(cena.colisoes.map((c) => [c.id, c.arquivo]))
  // Os arquivos citados por algum item que está em lista de região: os outros são de todas.
  const deRegiao = new Set<string>()
  for (const r of cena.regioes ?? []) {
    for (const id of r.nos) deRegiao.add(arquivoDoNo.get(id) ?? '')
    for (const id of r.colisoes) deRegiao.add(arquivoDaColisao.get(id) ?? '')
  }
  const listados = new Set((cena.regioes ?? []).flatMap((r) => [...r.nos, ...r.colisoes]))
  for (const n of cena.nos) if (!listados.has(n.id)) deRegiao.delete(n.arquivo)
  for (const c of cena.colisoes) if (!listados.has(c.id)) deRegiao.delete(c.arquivo)
  let deTodas = 0
  for (const [caminho, bytes] of memoria) if (!deRegiao.has(caminho)) deTodas += bytes
  return Object.fromEntries(
    janelas.map((j) => {
      const arquivos = new Set<string>()
      for (const id of j.nos) arquivos.add(arquivoDoNo.get(id) ?? '')
      for (const id of j.colisoes) arquivos.add(arquivoDaColisao.get(id) ?? '')
      let soma = deTodas
      for (const caminho of arquivos) if (deRegiao.has(caminho)) soma += memoria.get(caminho) ?? 0
      return [j.regiao, soma]
    }),
  )
}

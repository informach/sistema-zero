/**
 * Curadoria da CAIXA DE FERRAMENTAS — o professor escolhe o que a criança vê.
 *
 * Nasceu de um pedido direto: numa aula de desenho a tela não pode vir cheia de tudo. É o mesmo
 * papel que o `allowBlocks` faz no Estúdio, aplicado à caixa: lista NÃO-VAZIA mostra só aqueles
 * itens; ausente ou vazia mostra tudo (o Pinta solto nunca cura nada).
 *
 * ⭐ **Um id, vários editores.** Pixel, vetor e mapa compartilham vários ids (`select`, `line`,
 * `rect`, `ellipse`, `picker`, `pan`), então um preset é UMA lista e cada caixa a intersecta com o
 * próprio catálogo. Id que o editor não conhece é simplesmente ignorado — é o que deixa
 * "Só o essencial" significar a coisa certa nos três sem três listas para drifar.
 *
 * ⚠️ Curar ferramenta NÃO é curar painel. Camadas, Cores, Prévia e Aparência são outra coisa e
 * saem por `features`: escondê-los mexe no layout das colunas, que é calibrado (ver o CLAUDE.md
 * deste pacote).
 */

/** Item da caixa com id estável. Ferramentas, alternadores e ações do quadro entram igual. */
export interface CuratableTool {
  id: string
}

/**
 * As listas que o admin oferece como atalho. `tudo` não está aqui de propósito: "tudo" é a
 * AUSÊNCIA de curadoria, e representá-lo por uma lista obrigaria a mantê-la em dia a cada
 * ferramenta nova — exatamente o tipo de lista que apodrece em silêncio.
 */
export const PINTA_TOOL_PRESETS = {
  /**
   * Desenhar, apagar, pintar e pegar cor. O que basta para o primeiro desenho.
   *
   * ⚠️ `fit` ("Ajustar", só no vetor) entra até aqui porque é o único item da caixa que mexe só na
   * VISTA: quem aproximou demais pela rolagem precisa do caminho de volta.
   */
  essencial: ['pencil', 'brush', 'pen', 'eraser', 'fill', 'picker', 'fit'],
  /** O essencial mais formas, seleção e os ajustes da caixa. */
  livre: [
    'pencil',
    'brush',
    'pen',
    'eraser',
    'fill',
    'picker',
    'fit',
    'recolor',
    'select',
    'line',
    'rect',
    'ellipse',
    'polygon',
    'star',
    'text',
    'reshape',
    'pan',
    'grid',
    'mirror',
    'mirrorV',
    'filled',
  ],
} as const satisfies Record<string, readonly string[]>

export type PintaToolPreset = keyof typeof PINTA_TOOL_PRESETS

/** Lista curada ausente ou vazia = nada escondido. */
export function isToolAllowed(allow: readonly string[] | undefined, id: string): boolean {
  if (!allow || allow.length === 0) return true
  return allow.includes(id)
}

/** Filtra uma lista de itens da caixa preservando a ordem original. */
export function filterTools<T extends CuratableTool>(
  entries: readonly T[],
  allow: readonly string[] | undefined,
): T[] {
  if (!allow || allow.length === 0) return [...entries]
  return entries.filter((entry) => allow.includes(entry.id))
}

/**
 * A ferramenta que deve ficar ATIVA quando a curadoria corta a atual.
 *
 * ⚠️⚠️ Sem isto a criança fica com uma ferramenta selecionada que não está na tela: ela desenha
 * e não entende por quê, ou pior, não consegue trocar. O `PaletteBar` já segue essa régua ao
 * mudar de cor (`s.tool === 'eraser' → setTool('pencil')`).
 *
 * Devolve `null` quando a atual continua permitida (o chamador não mexe em nada) e quando não há
 * nenhuma alternativa — caixa vazia é erro de autoria, e trocar para um id inventado seria pior.
 */
export function toolFallback<T extends CuratableTool>(
  current: string,
  entries: readonly T[],
  allow: readonly string[] | undefined,
): string | null {
  if (isToolAllowed(allow, current)) return null
  const [first] = filterTools(entries, allow)
  return first ? first.id : null
}

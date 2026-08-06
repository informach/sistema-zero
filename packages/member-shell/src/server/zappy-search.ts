/**
 * Busca léxica do Zappy do Studio — extraída do zappy-ai.ts e reescrita para o
 * vocabulário de criança (QA 08/2026: "como faço ele pular?" punha
 * sz_html_image em 1º lugar porque "ele" casava por SUBSTRING com "elemento",
 * e "meu jogo não funciona" devolvia o começo do catálogo em ordem de índice).
 *
 * Regras: match por TOKEN (exato, ou prefixo quando o lado curto tem ≥4
 * chars), sinônimos infantis expandidos, stop-words do linguajar kid. Cada
 * termo da pergunta conta UMA vez, qual seja o sinônimo que casou.
 * Módulo PURO (sem server-only) para ser testável direto.
 */

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_:-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Tokens de um texto pesquisável. Além do espaço, quebra em `_ : -` para ids
 * de bloco renderem palavras (sz_g2d_jump_on_ground → jump, ground) — mas
 * mantém também a palavra inteira (pergunta com o id cru casa exato).
 */
export function tokenizeSearchable(value: string): Set<string> {
  const tokens = new Set<string>()
  for (const word of normalizeSearchText(value).split(' ')) {
    if (word.length > 1) tokens.add(word)
    for (const part of word.split(/[_:-]+/)) {
      if (part.length > 1) tokens.add(part)
    }
  }
  return tokens
}

export const SEARCH_STOP_WORDS = new Set([
  // núcleo original
  'a',
  'as',
  'como',
  'da',
  'de',
  'do',
  'e',
  'em',
  'eu',
  'faco',
  'faz',
  'fazer',
  'meu',
  'minha',
  'no',
  'o',
  'os',
  'para',
  'por',
  'que',
  'um',
  'uma',
  // linguajar de criança (QA 08/2026) — `jogo`/`bloco` NÃO entram: têm valor,
  // só pesam menos (o peso de categoria caiu no ranking).
  'quero',
  'queria',
  'preciso',
  'pode',
  'poderia',
  'ajuda',
  'ajudar',
  'agora',
  'tambem',
  'entao',
  'muito',
  'mais',
  'so',
  'ele',
  'ela',
  'eles',
  'elas',
  'isso',
  'esse',
  'essa',
  'este',
  'esta',
  'aqui',
  'ali',
  'nao',
  'sim',
  'oi',
  'tipo',
  'coisa',
  'negocio',
  'jeito',
])

/** Grupos de sinônimos do vocabulário infantil (sem acento — pós-normalização). */
const KID_SYNONYM_GROUPS: readonly (readonly string[])[] = [
  ['pular', 'pulo', 'pula', 'salto', 'saltar', 'jump'],
  ['colisao', 'colidir', 'encostar', 'bater', 'tocar', 'esbarrar', 'colide'],
  ['vida', 'vidas', 'hp', 'morrer', 'morre', 'dano', 'machucar'],
  ['ponto', 'pontos', 'pontuacao', 'placar', 'score'],
  ['atirar', 'tiro', 'tiros', 'bala', 'projetil', 'disparar', 'shoot'],
  ['inimigo', 'inimigos', 'vilao', 'monstro', 'chefe', 'chefao', 'boss'],
  ['fase', 'nivel', 'cena', 'mundo', 'level'],
  ['personagem', 'heroi', 'heroina', 'boneco', 'jogador', 'sprite', 'player'],
  ['fundo', 'cenario', 'paisagem', 'background'],
  ['mover', 'andar', 'correr', 'movimento', 'mexer', 'walk'],
  ['velocidade', 'rapido', 'devagar', 'lento', 'speed'],
  ['som', 'musica', 'barulho', 'audio', 'sound'],
  ['imagem', 'desenho', 'figura', 'foto', 'textura'],
  ['tecla', 'teclado', 'seta', 'setas', 'apertar', 'botao', 'key'],
  ['mouse', 'clique', 'clicar', 'cursor', 'toque', 'touch'],
  ['tempo', 'cronometro', 'timer', 'segundos', 'relogio'],
  ['gravidade', 'cair', 'queda', 'peso'],
  ['plataforma', 'chao', 'piso', 'parede', 'ground'],
  ['aleatorio', 'sortear', 'sorteio', 'random'],
  ['texto', 'palavra', 'frase', 'escrever', 'letreiro'],
  ['grupo', 'enxame', 'varios', 'muitos', 'bando'],
  ['mapa', 'tiles', 'tilemap', 'grade'],
  ['ganhar', 'vencer', 'vitoria', 'win'],
  ['fim', 'gameover', 'derrota', 'perder'],
]

const SYNONYMS = new Map<string, readonly string[]>()
for (const group of KID_SYNONYM_GROUPS) {
  for (const term of group) SYNONYMS.set(term, group)
}

/** Termos de busca da PERGUNTA (dedup, sem stop-words, teto 40). */
export function searchTerms(value: string): string[] {
  return [
    ...new Set(
      normalizeSearchText(value)
        .split(' ')
        .filter((term) => term.length > 1 && !SEARCH_STOP_WORDS.has(term)),
    ),
  ].slice(0, 40)
}

/** Um grupo por termo original: o termo + os sinônimos dele. */
export function expandedTerms(terms: readonly string[]): (readonly string[])[] {
  return terms.map((term) => SYNONYMS.get(term) ?? [term])
}

function tokenMatches(term: string, token: string): boolean {
  if (term === token) return true
  // Morfologia leve: prefixo COMUM ≥4 chars ("pulando"↔"pular" dividem
  // "pula"; "ele" nunca alcança "elemento" — o lado curto tem 3).
  const max = Math.min(term.length, token.length)
  if (max < 4) return false
  let shared = 0
  while (shared < max && term[shared] === token[shared]) shared += 1
  return shared >= 4
}

/**
 * Quantos TERMOS da pergunta casam com o conjunto de tokens (cada termo conta
 * uma vez, por qualquer sinônimo do grupo; fuzzy = prefixo comum ≥4 chars —
 * mata o "ele" ⊂ "elemento" e cobre flexões pular/pulando/pulou).
 */
export function scoreTokens(
  termGroups: readonly (readonly string[])[],
  tokens: ReadonlySet<string>,
): number {
  let hits = 0
  for (const group of termGroups) {
    let matched = false
    for (const term of group) {
      if (tokens.has(term)) {
        matched = true
        break
      }
      if (term.length < 4) continue
      for (const token of tokens) {
        if (tokenMatches(term, token)) {
          matched = true
          break
        }
      }
      if (matched) break
    }
    if (matched) hits += 1
  }
  return hits
}

/**
 * A pergunta está relatando que ALGO NÃO FUNCIONA como esperado?
 *
 * É o que separa "como faço o personagem pular?" (ensinar a mecânica) de "meu
 * personagem não pula" (diagnosticar o que ela já montou). Sem essa distinção,
 * toda pergunta virava aula: as receitas de mecânica entravam no prompt e o
 * modelo respondia o passo a passo do zero em vez de olhar o projeto.
 *
 * Puro e sobre texto normalizado (sem acento, minúsculo).
 */
// ⚠️ A negação é `nao|nunca|nem`, NUNCA `n[ao]{1,2}`: aquele padrão casava as
// PREPOSIÇÕES "no"/"na" e mandava "no meu jogo o personagem anda muito rápido"
// para o modo diagnóstico — ou seja, transformava um pedido de ajuste em caça a
// um defeito que não existe.
const NEGACAO = String.raw`\b(?:nao|nunca|nem)\b`
const FAILURE_MARKERS = [
  // negação + verbo de funcionamento ("não anda", "não tá funcionando", "não vai")
  new RegExp(
    `${NEGACAO}[^.!?]{0,30}\\b(funciona\\w*|anda\\w*|vai|move\\w*|aparece\\w*|acontece\\w*|sai\\w*|pula\\w*|abre|roda\\w*|responde\\w*|deixa|consigo|consegue)\\b`,
  ),
  // falha declarada
  /\b(bug\w*|bugou|quebr(?:ou|ando|a)|trav(?:ou|ando|a)|parou|para de|sumiu|some|desapareceu|errad\w+|estranho|zoad\w+)\b/,
  // erro nomeado
  /\berro\b|\bdeu ruim\b|\bnao deu certo\b/,
  // expectativa frustrada
  /\b(deveria|era pra|era para|tinha que|esperava)\b/,
  // pedido de revisão do que já existe
  new RegExp(`\\bo que (?:falta|esta errado|ta errado)\\b|\\bpor que\\b[^.!?]{0,40}${NEGACAO}`),
]

export function looksLikeDiagnosisQuestion(question: string): boolean {
  const normalized = normalizeSearchText(question)
  return FAILURE_MARKERS.some((pattern) => pattern.test(normalized))
}

/** Contrato de linguagem comum: detecta os antigos rótulos de navegação, não palavras escolares. */
export const PALAVRAS_DA_ESCOLA =
  /Concluir fase|(?:^|clique (?:em|na) )Próxima (?:fase|seção|etapa)|Mapa da Aventura|Caderno do Aluno|Enviar para o professor/i

/** A mesma régua, para achar TODAS as ocorrências de um texto (`matchAll`). */
export function palavrasDaEscola(texto: string): string[] {
  return [...texto.matchAll(new RegExp(PALAVRAS_DA_ESCOLA.source, 'gi'))].map((m) => m[0])
}

/**
 * "Guia" como PESSOA. Decisão da dona, 06/10/2026, à noite: "Enviar para o guia" soava estranho.
 * O botão de envio passou a dizer o que a criança envia ("Enviar meu projeto", "Enviar meu
 * desenho", "Enviar (1)"), e quem recebe e responde os recados é **a equipe** ("Recados da
 * equipe", "A equipe já viu o seu projeto."). "Guia" sobrou só no **Guia do Pensa**, que é o
 * painel das tarefas e não uma pessoa.
 *
 * A régua pega o artigo, a contração ou o possessivo colado ao nome ("o guia", "para o guia",
 * "ao guia", "do guia", "pelo seu guia") e o rótulo solto com inicial maiúscula (o autor "Guia" de
 * um recado), e deixa passar "Guia do Pensa" e "o guia do Pensa". "A guia" (o Fantasma do Pinta,
 * no Meu Jeito) não é pessoa, e o `meu-jeito.test.ts` a barra à parte. É a mesma régua do guarda
 * das telas do Kids (`GUIA_PESSOA` em `packages/community-kids/tests/copy-vocabulario.test.ts`).
 *
 * Quem lê: `qa/vocabulario-crianca.test.ts` (o manifesto e o roteiro inteiros, porque as notas
 * de gravação também citam os botões) e `docs/como-fazer/validar.ts`.
 */
export const GUIA_PESSOA =
  /\b(?:[Oo]|[Aa]o|[Dd]o|[Pp]elo|[Pp]ro|[Ss]eu|[Tt]eu|[Mm]eu|[Uu]m|[Nn]osso)\s+guia\b(?!\s+do\s+Pensa)|\bGuia\b(?!\s+do\s+Pensa)/

/** Todas as ocorrências de "guia" como pessoa num texto. */
export function guiasPessoa(texto: string): string[] {
  return [...texto.matchAll(new RegExp(GUIA_PESSOA.source, 'g'))].map((m) => m[0])
}

const MASCULINO =
  'o|os|do|dos|no|nos|num|nuns|um|uns|seu|seus|meu|meus|este|estes|esse|esses|neste|nestes|nesse|nesses|deste|destes|desse|desses|aquele|naquele|daquele|pelo|pelos|ao|aos|outro|outros'
const FEMININO =
  'a|as|da|das|na|nas|numa|uma|umas|sua|suas|minha|minhas|esta|estas|essa|essas|nesta|nestas|nessa|nessas|desta|destas|dessa|dessas|aquela|naquela|daquela|pela|pelas|à|às|outra|outras'
/** Ordinais: "próximo parte" está errado mesmo sem artigo na frente. */
const ORDEM_MASCULINO = 'próximos?|primeiros?|últimos?|segundos?|terceiros?'
const ORDEM_FEMININO = 'próximas?|primeiras?|últimas?|segundas?|terceiras?'
/** "Novo" e "mesmo" só depois do artigo: soltos, são advérbio ("é mesmo parte do jogo"). */
const ADJETIVO_MASCULINO = `${ORDEM_MASCULINO}|novos?|mesmos?`
const ADJETIVO_FEMININO = `${ORDEM_FEMININO}|novas?|mesmas?`

/**
 * Concordância depois da troca: curso, aula e seção eram masculino e feminino de outro jeito.
 * "Aventura", "fase" e "parte" são femininas, e "Mundo" é masculino. A troca palavra por palavra
 * deixa "o fase", "no parte", "um aventura", "próximo parte" ou "na Mundo". Casa o artigo, a
 * contração ou o possessivo colado ao nome, com ou sem um adjetivo no meio.
 *
 * "No fim da parte", "ao lado da parte" e "um pedaço da parte" não casam: o artigo da frente não
 * está colado ao nome. A borda é por letra (`\p{L}`), porque o `\b` do JavaScript não vê "à".
 */
export const CONCORDANCIA_ERRADA = new RegExp(
  String.raw`(?<!\p{L})(?:(?:${MASCULINO})\s+(?:(?:${ADJETIVO_MASCULINO})\s+)?|(?:${ORDEM_MASCULINO})\s+)(?:aventura|fase|parte|aula)s?(?!\p{L})` +
    String.raw`|(?<!\p{L})(?:(?:${FEMININO})\s+(?:(?:${ADJETIVO_FEMININO})\s+)?|(?:${ORDEM_FEMININO})\s+)(?:Mundo|curso)s?(?!\p{L})`,
  'iu',
)

/** Todas as concordâncias erradas de um texto. */
export function concordanciasErradas(texto: string): string[] {
  return [...texto.matchAll(new RegExp(CONCORDANCIA_ERRADA.source, 'giu'))].map((m) => m[0])
}

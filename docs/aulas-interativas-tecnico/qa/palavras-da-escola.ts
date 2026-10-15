/**
 * A régua única do vocabulário da aventura (Diretrizes Pedagógicas, seção 6, 06/10/2026).
 *
 * No que a criança vê ou ouve, curso é aventura, aula é fase, seção é parte, unidade é Mundo,
 * o Caderno do Aluno é o Mapa da Aventura e professor é a equipe (era "guia" até a noite de
 * 06/10/2026; ver `GUIA_PESSOA` abaixo). Por dentro (Admin, código, documentos da equipe) as
 * palavras da escola continuam valendo.
 *
 * Quem lê esta régua:
 * - `qa/vocabulario-crianca.test.ts`, no texto dos manifestos que vira tela;
 * - `validar-roteiros.py`, na narração e no Zappy dos roteiros. Ele lê ESTE arquivo e extrai o
 *   literal de `PALAVRAS_DA_ESCOLA`; por isso a regex fica num literal `/…/i` de uma linha só e
 *   usa só o que o `re` do Python também entende (sem `\p{…}`, sem flag `u`);
 * - `docs/como-fazer/validar.ts`, nos tutoriais do Como Fazer.
 *
 * "Caderno" segue proibido: a criança lê Mapa da Aventura. "Estudar" entra pelas formas do verbo
 * e de "estudo", e não por um prefixo, para não pegar "Estúdio" escrito sem acento ("estudio").
 * "Lição" entra. "Tarefa" não: no Pensa ela é o nome do cartão ("Concluir tarefa"), e no Corre,
 * Dino! é o objetivo do jogo que a descrição para o leitor de tela conta. A tarefa no sentido de
 * lição de casa fica para a leitura humana e para o guarda do Como Fazer, que a barra fora do
 * Pensa.
 */
export const PALAVRAS_DA_ESCOLA =
  /\b(?:aulas?|cursos?|professor(?:a|as|es)?|alun[oa]s?|seç(?:ão|ões)|cadernos?|etapas?|unidades?|atividades?|entregas?|entreg(?:ar|ue|ues|ou)|estud(?:ar|ando|e|os?)|trabalhos?|devolutivas?|liç(?:ão|ões)|formatura|diplomas?|nota m[ií]nima)\b/i

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
  String.raw`(?<!\p{L})(?:(?:${MASCULINO})\s+(?:(?:${ADJETIVO_MASCULINO})\s+)?|(?:${ORDEM_MASCULINO})\s+)(?:aventura|fase|parte)s?(?!\p{L})` +
    String.raw`|(?<!\p{L})(?:(?:${FEMININO})\s+(?:(?:${ADJETIVO_FEMININO})\s+)?|(?:${ORDEM_FEMININO})\s+)Mundos?(?!\p{L})`,
  'iu',
)

/** Todas as concordâncias erradas de um texto. */
export function concordanciasErradas(texto: string): string[] {
  return [...texto.matchAll(new RegExp(CONCORDANCIA_ERRADA.source, 'giu'))].map((m) => m[0])
}

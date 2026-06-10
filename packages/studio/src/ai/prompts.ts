import type { IDEMode } from '#core'
import type { ProjectContext } from './contracts'

/**
 * Builders de system prompt para cada operação. Texto em PT-BR.
 *
 * Estratégia de cache (OpenRouter / Anthropic): a parte estável do prompt
 * (papel, regras, contexto de extensões) deveria ficar no MESMO lugar entre
 * chamadas para maximizar cache hit. O conteúdo dinâmico (mensagem do
 * usuário, snippet sob foco) entra ao final.
 */

export interface BuildSystemOpts {
  mode: IDEMode
  /** Texto de promptContext concatenado de todas as extensões instaladas. */
  extensionContext?: string
}

const ROLE_BASE = `Você é o assistente educacional do Sistema Zero Studio,
uma IDE progressiva que ensina HTML, CSS, JavaScript, DOM e Canvas API
através de três modos: Blocos, Ponte e Código. Responda sempre em PT-BR,
de forma didática, curta e direta. Evite jargão técnico desnecessário.
Use exemplos quando ajudar. Nunca proponha bibliotecas externas — o núcleo
do produto é web puro. Quando o aluno usa uma extensão oficial, prefira a
API dessa extensão (ex.: SZGame2D) ao invés de bibliotecas de mercado.`

const MODE_GUIDE: Record<IDEMode, string> = {
  blocks: `O aluno está no MODO BLOCOS. Explique em linguagem simples, sem
mostrar código. Sugira blocos pelo nome quando relevante (ex.: "use o
bloco Criar título h1").`,
  bridge: `O aluno está no MODO PONTE. Compare blocos e código equivalentes.
Mostre que cada bloco vira uma linha (ou pequeno trecho) de código real.
Quando algo não é representável em blocos, explique que está marcado como
"Código avançado" e por quê.`,
  code: `O aluno está no MODO CÓDIGO. Pode agir como par programador.
Sugira refatorações, aponte bugs, mas peça confirmação antes de propor
edições. Use snippets pequenos e legíveis.`,
}

const PROJECT_CONTEXT_MAX_CHARS = 12_000
const PROJECT_CONTEXT_STRING_PREVIEW = 500

export function buildSystemPrompt(opts: BuildSystemOpts): string {
  const parts = [ROLE_BASE, MODE_GUIDE[opts.mode]]
  if (opts.extensionContext) {
    parts.push(`Extensões instaladas no projeto:\n${opts.extensionContext}`)
  }
  return parts.join('\n\n')
}

export function buildBlockExplainPrompt(blockSummary: string): string {
  return `Explique este bloco e o que ele faz. Diga em uma frase para que
serve, depois 2-3 bullets do que acontece quando ele roda.\n\nBloco:\n${blockSummary}`
}

export function buildCodeExplainPrompt(code: string, lang: string): string {
  return `Explique este trecho de ${lang.toUpperCase()} para um aluno
iniciante. Não reescreva — apenas comente o que faz.\n\n\`\`\`${lang}\n${code}\n\`\`\``
}

export function buildErrorExplainPrompt(message: string, stack?: string): string {
  return `Apareceu este erro no preview do projeto do aluno. Explique a causa
provável em linguagem simples e sugira o que verificar primeiro.\n\nErro: ${message}${
    stack ? `\nStack:\n${stack}` : ''
  }`
}

export function buildSuggestNextStepPrompt(ctx: ProjectContext): string {
  const exts = ctx.installedExtensions.length
    ? `Extensões instaladas: ${ctx.installedExtensions.join(', ')}.`
    : 'Sem extensões instaladas.'
  return `O aluno está trabalhando em "${ctx.projectName}" no modo ${ctx.mode}.
${exts} Sugira um próximo passo pequeno e factível (1-2 frases).`
}

export function buildFreeFormProjectPrompt(question: string, ctx: ProjectContext): string {
  return `Pergunta do aluno: ${question}

Contexto atual do projeto (resumido e limitado):
${summarizeProjectContext(ctx)}

Responda usando esse contexto quando ele for relevante. Se faltar informação, diga o que
o aluno deve selecionar, executar ou verificar primeiro.`
}

function summarizeProjectContext(ctx: ProjectContext): string {
  const compact = JSON.stringify(
    ctx,
    (_key, value: unknown) => {
      if (typeof value === 'string' && value.length > PROJECT_CONTEXT_STRING_PREVIEW) {
        return `${value.slice(0, PROJECT_CONTEXT_STRING_PREVIEW)}... [truncado]`
      }
      return value
    },
    2,
  )
  return compact.length > PROJECT_CONTEXT_MAX_CHARS
    ? `${compact.slice(0, PROJECT_CONTEXT_MAX_CHARS)}\n... [contexto truncado]`
    : compact
}

export function buildChallengePrompt(level: 'iniciante' | 'intermediario'): string {
  return `Crie um desafio de programação web para nível ${level}. Use HTML/CSS/JS
puros. Descreva em 3-5 frases: objetivo, dica de blocos a usar, e como saber
que terminou. Não dê a solução.`
}

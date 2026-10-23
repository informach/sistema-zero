import { stableJson } from '../shared/stable-json'

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * O que decide a revisão de um bloco. Exemplos privados do Estúdio ficam de fora: seu conteúdo
 * nunca vai à criança e não muda a pergunta, então corrigi-lo não pode zerar o progresso de quem
 * já está na aula (a revisão da parte é feita das revisões dos blocos dela).
 */
export function blockRevisionFingerprint(content: unknown): string {
  if (
    record(content) &&
    content.kind === 'studio' &&
    ('solutionProject' in content || 'projectExamples' in content)
  ) {
    const { solutionProject: _solution, projectExamples: _examples, ...rest } = content
    return stableJson(rest)
  }
  return stableJson(content)
}

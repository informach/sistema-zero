import { stableJson } from '../shared/stable-json'

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * O que decide a revisão de um bloco. O gabarito do Estúdio (`solutionProject`) fica de fora: ele
 * nunca vai à criança e não muda a pergunta, então corrigi-lo não pode zerar o progresso de quem
 * já está na aula (a revisão da parte é feita das revisões dos blocos dela).
 */
export function blockRevisionFingerprint(content: unknown): string {
  if (record(content) && content.kind === 'studio' && 'solutionProject' in content) {
    const { solutionProject: _solution, ...rest } = content
    return stableJson(rest)
  }
  return stableJson(content)
}

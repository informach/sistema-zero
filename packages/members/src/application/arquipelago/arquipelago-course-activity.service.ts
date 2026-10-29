import { ValidationError } from '@sistemazero/core/errors'

/**
 * Espelhos dos tetos de `arquipelago-contracts/src/membros.ts` (o Members não importa o contrato;
 * o jogo valida a resposta com ele): até 20 pessoas, janela de até 9 dias, até 500 aulas por pessoa.
 */
export const AULAS_CONCLUIDAS_MAXIMO_DE_PESSOAS = 20
export const JANELA_DAS_AULAS_CONCLUIDAS_MAXIMA_MS = 9 * 86_400_000
export const AULAS_CONCLUIDAS_MAXIMO = 500

export interface AulasConcluidas {
  usuarios: { userId: string; concluidasEm: string[] }[]
}

/**
 * A hora das aulas concluídas de algumas pessoas numa janela curta (29/10/2026), para o serviço
 * do jogo dizer aos pais se a criança concluiu aula depois de jogar. Só leitura; quem decide de
 * quem pode perguntar é o serviço do jogo (crianças ligadas à conta do responsável).
 */
export class ArquipelagoCourseActivityService {
  constructor(
    private readonly repo: {
      completedBetween(
        userIds: readonly string[],
        from: Date,
        to: Date,
        limit: number,
      ): Promise<{ userId: string; completedAt: Date }[]>
    },
  ) {}

  async concluidas(input: { usuarios: string[]; de: Date; ate: Date }): Promise<AulasConcluidas> {
    const usuarios = [...new Set(input.usuarios.map((id) => id.toLowerCase()))]
    if (usuarios.length === 0 || usuarios.length > AULAS_CONCLUIDAS_MAXIMO_DE_PESSOAS)
      throw new ValidationError('Pessoas fora do limite')
    const janela = input.ate.getTime() - input.de.getTime()
    if (!(janela >= 0 && janela <= JANELA_DAS_AULAS_CONCLUIDAS_MAXIMA_MS))
      throw new ValidationError('Janela fora do limite')
    const linhas = await this.repo.completedBetween(
      usuarios,
      input.de,
      input.ate,
      usuarios.length * AULAS_CONCLUIDAS_MAXIMO,
    )
    const porPessoa = new Map<string, string[]>(usuarios.map((id) => [id, []]))
    for (const linha of linhas) {
      const lista = porPessoa.get(linha.userId.toLowerCase())
      if (lista && lista.length < AULAS_CONCLUIDAS_MAXIMO)
        lista.push(linha.completedAt.toISOString())
    }
    return {
      usuarios: usuarios.map((userId) => ({ userId, concluidasEm: porPessoa.get(userId) ?? [] })),
    }
  }
}

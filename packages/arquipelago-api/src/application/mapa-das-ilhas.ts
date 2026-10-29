import { conferirMapaDasIlhas, type ProblemaDoMapa } from '@sistemazero/arquipelago-contracts'
import type { Logger } from '@sistemazero/core/logging'
import type { PortaDosMembros } from '../domain/membros.port'

export type SituacaoDoMapa =
  | { situacao: 'desligada' }
  | { situacao: 'pendente' }
  | { situacao: 'ok'; em: Date }
  | { situacao: 'com-problemas'; em: Date; problemas: ProblemaDoMapa[] }
  | { situacao: 'indisponivel'; em: Date }

/**
 * Confere o mapa ilha → posto do contrato contra a jornada publicada no Members. Nunca impede o
 * serviço de subir: o resultado vai para o log (`arquipelago.mapa_das_ilhas_invalido`), para o
 * `/readyz` (que continua 200) e, depois, para o Admin do jogo.
 */
export class ConferenciaDoMapa {
  private atual: SituacaoDoMapa

  constructor(
    private readonly membros: PortaDosMembros | null,
    private readonly logger: Pick<Logger, 'info' | 'warn'>,
    private readonly agora: () => Date = () => new Date(),
  ) {
    this.atual = membros ? { situacao: 'pendente' } : { situacao: 'desligada' }
  }

  situacao(): SituacaoDoMapa {
    return this.atual
  }

  async conferir(): Promise<SituacaoDoMapa> {
    if (!this.membros) return this.atual
    try {
      const problemas = conferirMapaDasIlhas(await this.membros.lerJornada())
      this.atual =
        problemas.length === 0
          ? { situacao: 'ok', em: this.agora() }
          : { situacao: 'com-problemas', em: this.agora(), problemas }
      if (problemas.length > 0)
        this.logger.warn('arquipelago.mapa_das_ilhas_invalido', { problemas })
      else this.logger.info('arquipelago.mapa_das_ilhas_ok', {})
    } catch (erro) {
      this.atual = { situacao: 'indisponivel', em: this.agora() }
      this.logger.warn('arquipelago.mapa_das_ilhas_sem_members', {
        motivo: erro instanceof Error ? erro.name : 'desconhecido',
      })
    }
    return this.atual
  }
}

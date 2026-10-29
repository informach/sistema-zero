import type { CurriculoDeBlocos, JogadorDosMembros } from '@sistemazero/arquipelago-contracts'
import type { Jogador } from '../domain/jogador'
import type { PortaDosMembros, PublicoDosMembros } from '../domain/membros.port'
import { PlataformaIndisponivelError } from './erros'

/** O currículo muda quando a equipe publica curso: 5 minutos de cache bastam. */
export const VALIDADE_DO_CURRICULO_MS = 5 * 60_000
/** O posto e os blocos da pessoa mudam quando ela conclui curso: 30 segundos. */
export const VALIDADE_DO_JOGADOR_MS = 30_000
/** Teto de pessoas no cache do processo (a mais antiga sai primeiro). */
const MAXIMO_DE_JOGADORES = 5_000

interface Guardado<T> {
  valor: Promise<T>
  ate: number
}

/**
 * As leituras do Members que o jogo usa (posto, blocos e currículo), com cache curto no processo.
 * Sem Members configurado, ou com ele fora, responde `PlataformaIndisponivelError` (424): só os
 * desafios e os cartões desligam, o resto do jogo segue.
 */
export class LeiturasDosMembros {
  private readonly curriculos = new Map<PublicoDosMembros, Guardado<CurriculoDeBlocos>>()
  private readonly jogadores = new Map<string, Guardado<JogadorDosMembros>>()

  constructor(
    private readonly membros: PortaDosMembros | null,
    private readonly agora: () => number = () => Date.now(),
  ) {}

  ligadas(): boolean {
    return this.membros !== null
  }

  curriculo(publico: PublicoDosMembros): Promise<CurriculoDeBlocos> {
    const membros = this.exigir()
    return this.lembrar(this.curriculos, publico, VALIDADE_DO_CURRICULO_MS, () =>
      membros.lerCurriculo(publico),
    )
  }

  jogador(jogador: Jogador): Promise<JogadorDosMembros> {
    const membros = this.exigir()
    const audience = publicoDosMembros(jogador)
    // Adulto: a conta é a própria pessoa. Kids: o perfil e a conta da família.
    const accountId = jogador.contaId ?? jogador.id
    const chave = `${audience}:${jogador.id}`
    if (this.jogadores.size >= MAXIMO_DE_JOGADORES && !this.jogadores.has(chave)) {
      const maisAntiga = this.jogadores.keys().next().value
      if (maisAntiga !== undefined) this.jogadores.delete(maisAntiga)
    }
    return this.lembrar(this.jogadores, chave, VALIDADE_DO_JOGADOR_MS, () =>
      membros.lerJogador({ userId: jogador.id, accountId, audience }),
    )
  }

  /**
   * A hora das aulas concluídas de cada pessoa (id em minúsculas) entre `de` e `ate`. Sem cache:
   * só a área dos pais pergunta. Falha ou formato estranho: `PlataformaIndisponivelError`.
   */
  async aulasConcluidas(
    usuarios: readonly string[],
    de: Date,
    ate: Date,
  ): Promise<Map<string, Date[]>> {
    const membros = this.exigir()
    try {
      const r = await membros.lerAulasConcluidas({ usuarios: [...usuarios], de, ate })
      return new Map(
        r.usuarios.map((u) => [u.userId.toLowerCase(), u.concluidasEm.map((h) => new Date(h))]),
      )
    } catch (erro) {
      throw new PlataformaIndisponivelError(erro)
    }
  }

  private exigir(): PortaDosMembros {
    if (!this.membros) throw new PlataformaIndisponivelError()
    return this.membros
  }

  private lembrar<K, T>(
    mapa: Map<K, Guardado<T>>,
    chave: K,
    validade: number,
    ler: () => Promise<T>,
  ): Promise<T> {
    const agora = this.agora()
    const guardado = mapa.get(chave)
    if (guardado && guardado.ate > agora) return guardado.valor
    // Pedidos iguais ao mesmo tempo dividem a ida; falha não fica no cache.
    const valor = ler().catch((erro: unknown) => {
      if (mapa.get(chave)?.valor === valor) mapa.delete(chave)
      throw new PlataformaIndisponivelError(erro)
    })
    mapa.set(chave, { valor, ate: agora + validade })
    return valor
  }
}

export function publicoDosMembros(jogador: Pick<Jogador, 'publico'>): PublicoDosMembros {
  return jogador.publico === 'kids' ? 'kids' : 'adult'
}

/**
 * Visitas de outras crianças (N08a): o convite de cada criança anfitriã (só o hash do código) e
 * as casas que cada família aceitou. As permissões e o salvamento vêm da família.
 */
export interface RepositorioDasVisitasDeAmigos {
  /** Quais destas crianças têm convite ativo. */
  convitesAtivos(perfis: readonly string[]): Promise<Set<string>>
  /** Só quem já guardou o jogo. Substitui o código anterior. `false` sem salvamento. */
  gerarConvite(perfilId: string, contaId: string, hash: string, agora: Date): Promise<boolean>
  apagarConvite(perfilId: string, contaId: string): Promise<void>
  /** O convite deste código: a criança anfitriã e a conta dela. */
  conviteDoCodigo(hash: string): Promise<{ perfilId: string; contaId: string } | null>
  /**
   * Guarda a casa aceita pela família visitante (o mesmo par atualiza o apelido). `null` quando a
   * família já tem o máximo de casas.
   */
  aceitar(
    contaVisitante: string,
    perfilAnfitriao: string,
    apelido: string,
    agora: Date,
    maximo: number,
  ): Promise<string | null>
  remover(contaVisitante: string, id: string): Promise<void>
  /** As casas aceitas por esta família, com a criança e a conta de quem mora (para conferir). */
  casasDaConta(contaVisitante: string): Promise<
    {
      id: string
      apelido: string
      perfilAnfitriao: string
      contaAnfitria: string | null
      conviteAtivo: boolean
    }[]
  >
}

export class CasaDeAmigoIndisponivelError extends Error {
  constructor() {
    super('Esta casa não está disponível para visita.')
  }
}

export class VisitasDeAmigosDesligadasError extends Error {
  constructor() {
    super('As visitas de outras crianças estão desligadas pelos responsáveis')
  }
}

export class LimiteDeCasasError extends Error {
  constructor() {
    super('A família já guardou o máximo de casas de amigos. Remova uma para aceitar outra.')
  }
}

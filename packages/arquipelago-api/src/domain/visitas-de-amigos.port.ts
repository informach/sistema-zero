/**
 * Visitas de outras crianças (N08a): o convite de cada criança anfitriã (só o hash do código) e
 * as casas que cada família aceitou. As permissões e o salvamento vêm da família.
 */
export interface RepositorioDasVisitasDeAmigos {
  /** Quais destas crianças têm convite ativo. */
  convitesAtivos(perfis: readonly string[]): Promise<Set<string>>
  /**
   * Só quem já guardou o jogo. Substitui o código anterior e apaga as casas aceitas com ele (um
   * código novo pede aceite novo). `false` sem salvamento.
   */
  gerarConvite(perfilId: string, contaId: string, hash: string, agora: Date): Promise<boolean>
  /** Apaga o convite e, na mesma transação, as casas aceitas com ele. */
  apagarConvite(perfilId: string, contaId: string): Promise<void>
  /** O convite deste código: a criança anfitriã e a conta dela. */
  conviteDoCodigo(hash: string): Promise<{ perfilId: string; contaId: string } | null>
  /**
   * Guarda a casa aceita pela família visitante (o mesmo par atualiza o apelido), numa transação
   * que confere o convite de novo: `sem-convite` quando o código foi apagado ou trocado, `limite`
   * quando a família já tem o máximo de casas. Aceites da mesma família são serializados.
   */
  aceitar(
    contaVisitante: string,
    convite: { perfilId: string; hash: string },
    apelido: string,
    agora: Date,
    maximo: number,
  ): Promise<ResultadoDoAceite>
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

export type ResultadoDoAceite =
  | { situacao: 'ok'; id: string }
  | { situacao: 'limite' }
  | { situacao: 'sem-convite' }

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

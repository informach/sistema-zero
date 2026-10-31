import {
  type ConcluirProfissao,
  ConcluirProfissaoSchema,
  type Plataforma,
  POSTOS_DA_VILA,
  type PostoDaVila,
  type SessaoDaProfissao,
  SessaoDaProfissaoSchema,
} from '@sistemazero/arquipelago-contracts'

export interface GuardaDosTurnos {
  getItem(chave: string): string | null
  setItem(chave: string, valor: string): void
  removeItem(chave: string): void
}

/** Só a confirmação ainda sem resposta. O serviço decide se houve crédito e quanto vale. */
export function criarFilaDosTurnos(
  plataforma: Pick<Plataforma, 'publico' | 'perfil' | 'servico'>,
  guarda: GuardaDosTurnos,
) {
  const chave = (posto: PostoDaVila) =>
    `arquipelago:profissoes:v1:${plataforma.publico}:${encodeURIComponent(plataforma.perfil.id)}:${posto}`
  const ler = (posto: PostoDaVila) => {
    const bruto = guarda.getItem(chave(posto))
    if (bruto === null) return null
    // Corrupção não é silêncio nem autorização para apagar uma entrega ainda não confirmada.
    return { bruto, pedido: ConcluirProfissaoSchema.parse(JSON.parse(bruto)) }
  }
  const enviar = async (posto: PostoDaVila): Promise<SessaoDaProfissao | null> => {
    const entrada = ler(posto)
    if (!entrada) return null
    const resposta = await plataforma.servico.buscar('/profissoes/concluir', {
      metodo: 'POST',
      corpo: entrada.pedido,
    })
    const sessao = resposta.status === 200 ? SessaoDaProfissaoSchema.parse(resposta.corpo) : null
    if (!sessao?.concluido || sessao.id !== entrada.pedido.sessao || sessao.posto !== posto)
      throw new Error('A confirmação do turno não chegou. Tente novamente.')
    // Pendente/teto já estão no servidor e sobrevivem a outro aparelho. Nunca limpar outra entrega.
    if (guarda.getItem(chave(posto)) === entrada.bruto) guarda.removeItem(chave(posto))
    return sessao
  }
  return {
    guardar(posto: PostoDaVila, pedido: ConcluirProfissao) {
      const validado = ConcluirProfissaoSchema.parse(pedido)
      const anterior = ler(posto)
      if (anterior && anterior.pedido.sessao !== validado.sessao)
        throw new Error('Confirme o turno anterior antes de começar outro.')
      const valor = JSON.stringify(validado)
      guarda.setItem(chave(posto), valor)
      if (guarda.getItem(chave(posto)) !== valor)
        throw new Error('Não foi possível guardar a entrega neste aparelho.')
    },
    enviar,
    async retomar() {
      for (const posto of POSTOS_DA_VILA) await enviar(posto)
    },
  }
}

export function recadoDoPagamento(sessao: SessaoDaProfissao): string {
  switch (sessao.pagamento) {
    case 'creditado':
      return `${sessao.moedas} moedas confirmadas pelo turno de hoje.`
    case 'teto':
      return 'O limite semanal foi alcançado. As moedas estão guardadas para uma próxima semana.'
    case 'pendente':
      return 'O turno foi guardado. As moedas serão retomadas quando você abrir um balcão.'
    case 'aguardando':
      return 'Atenda os seis pedidos para confirmar as moedas.'
  }
}

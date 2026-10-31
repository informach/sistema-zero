import {
  type CompraDeInsumos,
  CompraDeInsumosPendenteSchema,
  CompraDeInsumosSchema,
  ConflitoDeSalvamentoSchema,
  diaDeSaoPaulo,
  type EntregarPedido,
  EntregarPedidoSchema,
  type Insumo,
  type ItensDaVenda,
  type MoradorDoPedido,
  PedidosPendentesSchema,
  prepararEntregaDeInsumos,
  prepararEntregaDoPedido,
  prepararVendaNaFeira,
  type ResultadoDaCompraDeInsumos,
  ResultadoDaCompraDeInsumosSchema,
  type ResultadoDaVenda,
  ResultadoDaVendaSchema,
  type ResultadoDoPedido,
  ResultadoDoPedidoSchema,
  type Salvamento,
  type SalvamentoGuardado,
  SalvamentoGuardadoSchema,
  type ServicoDoJogo,
  VendasPendentesSchema,
  type VenderNaFeira,
  VenderNaFeiraSchema,
} from '@sistemazero/arquipelago-contracts'
import type { ArmazemDeSalvamento, RascunhoDoJogo } from './armazem-salvamento'
import { conciliarSalvamento, mesmosDados } from './conciliar-salvamento'

export type SituacaoDoSalvamento =
  | 'ok'
  | 'offline'
  | 'conflito'
  | 'erro-local'
  | 'recusado'
  | 'confirmando'

class RespostaDeSalvamentoError extends Error {
  constructor(readonly status: number) {
    super(`Salvamento recusado (${status})`)
  }
}

/** A banca recusou a venda sem consumir nada (`VENDA_REPETIDA`: já vendeu hoje). */
export class VendaRecusadaNoServicoError extends RespostaDeSalvamentoError {
  constructor(
    status: number,
    readonly codigo: string | null,
  ) {
    super(status)
  }
}

type ResultadoDaOperacao = ResultadoDaCompraDeInsumos | ResultadoDoPedido | ResultadoDaVenda
export interface FilaDeSalvamento {
  guardar(salvamento: Salvamento): void
  salvarAgora(): Promise<void>
  parar(): Promise<void>
  temPendente(): boolean
  resolver(escolha: 'local' | 'remoto'): Promise<void>
  copiaLocal(): string
  comprarInsumos(item: Insumo, quantidade: number): Promise<ResultadoDaCompraDeInsumos>
  entregarPedido(morador: MoradorDoPedido): Promise<ResultadoDoPedido>
  /** Vender pratos na banca da feira (A22): uma venda por dia, pelo serviço. */
  venderNaFeira(itens: ItensDaVenda): Promise<ResultadoDaVenda>
  retomarOperacoes(): Promise<void>
}
export interface OpcoesDaFila {
  servico: ServicoDoJogo
  guardadoInicial: SalvamentoGuardado
  rascunhoInicial: RascunhoDoJogo | null
  armazem: ArmazemDeSalvamento
  aoAdotar(guardado: SalvamentoGuardado): void
  aoSituacao(situacao: SituacaoDoSalvamento): void
  aoErro(erro: unknown): void
  intervaloMs?: number
  agora?: () => Date
  agendar?: (fn: () => void, ms: number) => unknown
  cancelar?: (id: unknown) => void
  /** O jogo verifica a reserva do servidor antes de armar qualquer PUT da abertura. */
  conferirOperacoes?: boolean
}

/**
 * Toda alteração vai ao diário local antes do envio. O snapshot enviado fica registrado até a
 * confirmação: uma resposta perdida não duplica consumo nem apaga alterações feitas durante o PUT.
 * Revisão concorrente é conciliada por domínio; divergência econômica pausa para escolha explícita.
 */
export function criarFilaDeSalvamento(o: OpcoesDaFila): FilaDeSalvamento {
  const agendar = o.agendar ?? ((fn, ms) => setTimeout(fn, ms))
  const cancelar = o.cancelar ?? ((id) => clearTimeout(id as ReturnType<typeof setTimeout>))
  let base = o.rascunhoInicial?.base ?? o.guardadoInicial
  let local = o.rascunhoInicial?.local ?? o.guardadoInicial.salvamento
  let enviado = o.rascunhoInicial?.enviado ?? null
  let remotoEmConflito: SalvamentoGuardado | null = null
  let gravacao = Promise.resolve()
  let falhaLocal = false
  let recusado = false
  let timer: unknown = null
  let emVoo: Promise<void> | null = null
  let parado = false
  let encerramento: Promise<void> | null = null
  let requisicao: AbortController | null = null
  let compra = o.rascunhoInicial?.compra ?? null
  let entrega = o.rascunhoInicial?.entrega ?? null
  let venda = o.rascunhoInicial?.venda ?? null
  let operacoesProntas = !o.conferirOperacoes
  let operacaoEmVoo: Promise<ResultadoDaOperacao | null> | null = null
  let requisicaoOperacao: AbortController | null = null
  let ultimaSituacao: SituacaoDoSalvamento = 'ok'

  const avisar = (s: SituacaoDoSalvamento) => {
    if (s !== 'confirmando') ultimaSituacao = s
    o.aoSituacao(operacaoEmVoo && s === 'ok' ? 'confirmando' : s)
  }
  const pendente = () => local !== null && !mesmosDados(base.salvamento, local)
  function persistir(): Promise<void> {
    const dado =
      local && (pendente() || remotoEmConflito || enviado || compra || entrega || venda)
        ? structuredClone({
            base,
            local,
            enviado,
            ...(compra ? { compra } : {}),
            ...(entrega ? { entrega } : {}),
            ...(venda ? { venda } : {}),
          })
        : null
    gravacao = gravacao.then(async () => {
      try {
        await o.armazem.gravar(dado)
        falhaLocal = false
      } catch (erro) {
        falhaLocal = true
        o.aoErro(erro)
        avisar('erro-local')
      }
    })
    return gravacao
  }
  function armar() {
    if (
      timer !== null ||
      parado ||
      remotoEmConflito ||
      falhaLocal ||
      recusado ||
      !pendente() ||
      !operacoesProntas ||
      compra ||
      entrega ||
      venda ||
      operacaoEmVoo
    )
      return
    timer = agendar(() => {
      timer = null
      void salvarAgora()
    }, o.intervaloMs ?? 20_000)
  }
  function conciliar(atual: SalvamentoGuardado): void {
    if (!local) {
      base = atual
      local = atual.salvamento
      return
    }
    // A confirmação pode ter chegado ao servidor antes de a conexão cair.
    const origem = enviado && mesmosDados(enviado, atual.salvamento) ? enviado : base.salvamento
    const junto = conciliarSalvamento(origem, local, atual.salvamento)
    if (!junto) {
      remotoEmConflito = atual
      avisar('conflito')
      return
    }
    base = atual
    local = junto
    enviado = null
    remotoEmConflito = null
    o.aoAdotar({ ...atual, salvamento: junto })
    avisar('ok')
  }
  async function enviar(): Promise<void> {
    if (!local || remotoEmConflito || parado || compra || entrega || venda || !operacoesProntas)
      return
    const controller = new AbortController()
    requisicao = controller
    const prazo = setTimeout(() => controller.abort(), 15_000)
    try {
      // Antes de substituir um envio sem resposta por um snapshot mais novo, consulta o que
      // realmente chegou. Manter a identidade desse envio é necessário também sem recarregar.
      if (enviado) {
        const leitura = await o.servico.buscar('/salvamento', { sinal: controller.signal })
        if (leitura.status !== 200) throw new RespostaDeSalvamentoError(leitura.status)
        conciliar(SalvamentoGuardadoSchema.parse(leitura.corpo))
        await persistir()
        if (remotoEmConflito || falhaLocal || parado || !pendente()) return
      }
      const alvo = local
      const revisao = base.revisao
      enviado = alvo
      await persistir()
      if (falhaLocal || parado) return
      const r = await o.servico.buscar('/salvamento', {
        metodo: 'PUT',
        corpo: { revisaoBase: revisao, salvamento: alvo },
        sinal: controller.signal,
      })
      if (r.status === 200) {
        const confirmado = SalvamentoGuardadoSchema.parse(r.corpo)
        if (confirmado.revisao !== revisao + 1 || !mesmosDados(confirmado.salvamento, alvo))
          throw new Error('Confirmação do salvamento não corresponde ao envio.')
        base = confirmado
        enviado = null
        await persistir()
        if (!falhaLocal) avisar('ok')
        return
      }
      if (r.status === 409) {
        const conflito = ConflitoDeSalvamentoSchema.safeParse(r.corpo)
        if (conflito.success) {
          conciliar(conflito.data.atual)
          await persistir()
          return
        }
      }
      throw new RespostaDeSalvamentoError(r.status)
    } catch (erro) {
      if (!parado) {
        o.aoErro(erro)
        recusado =
          erro instanceof RespostaDeSalvamentoError &&
          erro.status >= 400 &&
          erro.status < 500 &&
          erro.status !== 408 &&
          erro.status !== 429
        if (erro instanceof RespostaDeSalvamentoError && erro.status === 423) {
          operacoesProntas = false
          avisar('confirmando')
        } else avisar(recusado ? 'recusado' : 'offline')
      }
    } finally {
      clearTimeout(prazo)
      requisicao = null
    }
  }
  function salvarAgora(): Promise<void> {
    if (timer !== null) {
      cancelar(timer)
      timer = null
    }
    if (emVoo) return emVoo
    if (compra || entrega || venda || !operacoesProntas) return retomarOperacoes()
    if (!parado && falhaLocal)
      return persistir().then(async () => {
        if (falhaLocal) return
        avisar(remotoEmConflito ? 'conflito' : 'ok')
        if (!remotoEmConflito) await salvarAgora()
      })
    if (parado || remotoEmConflito || !pendente()) return gravacao
    recusado = false
    emVoo = enviar().finally(() => {
      emVoo = null
      armar()
    })
    return emVoo
  }

  async function enviarCompra(pedido: CompraDeInsumos): Promise<ResultadoDaCompraDeInsumos> {
    if (parado) throw new Error('Esta sessão já foi encerrada.')
    const controller = new AbortController()
    requisicaoOperacao = controller
    const prazo = setTimeout(() => controller.abort(), 15_000)
    try {
      const r = await o.servico.buscar('/insumos/comprar', {
        metodo: 'POST',
        corpo: pedido,
        sinal: controller.signal,
      })
      if (r.status !== 200) {
        const erro = r.corpo as { error?: { code?: unknown } } | null
        if (
          (r.status === 409 && erro?.error?.code === 'COMPRA_BASE_DESATUALIZADA') ||
          (r.status === 422 && erro?.error?.code === 'COMPRA_BASE_SEM_ESPACO') ||
          (r.status === 423 && erro?.error?.code === 'COMPRA_PENDENTE')
        ) {
          // Estes códigos provam que esta chave não foi reservada nem enviada à carteira.
          compra = null
          operacoesProntas = false
          await persistir()
        }
        throw new RespostaDeSalvamentoError(r.status)
      }
      const resultado = ResultadoDaCompraDeInsumosSchema.parse(r.corpo)
      if (
        !mesmosDados(resultado.pedido, pedido) ||
        resultado.situacao === 'pendente' ||
        resultado.guardado.revisao < base.revisao
      )
        throw new Error('A confirmação da compra não corresponde ao pedido.')
      adotarConfirmacao(
        resultado.guardado,
        pedido.revisaoBase,
        resultado.situacao === 'entregue'
          ? (s) => {
              const r = prepararEntregaDeInsumos(s, pedido)
              return r.ok ? r.salvamento : null
            }
          : undefined,
      )
      compra = null
      await persistir()
      if (falhaLocal) throw new Error('Não foi possível guardar a confirmação neste aparelho.')
      return resultado
    } finally {
      clearTimeout(prazo)
      requisicaoOperacao = null
    }
  }

  /** Só reaplica uma transição conhecida se revisão e snapshot inteiro forem exatos. */
  function adotarConfirmacao(
    atual: SalvamentoGuardado,
    revisaoBase: number,
    preparar?: (s: Salvamento) => Salvamento | null,
  ) {
    const esperado = base.salvamento && preparar?.(base.salvamento)
    const rascunho = local && preparar?.(local)
    if (
      revisaoBase === base.revisao &&
      atual.revisao === base.revisao + 1 &&
      esperado &&
      rascunho &&
      mesmosDados(atual.salvamento, esperado)
    ) {
      base = atual
      local = rascunho
      enviado = null
      remotoEmConflito = null
      o.aoAdotar({ ...atual, salvamento: local })
    } else conciliar(atual)
  }

  async function enviarEntrega(pedido: EntregarPedido): Promise<ResultadoDoPedido> {
    if (parado) throw new Error('Esta sessão já foi encerrada.')
    const controller = new AbortController()
    requisicaoOperacao = controller
    const prazo = setTimeout(() => controller.abort(), 15_000)
    try {
      const r = await o.servico.buscar('/pedidos/entregar', {
        metodo: 'POST',
        corpo: pedido,
        sinal: controller.signal,
      })
      if (r.status !== 200) {
        const erro = r.corpo as { error?: { code?: unknown } } | null
        if (
          (r.status === 409 && erro?.error?.code === 'PEDIDO_BASE_RECUSADO') ||
          (r.status === 423 && erro?.error?.code === 'COMPRA_PENDENTE')
        ) {
          entrega = null
          operacoesProntas = false
          await persistir()
        }
        throw new RespostaDeSalvamentoError(r.status)
      }
      const resultado = ResultadoDoPedidoSchema.parse(r.corpo)
      if (!mesmosDados(resultado.pedido, pedido) || resultado.guardado.revisao < base.revisao)
        throw new Error('A confirmação não corresponde à entrega do pedido.')
      adotarConfirmacao(resultado.guardado, pedido.revisaoBase, (s) => {
        if (s.moradores[pedido.morador].pedido?.id !== pedido.pedido) return null
        const r = prepararEntregaDoPedido(s, pedido.morador, pedido.dia)
        return r.ok ? r.salvamento : null
      })
      entrega = null
      await persistir()
      if (falhaLocal) throw new Error('Não foi possível guardar a confirmação neste aparelho.')
      return resultado
    } finally {
      clearTimeout(prazo)
      requisicaoOperacao = null
    }
  }

  async function enviarVenda(c: VenderNaFeira): Promise<ResultadoDaVenda> {
    if (parado) throw new Error('Esta sessão já foi encerrada.')
    const controller = new AbortController()
    requisicaoOperacao = controller
    const prazo = setTimeout(() => controller.abort(), 15_000)
    try {
      const r = await o.servico.buscar('/feira/vender', {
        metodo: 'POST',
        corpo: c,
        sinal: controller.signal,
      })
      if (r.status !== 200) {
        const erro = r.corpo as { error?: { code?: unknown } } | null
        const codigo = typeof erro?.error?.code === 'string' ? erro.error.code : null
        if (
          (r.status === 409 && (codigo === 'VENDA_BASE_RECUSADA' || codigo === 'VENDA_REPETIDA')) ||
          (r.status === 423 && codigo === 'COMPRA_PENDENTE')
        ) {
          // Estes códigos provam que esta chave não consumiu os pratos nem foi à carteira.
          venda = null
          operacoesProntas = false
          await persistir()
        }
        throw new VendaRecusadaNoServicoError(r.status, codigo)
      }
      const resultado = ResultadoDaVendaSchema.parse(r.corpo)
      if (!mesmosDados(resultado.venda, c) || resultado.guardado.revisao < base.revisao)
        throw new Error('A confirmação não corresponde à venda na feira.')
      adotarConfirmacao(resultado.guardado, c.revisaoBase, (s) => {
        const r = prepararVendaNaFeira(s, c.itens)
        return r.ok ? r.salvamento : null
      })
      venda = null
      await persistir()
      if (falhaLocal) throw new Error('Não foi possível guardar a confirmação neste aparelho.')
      return resultado
    } finally {
      clearTimeout(prazo)
      requisicaoOperacao = null
    }
  }

  function executarOperacao(
    nova?:
      | { item: Insumo; quantidade: number }
      | { morador: MoradorDoPedido }
      | { venda: ItensDaVenda },
  ): Promise<ResultadoDaOperacao | null> {
    if (operacaoEmVoo) {
      if (nova) return Promise.reject(new Error('Aguarde a confirmação anterior.'))
      return operacaoEmVoo
    }
    if (parado) return Promise.reject(new Error('Esta sessão já foi encerrada.'))
    const executar = async () => {
      if (parado) throw new Error('Esta sessão já foi encerrada.')
      avisar('confirmando')
      if (nova) {
        if (
          !operacoesProntas ||
          compra ||
          entrega ||
          venda ||
          remotoEmConflito ||
          falhaLocal ||
          recusado
        )
          throw new Error('Confirme seu progresso antes de continuar.')
        // O estado da loja já está pausado. Uma gravação anterior pode estar em voo.
        await salvarAgora()
        if (pendente() && !falhaLocal && !recusado && !remotoEmConflito) await salvarAgora()
        if (
          parado ||
          pendente() ||
          enviado ||
          !local ||
          base.revisao < 1 ||
          falhaLocal ||
          recusado ||
          remotoEmConflito
        )
          throw new Error('Seu progresso precisa chegar ao serviço antes de continuar.')
        if ('venda' in nova) {
          if (!prepararVendaNaFeira(local, nova.venda).ok)
            throw new Error('Confira os pratos da mochila antes de vender.')
          venda = VenderNaFeiraSchema.parse({
            versao: 1,
            chave: crypto.randomUUID(),
            revisaoBase: base.revisao,
            dia: diaDeSaoPaulo(o.agora?.() ?? new Date()),
            itens: nova.venda,
          })
          await persistir()
          if (falhaLocal || parado)
            throw new Error('Não foi possível guardar a venda neste aparelho.')
          return enviarVenda(venda)
        }
        if ('morador' in nova) {
          const dia = diaDeSaoPaulo(o.agora?.() ?? new Date())
          const p = local.moradores[nova.morador].pedido
          if (!p || p.dia !== dia || !prepararEntregaDoPedido(local, nova.morador, dia).ok)
            throw new Error('Confira os itens e o pedido de hoje antes de entregar.')
          entrega = EntregarPedidoSchema.parse({
            versao: 1,
            chave: crypto.randomUUID(),
            revisaoBase: base.revisao,
            morador: nova.morador,
            dia,
            pedido: p.id,
          })
          await persistir()
          if (falhaLocal || parado)
            throw new Error('Não foi possível guardar o pedido neste aparelho.')
          return enviarEntrega(entrega)
        }
        const pedido = CompraDeInsumosSchema.parse({
          versao: 1,
          chave: crypto.randomUUID(),
          revisaoBase: base.revisao,
          ...nova,
        })
        if (!prepararEntregaDeInsumos(local, pedido).ok)
          throw new Error('Não há espaço para guardar a compra inteira.')
        compra = pedido
        await persistir()
        if (falhaLocal || parado)
          throw new Error('Não foi possível guardar o pedido neste aparelho.')
        return enviarCompra(compra)
      }
      // Resolve primeiro a confirmação que este aparelho pode ter perdido. Em seguida,
      // procura a reserva feita em outro aparelho antes de permitir novas alterações.
      let resultado: ResultadoDaOperacao | null = null
      if (compra) resultado = await enviarCompra(compra)
      if (entrega) resultado = await enviarEntrega(entrega)
      if (venda) resultado = await enviarVenda(venda)
      if (parado) throw new Error('Esta sessão já foi encerrada.')
      const controller = new AbortController()
      requisicaoOperacao = controller
      const prazo = setTimeout(() => controller.abort(), 15_000)
      let remoto: CompraDeInsumos | null
      try {
        const r = await o.servico.buscar('/insumos/pendente', { sinal: controller.signal })
        if (parado) throw new Error('Esta sessão já foi encerrada.')
        if (r.status !== 200) throw new RespostaDeSalvamentoError(r.status)
        remoto = CompraDeInsumosPendenteSchema.parse(r.corpo).pedido
        if (!remoto) {
          const salvo = await o.servico.buscar('/salvamento', { sinal: controller.signal })
          if (salvo.status !== 200) throw new RespostaDeSalvamentoError(salvo.status)
          conciliar(SalvamentoGuardadoSchema.parse(salvo.corpo))
          await persistir()
        }
      } finally {
        clearTimeout(prazo)
        requisicaoOperacao = null
      }
      if (parado) throw new Error('Esta sessão já foi encerrada.')
      if (remoto) {
        compra = remoto
        await persistir()
        if (falhaLocal) throw new Error('Não foi possível guardar a retomada neste aparelho.')
        resultado = await enviarCompra(remoto)
      }
      // Crédito pendente não bloqueia o save: o consumo já foi confirmado no serviço.
      // Retoma no máximo um por abertura, usando a mesma chave, sem encadear várias esperas.
      const controllerPedido = new AbortController()
      requisicaoOperacao = controllerPedido
      const prazoPedido = setTimeout(() => controllerPedido.abort(), 15_000)
      let pendenteDoMorador: EntregarPedido | undefined
      try {
        if (parado) throw new Error('Esta sessão já foi encerrada.')
        const r = await o.servico.buscar('/pedidos/pendentes', { sinal: controllerPedido.signal })
        if (parado) throw new Error('Esta sessão já foi encerrada.')
        if (r.status !== 200) throw new RespostaDeSalvamentoError(r.status)
        pendenteDoMorador = PedidosPendentesSchema.parse(r.corpo).pedidos[0]
      } finally {
        clearTimeout(prazoPedido)
        requisicaoOperacao = null
      }
      if (
        pendenteDoMorador &&
        !(resultado && 'pedido' in resultado && resultado.pedido.chave === pendenteDoMorador.chave)
      ) {
        entrega = pendenteDoMorador
        await persistir()
        if (falhaLocal) throw new Error('Não foi possível guardar a retomada neste aparelho.')
        resultado = await enviarEntrega(pendenteDoMorador)
      }
      // O mesmo para a venda na feira (A22). Um serviço anterior, sem a rota, responde 404:
      // não há venda a retomar, e o salvamento segue normalmente.
      const controllerVenda = new AbortController()
      requisicaoOperacao = controllerVenda
      const prazoVenda = setTimeout(() => controllerVenda.abort(), 15_000)
      let vendaPendente: VenderNaFeira | undefined
      try {
        if (parado) throw new Error('Esta sessão já foi encerrada.')
        const r = await o.servico.buscar('/feira/vendas/pendentes', {
          sinal: controllerVenda.signal,
        })
        if (parado) throw new Error('Esta sessão já foi encerrada.')
        if (r.status !== 200 && r.status !== 404) throw new RespostaDeSalvamentoError(r.status)
        vendaPendente =
          r.status === 200 ? VendasPendentesSchema.parse(r.corpo).vendas[0] : undefined
      } finally {
        clearTimeout(prazoVenda)
        requisicaoOperacao = null
      }
      if (
        vendaPendente &&
        !(resultado && 'venda' in resultado && resultado.venda.chave === vendaPendente.chave)
      ) {
        venda = vendaPendente
        await persistir()
        if (falhaLocal) throw new Error('Não foi possível guardar a retomada neste aparelho.')
        resultado = await enviarVenda(vendaPendente)
      }
      operacoesProntas = true
      recusado = false
      return resultado
    }
    // O microtask publica a exclusão antes de qualquer chamada assíncrona.
    operacaoEmVoo = Promise.resolve()
      .then(executar)
      .catch((erro) => {
        o.aoErro(erro)
        throw erro
      })
      .finally(() => {
        operacaoEmVoo = null
        if (!parado) {
          avisar(
            falhaLocal
              ? 'erro-local'
              : remotoEmConflito
                ? 'conflito'
                : compra || entrega || venda || !operacoesProntas
                  ? 'confirmando'
                  : recusado
                    ? 'recusado'
                    : ultimaSituacao === 'offline'
                      ? 'offline'
                      : 'ok',
          )
          armar()
        }
      })
    return operacaoEmVoo
  }
  async function retomarOperacoes(): Promise<void> {
    await executarOperacao()
  }

  if (o.rascunhoInicial) {
    conciliar(o.guardadoInicial)
    void persistir()
    armar()
  }
  return {
    guardar(salvamento) {
      if (parado || remotoEmConflito || recusado) return
      local = salvamento
      void persistir()
      armar()
    },
    salvarAgora,
    async comprarInsumos(item, quantidade) {
      const resultado = await executarOperacao({ item, quantidade })
      if (!resultado || !('situacao' in resultado)) throw new Error('Compra sem confirmação.')
      return resultado
    },
    async entregarPedido(morador) {
      const resultado = await executarOperacao({ morador })
      if (!resultado || !('pedido' in resultado) || !('pagamento' in resultado))
        throw new Error('Pedido sem confirmação.')
      return resultado
    },
    async venderNaFeira(itens) {
      const resultado = await executarOperacao({ venda: itens })
      if (!resultado || !('venda' in resultado)) throw new Error('Venda sem confirmação.')
      return resultado
    },
    retomarOperacoes,
    parar() {
      if (encerramento) return encerramento
      parado = true
      if (timer !== null) cancelar(timer)
      timer = null
      requisicao?.abort()
      requisicaoOperacao?.abort()
      encerramento = (async () => {
        try {
          await operacaoEmVoo
        } catch {
          /* O comando durável é retomado na próxima abertura. */
        }
        await emVoo
        await gravacao
        o.armazem.fechar()
      })()
      return encerramento
    },
    temPendente: () => pendente() || compra !== null || entrega !== null || venda !== null,
    async resolver(escolha) {
      if (!remotoEmConflito || parado) return
      // Se outro aparelho avançar de novo, o CAS produzirá outro conflito; escolher a cópia
      // local nunca autoriza um PUT sem revisão.
      base = remotoEmConflito
      if (escolha === 'remoto') local = base.salvamento
      remotoEmConflito = null
      enviado = null
      await persistir()
      if (falhaLocal) return
      o.aoAdotar({ ...base, salvamento: local })
      avisar('ok')
      await salvarAgora()
    },
    copiaLocal: () =>
      JSON.stringify(
        {
          versao: 1,
          base,
          local,
          enviado,
          ...(compra ? { compra } : {}),
          ...(entrega ? { entrega } : {}),
        },
        null,
        2,
      ),
  }
}

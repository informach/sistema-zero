import {
  ConflitoDeSalvamentoSchema,
  type Salvamento,
  type SalvamentoGuardado,
  SalvamentoGuardadoSchema,
  type ServicoDoJogo,
} from '@sistemazero/arquipelago-contracts'
import type { ArmazemDeSalvamento, RascunhoDoJogo } from './armazem-salvamento'
import { conciliarSalvamento, mesmosDados } from './conciliar-salvamento'

export type SituacaoDoSalvamento = 'ok' | 'offline' | 'conflito' | 'erro-local' | 'recusado'

class RespostaDeSalvamentoError extends Error {
  constructor(readonly status: number) {
    super(`Salvamento recusado (${status})`)
  }
}
export interface FilaDeSalvamento {
  guardar(salvamento: Salvamento): void
  salvarAgora(): Promise<void>
  parar(): Promise<void>
  temPendente(): boolean
  resolver(escolha: 'local' | 'remoto'): Promise<void>
  copiaLocal(): string
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
  agendar?: (fn: () => void, ms: number) => unknown
  cancelar?: (id: unknown) => void
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

  const pendente = () => local !== null && !mesmosDados(base.salvamento, local)
  function persistir(): Promise<void> {
    const dado =
      local && (pendente() || remotoEmConflito || enviado)
        ? structuredClone({ base, local, enviado })
        : null
    gravacao = gravacao.then(async () => {
      try {
        await o.armazem.gravar(dado)
        falhaLocal = false
      } catch (erro) {
        falhaLocal = true
        o.aoErro(erro)
        o.aoSituacao('erro-local')
      }
    })
    return gravacao
  }
  function armar() {
    if (timer !== null || parado || remotoEmConflito || falhaLocal || recusado || !pendente())
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
      o.aoSituacao('conflito')
      return
    }
    base = atual
    local = junto
    enviado = null
    remotoEmConflito = null
    o.aoAdotar({ ...atual, salvamento: junto })
    o.aoSituacao('ok')
  }
  async function enviar(): Promise<void> {
    if (!local || remotoEmConflito || parado) return
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
        if (!falhaLocal) o.aoSituacao('ok')
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
        o.aoSituacao(recusado ? 'recusado' : 'offline')
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
    if (!parado && falhaLocal)
      return persistir().then(async () => {
        if (falhaLocal) return
        o.aoSituacao(remotoEmConflito ? 'conflito' : 'ok')
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
    parar() {
      if (encerramento) return encerramento
      parado = true
      if (timer !== null) cancelar(timer)
      timer = null
      requisicao?.abort()
      encerramento = (async () => {
        await emVoo
        await gravacao
        o.armazem.fechar()
      })()
      return encerramento
    },
    temPendente: pendente,
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
      o.aoSituacao('ok')
      await salvarAgora()
    },
    copiaLocal: () => JSON.stringify({ versao: 1, base, local, enviado }, null, 2),
  }
}

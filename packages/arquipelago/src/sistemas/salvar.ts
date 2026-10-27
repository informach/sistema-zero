import {
  ConflitoDeSalvamentoSchema,
  type Salvamento,
  type SalvamentoGuardado,
  SalvamentoGuardadoSchema,
  type ServicoDoJogo,
} from '@sistemazero/arquipelago-contracts'

/**
 * Fila de salvamento: junta as mudanças e grava no serviço do jogo a cada `intervaloMs`, com a
 * revisão como trava (outro aparelho salvou antes = 409). No conflito vale o que está guardado:
 * o jogo adota a versão do serviço e avisa. Erro de rede não perde nada: a mudança fica na fila
 * e vai de novo na próxima volta.
 */
export interface FilaDeSalvamento {
  guardar(salvamento: Salvamento): void
  salvarAgora(): Promise<void>
  parar(): void
  temPendente(): boolean
}

export interface OpcoesDaFila {
  servico: ServicoDoJogo
  revisaoInicial: number
  aoAdotar(guardado: SalvamentoGuardado): void
  aoErro(erro: unknown): void
  intervaloMs?: number
  agendar?: (fn: () => void, ms: number) => unknown
  cancelar?: (id: unknown) => void
}

export function criarFilaDeSalvamento(o: OpcoesDaFila): FilaDeSalvamento {
  const intervalo = o.intervaloMs ?? 20_000
  const agendar = o.agendar ?? ((fn, ms) => setTimeout(fn, ms))
  const cancelar = o.cancelar ?? ((id) => clearTimeout(id as ReturnType<typeof setTimeout>))
  let revisao = o.revisaoInicial
  let pendente: Salvamento | null = null
  let timer: unknown = null
  let emVoo: Promise<void> | null = null
  let parado = false

  function armar() {
    if (timer !== null || parado) return
    timer = agendar(() => {
      timer = null
      void salvarAgora()
    }, intervalo)
  }

  async function enviar(): Promise<void> {
    const alvo = pendente
    if (!alvo) return
    pendente = null
    try {
      const r = await o.servico.buscar('/salvamento', {
        metodo: 'PUT',
        corpo: { revisaoBase: revisao, salvamento: alvo },
      })
      if (r.status === 200) {
        revisao = SalvamentoGuardadoSchema.parse(r.corpo).revisao
        return
      }
      if (r.status === 409) {
        const conflito = ConflitoDeSalvamentoSchema.safeParse(r.corpo)
        if (conflito.success) {
          const atual = conflito.data.atual
          revisao = atual.revisao
          // O que mudou aqui depois do envio também perde para a versão guardada.
          pendente = null
          o.aoAdotar(atual)
          return
        }
      }
      throw new Error(`Salvamento recusado (${r.status})`)
    } catch (erro) {
      // Volta para a fila, a não ser que algo mais novo já tenha chegado.
      if (!pendente) pendente = alvo
      o.aoErro(erro)
      armar()
    }
  }

  async function salvarAgora(): Promise<void> {
    if (timer !== null) {
      cancelar(timer)
      timer = null
    }
    if (emVoo) await emVoo
    if (!pendente) return
    emVoo = enviar().finally(() => {
      emVoo = null
    })
    await emVoo
  }

  return {
    guardar(salvamento) {
      if (parado) return
      pendente = salvamento
      armar()
    },
    salvarAgora,
    parar() {
      parado = true
      if (timer !== null) cancelar(timer)
      timer = null
    },
    temPendente: () => pendente !== null,
  }
}

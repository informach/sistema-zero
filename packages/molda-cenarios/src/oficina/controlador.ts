import {
  CenarioInvalido,
  type ComandoDeCenario,
  type DocumentoDeCenario,
  executarLote,
  inverterLote,
} from '@sistemazero/molda-cenarios-core/v2'
import type { Ferramenta } from '@sistemazero/molda-cenarios-motor'
import { type CenarioAberto, CenarioDesatualizado, type CenariosHost } from './portas'

export type Salvamento = 'guardado' | 'guardando' | 'erro' | 'desatualizado'

export interface EstadoDaOficina {
  documento: DocumentoDeCenario
  revisao: number
  selecao: readonly string[]
  ferramenta: Ferramenta
  encaixe: boolean
  salvamento: Salvamento
  /** O motivo da última ação recusada, para avisar a pessoa. */
  recusa: string | null
  podeDesfazer: boolean
  podeRefazer: boolean
  ocupado: boolean
}

interface Envio {
  revisaoEsperada: number
  comandos: ComandoDeCenario[]
  operacaoId: string
}

const HISTORICO_MAXIMO = 200

export interface ControladorDaOficina {
  getState(): EstadoDaOficina
  subscribe(ouvinte: () => void): () => void
  /** Aplica um lote na hora e o põe na fila de gravação. Falso quando o lote é recusado. */
  executar(comandos: ComandoDeCenario[]): boolean
  desfazer(): Promise<void>
  refazer(): Promise<void>
  restaurar(revisao: number): Promise<void>
  selecionar(ids: readonly string[]): void
  /** Toque num objeto: troca a escolha ou, somando, põe e tira da escolha. */
  tocar(id: string | null, somar: boolean): void
  definirFerramenta(ferramenta: Ferramenta): void
  definirEncaixe(ligado: boolean): void
  limparRecusa(): void
  /** Tenta de novo a gravação que falhou. */
  tentarDeNovo(): void
  /** Joga fora o que não foi gravado e abre de novo o que está guardado. */
  recarregar(): Promise<void>
  /** Espera a fila de gravação esvaziar (ao sair da oficina). */
  terminar(): Promise<void>
}

function mensagemDaRecusa(erro: unknown): string {
  if (erro instanceof CenarioInvalido) return erro.problemas[0] ?? 'Esta mudança não vale'
  return erro instanceof Error ? erro.message : 'Esta mudança não vale'
}

/**
 * A fila única de autoria de um cenário aberto. A interface, o palco e (pela API) os agentes
 * mudam o cenário pelos mesmos lotes de comandos; aqui eles são aplicados na hora, guardados
 * na ordem e viram passos de desfazer.
 */
export function criarControlador(
  host: CenariosHost,
  aberto: CenarioAberto,
  novaOperacao: () => string = () => crypto.randomUUID(),
): ControladorDaOficina {
  const id = aberto.resumo.id
  const ouvintes = new Set<() => void>()
  const fila: Envio[] = []
  let historico = { ...aberto.historico }
  let enviando: Promise<void> | null = null
  let movendo: Promise<void> | null = null
  let reabrindo: Promise<void> | null = null
  let precisaReabrir = false
  let pendente: {
    revisaoEsperada: number
    operacaoId: string
    acao: 'desfazer' | 'refazer' | number
  } | null = null
  let estado: EstadoDaOficina = {
    documento: aberto.documento,
    revisao: aberto.revisao,
    selecao: [],
    ferramenta: 'selecionar',
    encaixe: true,
    salvamento: 'guardado',
    recusa: null,
    podeDesfazer: historico.desfazer > 0,
    podeRefazer: historico.refazer > 0,
    ocupado: false,
  }

  const emitir = (mudanca: Partial<EstadoDaOficina>) => {
    const disponivel =
      !['erro', 'desatualizado'].includes(mudanca.salvamento ?? estado.salvamento) &&
      !(mudanca.ocupado ?? estado.ocupado) &&
      !pendente
    estado = {
      ...estado,
      ...mudanca,
      podeDesfazer: historico.desfazer > 0 && disponivel,
      podeRefazer: historico.refazer > 0 && disponivel,
    }
    for (const ouvinte of ouvintes) ouvinte()
  }

  const enviar = (): Promise<void> => {
    if (enviando) return enviando
    enviando = (async () => {
      while (fila.length) {
        const envio = fila[0]!
        try {
          await host.editarCenario(id, envio.revisaoEsperada, envio.comandos, envio.operacaoId)
          fila.shift()
        } catch (erro) {
          if (erro instanceof CenarioDesatualizado) {
            fila.length = 0
            emitir({ salvamento: 'desatualizado' })
          } else emitir({ salvamento: 'erro' })
          return
        }
      }
      emitir({ salvamento: 'guardado' })
    })().finally(() => {
      enviando = null
    })
    return enviando
  }

  /** Aplica localmente e enfileira. Devolve o documento de antes, ou nulo na recusa. */
  const aplicar = (comandos: ComandoDeCenario[]): DocumentoDeCenario | null => {
    if (
      !comandos.length ||
      estado.salvamento === 'desatualizado' ||
      estado.ocupado ||
      pendente ||
      precisaReabrir
    )
      return null
    const antes = estado.documento
    let depois: { documento: DocumentoDeCenario; revisao: number }
    try {
      depois = executarLote(
        { documento: antes, revisao: estado.revisao },
        { revisaoEsperada: estado.revisao, comandos },
      )
    } catch (erro) {
      emitir({ recusa: mensagemDaRecusa(erro) })
      return null
    }
    fila.push({ revisaoEsperada: estado.revisao, comandos, operacaoId: novaOperacao() })
    const vivos = new Set(depois.documento.instancias.map((o) => o.id))
    const selecao = estado.selecao.filter((s) => vivos.has(s))
    emitir({
      documento: depois.documento,
      revisao: depois.revisao,
      selecao: selecao.length === estado.selecao.length ? estado.selecao : selecao,
      salvamento: estado.salvamento === 'erro' ? 'erro' : 'guardando',
      recusa: null,
    })
    if (estado.salvamento !== 'erro') void enviar()
    return antes
  }

  const receber = (novo: CenarioAberto) => {
    historico = { ...novo.historico }
    const vivos = new Set(novo.documento.instancias.map((o) => o.id))
    emitir({
      documento: novo.documento,
      revisao: novo.revisao,
      selecao: estado.selecao.filter((id) => vivos.has(id)),
      salvamento: 'guardado',
      recusa: null,
    })
  }

  const andar = (acao?: 'desfazer' | 'refazer' | number): Promise<void> => {
    if (movendo) return movendo
    if (reabrindo || precisaReabrir) return Promise.resolve()
    if (estado.salvamento === 'desatualizado' || (estado.salvamento === 'erro' && !pendente))
      return Promise.resolve()
    if (
      acao !== undefined &&
      ((acao === 'desfazer' && !estado.podeDesfazer) || (acao === 'refazer' && !estado.podeRefazer))
    )
      return Promise.resolve()
    emitir({ ocupado: true })
    movendo = (async () => {
      await enviar()
      if (estado.salvamento !== 'guardado') return
      if (!pendente && acao !== undefined)
        pendente = { acao, revisaoEsperada: estado.revisao, operacaoId: novaOperacao() }
      const pedido = pendente
      if (!pedido) return
      emitir({ salvamento: 'guardando' })
      try {
        const novo =
          typeof pedido.acao === 'number'
            ? await host.restaurarRevisao(
                id,
                pedido.revisaoEsperada,
                pedido.acao,
                pedido.operacaoId,
              )
            : await host.moverHistorico(id, pedido.revisaoEsperada, pedido.acao, pedido.operacaoId)
        pendente = null
        receber(novo)
      } catch (erro) {
        if (erro instanceof CenarioDesatualizado) {
          pendente = null
          emitir({ salvamento: 'desatualizado' })
        } else emitir({ salvamento: 'erro', recusa: mensagemDaRecusa(erro) })
      }
    })().finally(() => {
      movendo = null
      emitir({ ocupado: false })
    })
    return movendo
  }

  const recarregar = (): Promise<void> => {
    if (reabrindo) return reabrindo
    precisaReabrir = true
    emitir({ ocupado: true })
    reabrindo = (async () => {
      if (movendo) await movendo
      if (enviando) await enviando
      emitir({ ocupado: true, salvamento: 'guardando' })
      try {
        const novo = await host.abrirCenario(id)
        fila.length = 0
        pendente = null
        precisaReabrir = false
        receber(novo)
        emitir({ selecao: [] })
      } catch (erro) {
        emitir({ salvamento: 'erro', recusa: mensagemDaRecusa(erro) })
      } finally {
        emitir({ ocupado: false })
      }
    })().finally(() => {
      reabrindo = null
    })
    return reabrindo
  }

  return {
    getState: () => estado,
    subscribe(ouvinte) {
      ouvintes.add(ouvinte)
      return () => ouvintes.delete(ouvinte)
    },
    executar(comandos) {
      const antes = aplicar(comandos)
      if (!antes) return false
      const desfazer = inverterLote(antes, estado.documento)
      if (desfazer.length) {
        historico = {
          revisao: estado.revisao,
          desfazer: Math.min(HISTORICO_MAXIMO, historico.desfazer + 1),
          refazer: 0,
        }
      }
      emitir({})
      return true
    },
    desfazer: () => andar('desfazer'),
    refazer: () => andar('refazer'),
    restaurar: (revisao) => andar(revisao),
    selecionar(ids) {
      const vivos = new Set(estado.documento.instancias.map((o) => o.id))
      emitir({ selecao: [...new Set(ids)].filter((s) => vivos.has(s)) })
    },
    tocar(alvo, somar) {
      if (!alvo) {
        if (!somar && estado.selecao.length) emitir({ selecao: [] })
        return
      }
      if (!somar) {
        emitir({ selecao: [alvo] })
        return
      }
      emitir({
        selecao: estado.selecao.includes(alvo)
          ? estado.selecao.filter((s) => s !== alvo)
          : [...estado.selecao, alvo],
      })
    },
    definirFerramenta: (ferramenta) => emitir({ ferramenta }),
    definirEncaixe: (encaixe) => emitir({ encaixe }),
    limparRecusa: () => {
      if (estado.recusa) emitir({ recusa: null })
    },
    tentarDeNovo() {
      if (estado.salvamento !== 'erro') return
      if (precisaReabrir) {
        void recarregar()
        return
      }
      if (pendente) {
        void andar()
        return
      }
      emitir({ salvamento: fila.length ? 'guardando' : 'guardado' })
      void enviar()
    },
    recarregar,
    async terminar() {
      if (reabrindo) await reabrindo
      if (movendo) await movendo
      if (estado.salvamento === 'guardando') await enviar()
    },
  }
}

import {
  type CoresConquistadas,
  CoresConquistadasSchema,
  type DesafiosDoJogador,
  type IlhaId,
  type MoldeDeDesafio,
  type Plataforma,
} from '@sistemazero/arquipelago-contracts'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import {
  chaveDasCores,
  coresDoCatalogo,
  guardarCores,
  lerCoresGuardadas,
  unirCores,
} from '../sistemas/cores-conquistadas'
import { lerDesafios, type MotivoDoQuadroFechado, motivoDoErro } from '../sistemas/quadro-das-cores'
import { falaDaReceitaDoExtra } from '../sistemas/receitas'
import type { LojaDoJogo } from './loja'

/**
 * Os desafios do jogo de UMA montagem, à parte da loja principal: a lista vem do serviço
 * (`GET /desafios`), o Estúdio de desafio abre pela plataforma e, de volta, a lista é lida de novo.
 */
export interface EstadoDosDesafios {
  dados: DesafiosDoJogador | null
  cores: CoresConquistadas
  carregando: boolean
  fechado: MotivoDoQuadroFechado | null
  /** Os quadros que acabaram de ficar feitos (a festa da cor), por ilha. */
  festa: { ilha: IlhaId; quadros: number[] } | null
  carregar(): Promise<void>
  cancelar(): void
  jogar(desafioId: string, revisao: number): Promise<'feito' | 'voltou' | 'nao-abriu'>
  festaVista(): void
}

export type LojaDosDesafios = StoreApi<EstadoDosDesafios>

const lojas = new WeakMap<LojaDoJogo, LojaDosDesafios>()

/** A loja dos desafios desta montagem (uma por loja do jogo, criada na primeira vez). */
export function lojaDosDesafios(loja: LojaDoJogo, plataforma: Plataforma): LojaDosDesafios {
  const feita = lojas.get(loja)
  if (feita) return feita
  const nova = criarLojaDosDesafios(loja, plataforma)
  lojas.set(loja, nova)
  return nova
}

export function criarLojaDosDesafios(loja: LojaDoJogo, plataforma: Plataforma): LojaDosDesafios {
  let pedido = 0
  let requisicao: AbortController | null = null
  const chave = chaveDasCores(plataforma.publico, plataforma.perfil.id)
  return createStore<EstadoDosDesafios>((set, get) => ({
    dados: null,
    cores: lerCoresGuardadas(chave),
    carregando: false,
    fechado: null,
    festa: null,
    cancelar() {
      pedido++
      requisicao?.abort()
      requisicao = null
      set({ carregando: false })
    },
    async carregar() {
      const meu = ++pedido
      requisicao?.abort()
      const controller = new AbortController()
      requisicao = controller
      const prazo = setTimeout(() => controller.abort(), 15_000)
      const tinhaLeitura = get().dados !== null
      const anteriores = get().dados
      set({ carregando: true })
      let reservaDoCatalogo: CoresConquistadas | null = null
      const confirmarCores = (leitura: CoresConquistadas) => {
        if (meu !== pedido) return
        const antes = get().cores
        const cores = unirCores(antes, leitura)
        let festa = get().festa
        if (tinhaLeitura) {
          for (const ilha of cores.ilhas) {
            const antigos = antes.ilhas.find((i) => i.id === ilha.id)?.quadros ?? []
            const novos = ilha.quadros.filter((q) => !antigos.includes(q))
            if (novos.length > 0) festa = { ilha: ilha.id, quadros: novos }
          }
        }
        set({ cores, festa })
        if (!loja.getState().acesso.somenteLeitura) guardarCores(chave, cores)
      }
      // Esta leitura permanece útil com o catálogo desligado ou uma publicação arquivada.
      // Um host antigo pode recusá-la: conserva a fotografia e usa conclusões do catálogo.
      const leituraDasCores = plataforma.servico
        .buscar('/desafios/cores', { sinal: controller.signal })
        .then((r) => {
          if (meu !== pedido || controller.signal.aborted || r.status !== 200) return false
          const lido = CoresConquistadasSchema.safeParse(r.corpo)
          if (lido.success) confirmarCores(lido.data)
          return lido.success
        })
        .catch((erro) => {
          if (meu === pedido && !controller.signal.aborted)
            plataforma.relatarErro(erro, 'cores-conquistadas')
          return false
        })
      try {
        const r = await plataforma.servico.buscar('/desafios', {
          sinal: controller.signal,
          apresentacaoDosDesafios: true,
        })
        if (meu !== pedido) return
        const dados = r.status === 200 ? lerDesafios(r.corpo) : null
        if (!dados) {
          set({
            carregando: false,
            fechado: motivoDoErro(r.status, r.corpo),
            ...(r.status === 403 ? { dados: null, festa: null } : {}),
          })
          return
        }
        reservaDoCatalogo = coresDoCatalogo(dados.desafios)
        set({ dados, carregando: false, fechado: null })
        // O extra acabou de dar uma receita (A25): o Zappy conta que ela entrou no caderno.
        const fala = falaDaReceitaDoExtra(anteriores, dados)
        if (fala) loja.getState().dizer(fala)
      } catch (erro) {
        if (meu !== pedido) return
        plataforma.relatarErro(erro, 'desafios')
        set({ carregando: false, fechado: 'fora-do-ar' })
      } finally {
        const historicoConfirmado = await leituraDasCores
        // O catálogo pode mover um desafio já feito para outro quadro. Com histórico disponível,
        // só a posição guardada na conclusão é autoridade para a cor.
        if (!historicoConfirmado && reservaDoCatalogo) confirmarCores(reservaDoCatalogo)
        clearTimeout(prazo)
        if (requisicao === controller) requisicao = null
      }
    },
    async jogar(desafioId, revisao) {
      const jogo = loja.getState()
      if (jogo.ferramentaAberta) return 'nao-abriu'
      jogo.definirFerramentaAberta(true)
      try {
        const molde: MoldeDeDesafio = { tipo: 'desafio', desafioId, revisao }
        const resultado = await plataforma.abrirFerramenta({
          ferramenta: 'estudio',
          proposito: 'desafio',
          molde,
        })
        if (resultado.situacao === 'indisponivel') return 'nao-abriu'
        // Concluído ou não, a lista é relida: a situação (e a cor) vem sempre do serviço.
        await get().carregar()
        return resultado.situacao === 'pronto' ? 'feito' : 'voltou'
      } catch (erro) {
        plataforma.relatarErro(erro, 'abrir-desafio')
        return 'nao-abriu'
      } finally {
        loja.getState().definirFerramentaAberta(false)
      }
    },
    festaVista() {
      const festa = get().festa
      if (!festa) return
      set({ festa: null })
      // O serviço guarda que a festa já foi vista (para não repetir em outro aparelho).
      const dados = get().dados
      for (const d of dados?.desafios ?? []) {
        if (d.ilha !== festa.ilha || d.quadro === null || !festa.quadros.includes(d.quadro))
          continue
        if (d.recompensaVista) continue
        void plataforma.servico
          .buscar(`/desafios/${d.id}/recompensa-vista`, { metodo: 'POST', corpo: {} })
          .catch((erro) => plataforma.relatarErro(erro, 'recompensa-vista'))
      }
    },
  }))
}

export function useDesafios<T>(loja: LojaDosDesafios, seletor: (s: EstadoDosDesafios) => T): T {
  return useStore(loja, seletor)
}

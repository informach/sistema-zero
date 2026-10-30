import {
  type Plataforma,
  type PostoDaVila,
  type SessaoDaProfissao,
  SessaoDaProfissaoSchema,
} from '@sistemazero/arquipelago-contracts'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import { salvamentoPausado } from '../sistemas/pausa'
import { criarFilaDosTurnos, type GuardaDosTurnos } from '../sistemas/profissoes'
import {
  comecarTurno,
  entregarBandeja,
  fecharTurno,
  porNaBandeja,
  type TurnoEmAndamento,
  terminou,
  tirarDaBandeja,
} from '../sistemas/turnos'
import { lojaDaGaleria } from './galeria'
import type { LojaDoJogo } from './loja'

/** O nome do painel do turno na loja do jogo (o jogo para enquanto ele está aberto). */
export const PAINEL_DO_TURNO = 'turno'

/**
 * O turno num balcão da Vila Doce (uma loja por montagem, como a da conversa): o convite, o
 * balcão com o freguês da vez e o fim com as estrelas. As regras ficam em `sistemas/turnos.ts`;
 * o salvamento só muda ao fechar o turno.
 */
export interface EstadoDoTurno {
  posto: PostoDaVila
  tela: 'convite' | 'balcao' | 'fim'
  turno: TurnoEmAndamento | null
  /** A última resposta do freguês (o obrigado ou o "não era bem isso"). */
  resposta: string | null
  fim: { estrelas: 1 | 2 | 3; pagou: boolean; falas: string[] } | null
  ocupada: boolean
  erro: string | null
  sessao: SessaoDaProfissao | null
  abrir(posto: PostoDaVila): void
  comecar(plataforma: Plataforma, guarda?: GuardaDosTurnos): Promise<void>
  confirmar(): Promise<void>
  cancelar(): void
  por(id: string): void
  tirar(id: string): void
  /** Entrega a bandeja; no último freguês, fecha o turno no salvamento da loja do jogo. */
  entregar(): void
}

export type LojaDoTurno = StoreApi<EstadoDoTurno>

const lojas = new WeakMap<LojaDoJogo, LojaDoTurno>()

export function lojaDoTurno(loja: LojaDoJogo): LojaDoTurno {
  let turno = lojas.get(loja)
  if (turno) return turno
  let geracao = 0
  let fila: ReturnType<typeof criarFilaDosTurnos> | null = null
  let plataformaDaSessao: Plataforma | null = null
  let respostas: Record<string, number>[] = []
  const podeMudar = () => {
    const s = loja.getState()
    return (
      !s.acesso.somenteLeitura &&
      !s.visita &&
      !s.tempoAcabou &&
      !s.tempoPausado &&
      !s.tempoSincronizando &&
      !salvamentoPausado(s.salvamentoSituacao)
    )
  }
  turno = createStore<EstadoDoTurno>((set, get) => ({
    posto: 'padaria',
    tela: 'convite',
    turno: null,
    resposta: null,
    fim: null,
    ocupada: false,
    erro: null,
    sessao: null,
    abrir(posto) {
      geracao++
      respostas = []
      set({
        posto,
        tela: 'convite',
        turno: null,
        resposta: null,
        fim: null,
        ocupada: false,
        erro: null,
        sessao: null,
      })
    },
    cancelar() {
      geracao++
      set({ ocupada: false })
    },
    async comecar(plataforma, guarda) {
      if (get().ocupada || !podeMudar()) return
      const minha = ++geracao
      const posto = get().posto
      plataformaDaSessao = plataforma
      set({ ocupada: true, erro: null })
      try {
        fila = criarFilaDosTurnos(plataforma, guarda ?? localStorage)
        await fila.retomar()
        if (minha !== geracao || !podeMudar()) return
        const r = await plataforma.servico.buscar('/profissoes/iniciar', {
          metodo: 'POST',
          corpo: { posto },
        })
        if (minha !== geracao || !podeMudar()) return
        const sessao = r.status === 200 ? SessaoDaProfissaoSchema.parse(r.corpo) : null
        if (!sessao || sessao.posto !== posto)
          throw new Error('Não foi possível abrir o balcão agora.')
        // A abertura também pode ter recuperado um pagamento anterior no serviço.
        void lojaDaGaleria(loja, plataforma).getState().carregar()
        respostas = []
        set({
          tela: 'balcao',
          turno: { ...comecarTurno(posto, sessao.id, 0), pedidos: sessao.pedidos },
          sessao,
          resposta: null,
          fim: null,
        })
      } catch (erro) {
        if (minha === geracao) {
          plataforma.relatarErro(erro, 'profissao-iniciar')
          set({ erro: 'O balcão não abriu. Confira a conexão e tente novamente.' })
        }
      } finally {
        if (minha === geracao) set({ ocupada: false })
      }
    },
    async confirmar() {
      if (!fila || get().ocupada || !podeMudar()) return
      const plataforma = plataformaDaSessao
      const minha = geracao
      set({ ocupada: true, erro: null })
      try {
        const sessao = await fila.enviar(get().posto)
        // Atualizar a fonte usada pela HUD, sem somar valor local nem presumir crédito.
        if (sessao?.pagamento === 'creditado' && plataforma)
          await lojaDaGaleria(loja, plataforma).getState().carregar()
        if (minha === geracao && sessao) set({ sessao })
      } catch {
        if (minha === geracao)
          set({
            erro: 'A entrega está guardada neste aparelho. Tente confirmar as moedas novamente.',
          })
      } finally {
        if (minha === geracao) set({ ocupada: false })
      }
    },
    por(id) {
      if (!podeMudar() || get().ocupada) return
      const t = get().turno
      if (t) set({ turno: porNaBandeja(t, id) })
    },
    tirar(id) {
      if (!podeMudar() || get().ocupada) return
      const t = get().turno
      if (t) set({ turno: tirarDaBandeja(t, id) })
    },
    entregar() {
      if (!podeMudar() || get().ocupada) return
      const t = get().turno
      const sessao = get().sessao
      // Turno já fechado (um toque a mais no Entregar): nada a fazer.
      if (!t || !sessao || !fila || terminou(t)) return
      const r = entregarBandeja(t)
      if (!terminou(r.turno)) {
        if (r.certo) respostas.push({ ...t.bandeja })
        set({ turno: r.turno, resposta: r.fala })
        return
      }
      const jogo = loja.getState()
      // O dia do prêmio é o da sessão do serviço, mesmo atravessando a meia-noite no balcão.
      const fechado = fecharTurno(jogo.salvamento, r.turno, sessao.dia)
      if (!fechado) {
        set({
          erro: 'Os ingredientes não cabem inteiros na mochila. Use alguns e volte para receber tudo.',
        })
        return
      }
      try {
        fila.guardar(t.posto, { sessao: sessao.id, respostas: [...respostas, { ...t.bandeja }] })
      } catch {
        set({
          erro: 'Não foi possível guardar a entrega neste aparelho. A bandeja continua aqui para tentar novamente.',
        })
        return
      }
      jogo.mudar(() => fechado.salvamento)
      if (loja.getState().salvamento !== fechado.salvamento) return
      set({
        turno: r.turno,
        resposta: r.fala,
        tela: 'fim',
        fim: { estrelas: fechado.estrelas, pagou: fechado.pagou, falas: fechado.falas },
      })
      void get().confirmar()
    },
  }))
  lojas.set(loja, turno)
  return turno
}

export function useTurno<T>(turno: LojaDoTurno, escolher: (s: EstadoDoTurno) => T): T {
  return useStore(turno, escolher)
}

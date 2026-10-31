import type {
  Acesso,
  AvatarDoJogo,
  QuartoDoJogo,
  ResultadoDoPercurso,
  Salvamento,
  SalvamentoGuardado,
} from '@sistemazero/arquipelago-contracts'
import { createStore, type StoreApi } from 'zustand/vanilla'
import type { Clima } from '../sistemas/clima'
import { acaoEmCurso, encerraOTempo } from '../sistemas/fim-do-tempo'
import type { Isca } from '../sistemas/iscas'
import { trocarItensAntigos } from '../sistemas/itens'
import { PAINEIS_DO_MENU } from '../sistemas/paineis-do-menu'
import { salvamentoPausado } from '../sistemas/pausa'
import type { IdDoPercurso } from '../sistemas/percurso'
import type { SituacaoDoSalvamento } from '../sistemas/salvar'
import { minutosRestantes } from '../sistemas/tempo-livre'
import type { Visita } from '../sistemas/visitas'
import type { ModoDoCorpo } from './contexto'

/** O fim de uma corrida, para a tela de resultado. */
export interface ResultadoDaCorrida {
  percurso: IdDoPercurso
  tempoMs: number
  /** As estrelas DESTA corrida. */
  estrelas: ResultadoDoPercurso['estrelas']
  /** O melhor de todas as corridas, já com esta. */
  melhor: ResultadoDoPercurso
  /** Esta corrida bateu o melhor tempo de antes (a primeira não conta). */
  recorde: boolean
  vagalumes: number
  totalDeVagalumes: number
}

/** A corrida em andamento, para o cronômetro (o tempo corre fora do React). */
export interface CorridaNaTela {
  percurso: IdDoPercurso
  vagalumes: number
  totalDeVagalumes: number
}

/** Recados curtos duram sete segundos desde a emissão, mesmo trocando de cartão. */
const DURACAO_DO_RECADO_MS = 7000

/** O estado do jogo de UMA montagem (cada `montarArquipelago` cria a sua loja). */
export interface EstadoDoJogo {
  salvamento: Salvamento
  jornada: number
  quarto: QuartoDoJogo
  avatar: AvatarDoJogo
  acesso: Acesso
  dica: { id: number; texto: string; expiraEm: number } | null
  alvo: { id: string; rotulo: string } | null
  dentroDeCasa: boolean
  nadando: boolean
  menuAberto: boolean
  /**
   * A seção do menu aberta (`null` é o começo). Diário, álbum, caderno, mapa, moradores em casa e
   * visitas abrem dentro do menu (`PAINEIS_DO_MENU`), não por cima do jogo.
   */
  secaoDoMenu: string | null
  /** Um painel do mundo aberto por cima do jogo (o Quadro das Cores); o personagem para. */
  painelAberto: string | null
  ferramentaAberta: boolean
  tempoAcabou: boolean
  /** Quando o tempo acabou com uma ação em andamento (N07): o fim espera ela, até 30 s. */
  tempoAcabandoDesde: number | null
  tempoPausado: boolean
  tempoSincronizando: boolean
  salvamentoSituacao: SituacaoDoSalvamento
  definirSituacaoSalvamento(situacao: SituacaoDoSalvamento): void
  usadoHojeSegundos: number
  /** O que o corpo está fazendo (as dicas e o botão de toque mudam com isto). */
  modo: ModoDoCorpo
  corrida: CorridaNaTela | null
  resultado: ResultadoDaCorrida | null
  /** Conta os cortes suaves (a tela escurece e clareia a cada número novo). */
  corte: number
  /** Os patins calçados (`sistemas/patins.ts`; valem só se ainda estão na mochila, não é salvo). */
  patins: boolean
  /** A lanterna acesa (`sistemas/borroes.ts`; vale só se ainda está na mochila, não é salva). */
  lanterna: boolean
  /** A isca escolhida para a próxima pesca (`sistemas/iscas.ts`; vale só se está na mochila). */
  isca: Isca | null
  /** Sentada no banco ou deitada na cama (`sistemas/descanso.ts`), escrito pelo personagem. */
  descanso: 'sentar' | 'deitar' | null
  /** Cochilando onde está, com a energia no zero (`sistemas/descanso.ts`, `estado/relogios.tsx`). */
  cochilando: boolean
  /**
   * Na casa de um irmão (fase3-12, `sistemas/visitas.ts`): o mundo desenha a casa, o quintal e a
   * horta dele, e NADA é gravado (o `mudar` não faz nada). Não é salvo: recarregar volta para casa.
   */
  visita: Visita | null
  /**
   * Quando o jogo foi salvo pela última vez antes desta abertura (ms), para o que acontece com ele
   * fechado (`sistemas/jogo-fechado.ts`); `null` depois de usado ou num jogo novo.
   */
  fechadoDesde: number | null
  esquecerFechado(): void
  /** Muda o salvamento (a fila de salvamento grava depois). Na visita, não muda nada. */
  mudar(fn: (s: Salvamento) => Salvamento): void
  dizer(texto: string): void
  definirAlvo(alvo: { id: string; rotulo: string } | null): void
  definirLugar(lugar: { dentroDeCasa: boolean; nadando: boolean }): void
  abrirMenu(aberto: boolean): void
  escolherSecaoDoMenu(secao: string | null): void
  abrirPainel(painel: string | null): void
  definirFerramentaAberta(aberta: boolean): void
  definirTempoPausado(pausado: boolean): void
  definirTempoSincronizando(sincronizando: boolean): void
  registrarTempo(usadoHojeSegundos: number, acabou: boolean, limiteDiarioMinutos?: number): void
  adotar(guardado: SalvamentoGuardado): void
  definirModo(modo: EstadoDoJogo['modo']): void
  definirAvatar(avatar: AvatarDoJogo): void
  /** O quarto da plataforma, relido (§6.28, A10): mudou lá, muda aqui. */
  definirQuarto(quarto: QuartoDoJogo): void
  definirCorrida(corrida: CorridaNaTela | null): void
  mostrarResultado(resultado: ResultadoDaCorrida | null): void
  acharConstelacao(indice: number): void
  escolherClima(clima: Clima): void
  cortar(): void
  calcarPatins(calcados: boolean): void
  acenderLanterna(acesa: boolean): void
  escolherIsca(isca: Isca | null): void
  definirDescanso(jeito: 'sentar' | 'deitar' | null): void
  /** Começa (com a casa do irmão) ou termina (`null`) a visita. */
  visitar(visita: Visita | null): void
}

export interface DadosIniciais {
  salvamento: Salvamento
  jornada: number
  quarto: QuartoDoJogo
  avatar: AvatarDoJogo
  acesso: Acesso
  /** O `atualizadoEm` do salvamento lido do serviço, em ms. */
  fechadoDesde?: number | null
  aoMudar(s: Salvamento): void
}

export type LojaDoJogo = StoreApi<EstadoDoJogo>

export function criarLoja(d: DadosIniciais): LojaDoJogo {
  let proximaDica = 1
  return createStore<EstadoDoJogo>((set, get) => ({
    salvamento: d.salvamento,
    jornada: d.jornada,
    quarto: d.quarto,
    avatar: d.avatar,
    acesso: d.acesso,
    dica: null,
    alvo: null,
    dentroDeCasa: true,
    nadando: false,
    menuAberto: false,
    secaoDoMenu: null,
    painelAberto: null,
    ferramentaAberta: false,
    tempoAcabou: false,
    tempoAcabandoDesde: null,
    tempoPausado: false,
    tempoSincronizando: false,
    salvamentoSituacao: 'ok',
    definirSituacaoSalvamento(salvamentoSituacao) {
      set({
        salvamentoSituacao,
        // A confirmação é transitória e já tem um diálogo modal que bloqueia comandos.
        // Preserva o painel e a câmera para mostrar o recibo na mesma conversa.
        ...(salvamentoSituacao !== 'confirmando' && salvamentoPausado(salvamentoSituacao)
          ? { painelAberto: null }
          : {}),
      })
    },
    usadoHojeSegundos: d.acesso.usadoHojeSegundos,
    modo: 'chao',
    corrida: null,
    resultado: null,
    corte: 0,
    patins: false,
    lanterna: false,
    isca: null,
    descanso: null,
    cochilando: false,
    visita: null,
    fechadoDesde: d.fechadoDesde ?? null,
    esquecerFechado() {
      set({ fechadoDesde: null })
    },
    mudar(fn) {
      if (get().acesso.somenteLeitura || salvamentoPausado(get().salvamentoSituacao)) return
      // Na casa do irmão só se olha: nada do jogo dela muda (e nada do dele, que nem está aqui).
      if (get().visita) return
      const novo = fn(get().salvamento)
      if (novo === get().salvamento) return
      set({ salvamento: novo })
      d.aoMudar(novo)
    },
    dizer(texto) {
      set({ dica: { id: proximaDica++, texto, expiraEm: Date.now() + DURACAO_DO_RECADO_MS } })
    },
    definirAlvo(alvo) {
      const atual = get().alvo
      if (atual?.id === alvo?.id && atual?.rotulo === alvo?.rotulo) return
      set({ alvo })
    },
    definirLugar(lugar) {
      const s = get()
      if (s.dentroDeCasa === lugar.dentroDeCasa && s.nadando === lugar.nadando) return
      set(lugar)
    },
    abrirMenu(aberto) {
      set(aberto ? { menuAberto: true } : { menuAberto: false, secaoDoMenu: null })
    },
    escolherSecaoDoMenu(secao) {
      set({ secaoDoMenu: secao })
    },
    abrirPainel(painel) {
      // Os painéis do menu (31/10/2026) abrem como seção dele, de onde quer que venham.
      if (painel !== null && PAINEIS_DO_MENU.has(painel))
        set({ menuAberto: true, secaoDoMenu: painel, painelAberto: null })
      else set({ painelAberto: painel })
    },
    definirFerramentaAberta(aberta) {
      set({ ferramentaAberta: aberta })
    },
    definirTempoPausado(pausado) {
      // A tela do tempo cobre o jogo: um painel aberto por baixo (a conversa, o cuidar, o Quadro)
      // fecha, para nada ser escolhido nem gravado por trás dela.
      set(pausado ? { tempoPausado: true, painelAberto: null } : { tempoPausado: false })
    },
    definirTempoSincronizando(sincronizando) {
      set({ tempoSincronizando: sincronizando })
    },
    registrarTempo(usadoHojeSegundos, acabou, limiteDiarioMinutos) {
      const antes = get()
      // No fim de uma ação, o tempo espera ela acabar (N07); `encerrarTempo` termina a espera.
      const esperar =
        acabou &&
        !antes.tempoAcabou &&
        acaoEmCurso(antes) &&
        (antes.tempoAcabandoDesde === null ||
          !encerraOTempo(antes.tempoAcabandoDesde, Date.now(), true))
      const tempoAcabou = (acabou && !esperar) || antes.tempoAcabou
      set({
        usadoHojeSegundos,
        tempoAcabou,
        tempoAcabandoDesde: esperar ? (antes.tempoAcabandoDesde ?? Date.now()) : null,
        ...(tempoAcabou ? { painelAberto: null } : {}),
        ...(limiteDiarioMinutos === undefined
          ? {}
          : { acesso: { ...get().acesso, limiteDiarioMinutos } }),
      })
    },
    adotar(guardado) {
      if (guardado.salvamento) set({ salvamento: trocarItensAntigos(guardado.salvamento) })
    },
    definirModo(modo) {
      if (get().modo !== modo) set({ modo })
    },
    definirAvatar(avatar) {
      set({ avatar })
    },
    definirQuarto(quarto) {
      set({ quarto })
    },
    definirCorrida(corrida) {
      const atual = get().corrida
      if (
        atual === corrida ||
        (atual &&
          corrida &&
          atual.percurso === corrida.percurso &&
          atual.vagalumes === corrida.vagalumes &&
          atual.totalDeVagalumes === corrida.totalDeVagalumes)
      )
        return
      set({ corrida })
    },
    mostrarResultado(resultado) {
      set({ resultado })
    },
    escolherClima(clima) {
      get().mudar((s) => (s.clima === clima ? s : { ...s, clima }))
    },
    acharConstelacao(indice) {
      if (!Number.isInteger(indice) || indice < 0 || indice >= 6) return
      get().mudar((s) => {
        const constelacoes = s.nuvens.constelacoes | (1 << indice)
        return constelacoes === s.nuvens.constelacoes ? s : { ...s, nuvens: { constelacoes } }
      })
    },
    cortar() {
      set({ corte: get().corte + 1 })
    },
    calcarPatins(patins) {
      if (get().patins !== patins) set({ patins })
    },
    acenderLanterna(lanterna) {
      if (get().lanterna !== lanterna) set({ lanterna })
    },
    escolherIsca(isca) {
      if (get().isca !== isca) set({ isca })
    },
    visitar(visita) {
      set({ visita })
    },
    definirDescanso(descanso) {
      if (get().descanso !== descanso) set({ descanso })
    },
  }))
}

export function restanteDeHoje(s: EstadoDoJogo): number | null {
  return minutosRestantes(s.acesso.limiteDiarioMinutos, s.usadoHojeSegundos)
}

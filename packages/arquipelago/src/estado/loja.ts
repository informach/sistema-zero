import type {
  Acesso,
  AvatarDoJogo,
  PercursoId,
  QuartoDoJogo,
  ResultadoDoPercurso,
  Salvamento,
  SalvamentoGuardado,
} from '@sistemazero/arquipelago-contracts'
import { createStore, type StoreApi } from 'zustand/vanilla'
import { salvamentoPausado } from '../sistemas/pausa'
import type { SituacaoDoSalvamento } from '../sistemas/salvar'
import { minutosRestantes } from '../sistemas/tempo-livre'
import type { ModoDoCorpo } from './contexto'

/** O fim de uma corrida, para a tela de resultado. */
export interface ResultadoDaCorrida {
  percurso: PercursoId
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
  percurso: PercursoId
  vagalumes: number
  totalDeVagalumes: number
}

/** O estado do jogo de UMA montagem (cada `montarArquipelago` cria a sua loja). */
export interface EstadoDoJogo {
  salvamento: Salvamento
  jornada: number
  quarto: QuartoDoJogo
  avatar: AvatarDoJogo
  acesso: Acesso
  dica: { id: number; texto: string } | null
  alvo: { id: string; rotulo: string } | null
  dentroDeCasa: boolean
  nadando: boolean
  menuAberto: boolean
  /** Um painel do mundo aberto por cima do jogo (o Quadro das Cores); o personagem para. */
  painelAberto: string | null
  ferramentaAberta: boolean
  tempoAcabou: boolean
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
  /** Muda o salvamento (a fila de salvamento grava depois). */
  mudar(fn: (s: Salvamento) => Salvamento): void
  dizer(texto: string): void
  definirAlvo(alvo: { id: string; rotulo: string } | null): void
  definirLugar(lugar: { dentroDeCasa: boolean; nadando: boolean }): void
  abrirMenu(aberto: boolean): void
  abrirPainel(painel: string | null): void
  definirFerramentaAberta(aberta: boolean): void
  definirTempoPausado(pausado: boolean): void
  definirTempoSincronizando(sincronizando: boolean): void
  registrarTempo(usadoHojeSegundos: number, acabou: boolean, limiteDiarioMinutos?: number): void
  adotar(guardado: SalvamentoGuardado): void
  definirModo(modo: EstadoDoJogo['modo']): void
  definirCorrida(corrida: CorridaNaTela | null): void
  mostrarResultado(resultado: ResultadoDaCorrida | null): void
  cortar(): void
  calcarPatins(calcados: boolean): void
  acenderLanterna(acesa: boolean): void
}

export interface DadosIniciais {
  salvamento: Salvamento
  jornada: number
  quarto: QuartoDoJogo
  avatar: AvatarDoJogo
  acesso: Acesso
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
    painelAberto: null,
    ferramentaAberta: false,
    tempoAcabou: false,
    tempoPausado: false,
    tempoSincronizando: false,
    salvamentoSituacao: 'ok',
    definirSituacaoSalvamento(salvamentoSituacao) {
      set({
        salvamentoSituacao,
        ...(salvamentoPausado(salvamentoSituacao) ? { painelAberto: null } : {}),
      })
    },
    usadoHojeSegundos: d.acesso.usadoHojeSegundos,
    modo: 'chao',
    corrida: null,
    resultado: null,
    corte: 0,
    patins: false,
    lanterna: false,
    mudar(fn) {
      if (get().acesso.somenteLeitura || salvamentoPausado(get().salvamentoSituacao)) return
      const novo = fn(get().salvamento)
      if (novo === get().salvamento) return
      set({ salvamento: novo })
      d.aoMudar(novo)
    },
    dizer(texto) {
      set({ dica: { id: proximaDica++, texto } })
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
      set({ menuAberto: aberto })
    },
    abrirPainel(painel) {
      set({ painelAberto: painel })
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
      const tempoAcabou = acabou || get().tempoAcabou
      set({
        usadoHojeSegundos,
        tempoAcabou,
        ...(tempoAcabou ? { painelAberto: null } : {}),
        ...(limiteDiarioMinutos === undefined
          ? {}
          : { acesso: { ...get().acesso, limiteDiarioMinutos } }),
      })
    },
    adotar(guardado) {
      if (guardado.salvamento) set({ salvamento: guardado.salvamento })
    },
    definirModo(modo) {
      if (get().modo !== modo) set({ modo })
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
    cortar() {
      set({ corte: get().corte + 1 })
    },
    calcarPatins(patins) {
      if (get().patins !== patins) set({ patins })
    },
    acenderLanterna(lanterna) {
      if (get().lanterna !== lanterna) set({ lanterna })
    },
  }))
}

export function restanteDeHoje(s: EstadoDoJogo): number | null {
  return minutosRestantes(s.acesso.limiteDiarioMinutos, s.usadoHojeSegundos)
}

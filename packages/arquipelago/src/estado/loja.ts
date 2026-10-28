import type {
  Acesso,
  AvatarDoJogo,
  QuartoDoJogo,
  ResultadoDoPercurso,
  Salvamento,
  SalvamentoGuardado,
} from '@sistemazero/arquipelago-contracts'
import { createStore, type StoreApi } from 'zustand/vanilla'
import { minutosRestantes } from '../sistemas/tempo-livre'
import type { ModoDoCorpo } from './contexto'

/** O fim de uma corrida, para a tela de resultado. */
export interface ResultadoDaCorrida {
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
  ferramentaAberta: boolean
  tempoAcabou: boolean
  tempoPausado: boolean
  usadoHojeSegundos: number
  /** O que o corpo está fazendo (as dicas e o botão de toque mudam com isto). */
  modo: ModoDoCorpo
  corrida: CorridaNaTela | null
  resultado: ResultadoDaCorrida | null
  /** Conta os cortes suaves (a tela escurece e clareia a cada número novo). */
  corte: number
  /** Muda o salvamento (a fila de salvamento grava depois). */
  mudar(fn: (s: Salvamento) => Salvamento): void
  dizer(texto: string): void
  definirAlvo(alvo: { id: string; rotulo: string } | null): void
  definirLugar(lugar: { dentroDeCasa: boolean; nadando: boolean }): void
  abrirMenu(aberto: boolean): void
  definirFerramentaAberta(aberta: boolean): void
  definirTempoPausado(pausado: boolean): void
  registrarTempo(usadoHojeSegundos: number, acabou: boolean): void
  adotar(guardado: SalvamentoGuardado): void
  definirModo(modo: EstadoDoJogo['modo']): void
  definirCorrida(corrida: CorridaNaTela | null): void
  mostrarResultado(resultado: ResultadoDaCorrida | null): void
  cortar(): void
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
    ferramentaAberta: false,
    tempoAcabou: false,
    tempoPausado: false,
    usadoHojeSegundos: d.acesso.usadoHojeSegundos,
    modo: 'chao',
    corrida: null,
    resultado: null,
    corte: 0,
    mudar(fn) {
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
    definirFerramentaAberta(aberta) {
      set({ ferramentaAberta: aberta })
    },
    definirTempoPausado(pausado) {
      set({ tempoPausado: pausado })
    },
    registrarTempo(usadoHojeSegundos, acabou) {
      set({ usadoHojeSegundos, tempoAcabou: acabou || get().tempoAcabou })
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
  }))
}

export function restanteDeHoje(s: EstadoDoJogo): number | null {
  return minutosRestantes(s.acesso.limiteDiarioMinutos, s.usadoHojeSegundos)
}

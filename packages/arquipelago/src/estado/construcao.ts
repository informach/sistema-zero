import type { Obra, PisoDaCasa, TipoDeAbertura } from '@sistemazero/arquipelago-contracts'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import { falaDaRecusa } from '../sistemas/construcao/falas'
import { LOTE_DA_CASA } from '../sistemas/construcao/lote'
import type { Resultado } from '../sistemas/construcao/obra'
import { salvamentoPausado } from '../sistemas/pausa'
import type { EstadoDoJogo, LojaDoJogo } from './loja'

/** O valor de `painelAberto` do modo Construir (o personagem para; Esc volta ao Viver). */
export const PAINEL_DE_CONSTRUIR = 'construir'

/** A barra e as operações obedecem aos mesmos bloqueios, inclusive durante a conciliação. */
export function podeConstruir(s: EstadoDoJogo): boolean {
  return (
    s.acesso.liberado &&
    !s.acesso.somenteLeitura &&
    s.salvamento.casa.portaNova &&
    !s.menuAberto &&
    !s.ferramentaAberta &&
    !s.tempoAcabou &&
    !s.tempoPausado &&
    !s.tempoSincronizando &&
    !salvamentoPausado(s.salvamentoSituacao) &&
    s.resultado === null &&
    (s.painelAberto === null || s.painelAberto === PAINEL_DE_CONSTRUIR)
  )
}

export type Ferramenta = 'olhar' | 'parede' | 'porta' | 'janela' | 'piso' | 'apagar'
export type TipoDeJanela = Exclude<TipoDeAbertura, 'porta'>

/** Quantas obras para trás o "Desfazer" lembra (só enquanto o Construir está aberto). */
export const LEMBRA_PARA_TRAS = 30

/** A câmera de obra: o ponto do chão para onde olha, o giro, a inclinação e a distância. */
export interface CameraDeObra {
  alvo: { x: number; z: number }
  giro: number
  inclinacao: number
  distancia: number
}

export const CAMERA_DE_OBRA = {
  /** Começa olhando para o meio da casa. */
  alvo: { x: 0, z: -3 },
  inclinacao: 0.95,
  distancia: 24,
  distanciaMinima: 8,
  distanciaMaxima: 40,
  /** Quanto o giro anda por toque nos botões (um oitavo de volta). */
  passoDoGiro: Math.PI / 4,
  /** Metros por segundo das setas e do WASD. */
  rapidez: 12,
} as const

export interface EstadoDaConstrucao {
  ferramenta: Ferramenta
  janela: TipoDeJanela
  piso: PisoDaCasa
  camera: CameraDeObra
  /** As obras de antes (para desfazer), da mais antiga para a mais nova. */
  antes: Obra[]
  /** A pessoa está num cômodo da obra (o telhado sai e as paredes da frente são cortadas). */
  dentroDaObra: boolean
  definirDentroDaObra(dentro: boolean): void
  escolher(f: Ferramenta): void
  escolherJanela(j: TipoDeJanela): void
  escolherPiso(p: PisoDaCasa): void
  moverCamera(c: Partial<CameraDeObra>): void
  /** Grava o resultado de uma mudança na obra da casa (ou faz o Zappy explicar a recusa). */
  aplicar(r: Resultado): boolean
  desfazer(): void
  /**
   * Abre o Construir: na primeira vez, a casa de antes vira a obra inicial do lote. A câmera de obra
   * abre sempre de frente para a casa (a mesma vista toda vez; os botões giram).
   */
  abrir(): void
  fechar(): void
}

export type LojaDaConstrucao = StoreApi<EstadoDaConstrucao>

const lojas = new WeakMap<LojaDoJogo, LojaDaConstrucao>()

export function lojaDaConstrucao(loja: LojaDoJogo): LojaDaConstrucao {
  const feita = lojas.get(loja)
  if (feita) return feita
  const nova = criarLojaDaConstrucao(loja)
  lojas.set(loja, nova)
  return nova
}

function mudarObra(loja: LojaDoJogo, obra: Obra) {
  loja.getState().mudar((s) => ({ ...s, construcao: { ...s.construcao, casa: obra } }))
}

export function criarLojaDaConstrucao(loja: LojaDoJogo): LojaDaConstrucao {
  let ultimaObra: Obra | null = null
  return createStore<EstadoDaConstrucao>((set, get) => ({
    ferramenta: 'parede',
    janela: 'janela-grande',
    piso: 'tabua',
    camera: { ...CAMERA_DE_OBRA, alvo: { ...CAMERA_DE_OBRA.alvo }, giro: 0 },
    antes: [],
    dentroDaObra: false,
    definirDentroDaObra: (dentro) => {
      if (get().dentroDaObra !== dentro) set({ dentroDaObra: dentro })
    },
    escolher: (ferramenta) => set({ ferramenta }),
    escolherJanela: (janela) => set({ janela, ferramenta: 'janela' }),
    escolherPiso: (piso) => set({ piso, ferramenta: 'piso' }),
    moverCamera: (c) => set({ camera: { ...get().camera, ...c } }),
    aplicar(r) {
      const jogo = loja.getState()
      if (!podeConstruir(jogo) || jogo.painelAberto !== PAINEL_DE_CONSTRUIR) return false
      if (!r.ok) {
        const fala = falaDaRecusa(r)
        if (fala) loja.getState().dizer(fala)
        return false
      }
      const atual = loja.getState().salvamento.construcao.casa
      const historico = atual === ultimaObra ? get().antes : []
      if (atual) set({ antes: [...historico, atual].slice(-LEMBRA_PARA_TRAS) })
      mudarObra(loja, r.obra)
      ultimaObra = r.obra
      return true
    },
    desfazer() {
      const jogo = loja.getState()
      if (!podeConstruir(jogo) || jogo.painelAberto !== PAINEL_DE_CONSTRUIR) return
      if (jogo.salvamento.construcao.casa !== ultimaObra) {
        set({ antes: [] })
        ultimaObra = jogo.salvamento.construcao.casa
        return
      }
      const antes = get().antes
      const anterior = antes.at(-1)
      if (!anterior) return
      set({ antes: antes.slice(0, -1) })
      mudarObra(loja, anterior)
      ultimaObra = anterior
    },
    abrir() {
      const s = loja.getState()
      if (!podeConstruir(s)) return
      if (!s.salvamento.construcao.casa) mudarObra(loja, structuredClone(LOTE_DA_CASA.obraInicial))
      ultimaObra = loja.getState().salvamento.construcao.casa
      set({
        antes: [],
        camera: { ...get().camera, alvo: { ...CAMERA_DE_OBRA.alvo }, giro: 0 },
      })
      s.abrirMenu(false)
      s.abrirPainel(PAINEL_DE_CONSTRUIR)
    },
    fechar() {
      set({ antes: [] })
      ultimaObra = null
      if (loja.getState().painelAberto === PAINEL_DE_CONSTRUIR) loja.getState().abrirPainel(null)
    },
  }))
}

export function useConstrucao<T>(loja: LojaDaConstrucao, seletor: (s: EstadoDaConstrucao) => T): T {
  return useStore(loja, seletor)
}

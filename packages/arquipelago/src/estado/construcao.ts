import type {
  ObjetoDaCasa,
  Obra,
  PisoDaCasa,
  PisoDoQuintal,
} from '@sistemazero/arquipelago-contracts'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import { falaDaRecusa } from '../sistemas/construcao/falas'
import type { Ferramenta, TipoDeJanela } from '../sistemas/construcao/ferramentas'
import { LOTE_DA_CASA } from '../sistemas/construcao/lote'
import type { Resultado } from '../sistemas/construcao/obra'
import { hortaComOQuintal } from '../sistemas/construcao/quintal'
import type { LojaDoJogo } from './loja'

/** O valor de `painelAberto` do modo Construir (o personagem para; Esc volta ao Viver). */
export const PAINEL_DE_CONSTRUIR = 'construir'

export type { Ferramenta, TipoDeJanela } from '../sistemas/construcao/ferramentas'

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
  caminho: PisoDoQuintal
  /** O objeto escolhido na ferramenta Objeto e o giro dele (quartos de volta). */
  objeto: ObjetoDaCasa | null
  giro: number
  camera: CameraDeObra
  /** As obras de antes (para desfazer), da mais antiga para a mais nova. */
  antes: Obra[]
  /** A pessoa está num cômodo da obra (o telhado sai e as paredes da frente são cortadas). */
  dentroDaObra: boolean
  definirDentroDaObra(dentro: boolean): void
  escolher(f: Ferramenta): void
  escolherJanela(j: TipoDeJanela): void
  escolherPiso(p: PisoDaCasa): void
  escolherCaminho(c: PisoDoQuintal): void
  escolherObjeto(o: ObjetoDaCasa): void
  girarObjeto(): void
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

/** Grava a obra da casa; a horta segue os canteiros do quintal (`hortaComOQuintal`). */
function mudarObra(loja: LojaDoJogo, obra: Obra) {
  loja.getState().mudar((s) => ({
    ...s,
    construcao: { ...s.construcao, casa: obra },
    horta: hortaComOQuintal(s.horta, obra),
  }))
}

export function criarLojaDaConstrucao(loja: LojaDoJogo): LojaDaConstrucao {
  return createStore<EstadoDaConstrucao>((set, get) => ({
    ferramenta: 'parede',
    janela: 'janela-grande',
    piso: 'tabua',
    caminho: 'pedra',
    objeto: null,
    giro: 0,
    camera: { ...CAMERA_DE_OBRA, alvo: { ...CAMERA_DE_OBRA.alvo }, giro: 0 },
    antes: [],
    dentroDaObra: false,
    definirDentroDaObra: (dentro) => {
      if (get().dentroDaObra !== dentro) set({ dentroDaObra: dentro })
    },
    escolher: (ferramenta) => set({ ferramenta }),
    escolherJanela: (janela) => set({ janela, ferramenta: 'janela' }),
    escolherPiso: (piso) => set({ piso, ferramenta: 'piso' }),
    escolherCaminho: (caminho) => set({ caminho, ferramenta: 'caminho' }),
    escolherObjeto: (objeto) => set({ objeto, ferramenta: 'objeto' }),
    girarObjeto: () => set({ giro: (get().giro + 1) % 4 }),
    moverCamera: (c) => set({ camera: { ...get().camera, ...c } }),
    aplicar(r) {
      if (!r.ok) {
        const fala = falaDaRecusa(r)
        if (fala) loja.getState().dizer(fala)
        return false
      }
      const atual = loja.getState().salvamento.construcao.casa
      if (atual) set({ antes: [...get().antes, atual].slice(-LEMBRA_PARA_TRAS) })
      mudarObra(loja, r.obra)
      return true
    },
    desfazer() {
      const antes = get().antes
      const anterior = antes.at(-1)
      if (!anterior) return
      set({ antes: antes.slice(0, -1) })
      mudarObra(loja, anterior)
    },
    abrir() {
      const s = loja.getState()
      if (!s.salvamento.construcao.casa) mudarObra(loja, structuredClone(LOTE_DA_CASA.obraInicial))
      set({
        antes: [],
        camera: { ...get().camera, alvo: { ...CAMERA_DE_OBRA.alvo }, giro: 0 },
      })
      s.abrirMenu(false)
      s.abrirPainel(PAINEL_DE_CONSTRUIR)
    },
    fechar() {
      set({ antes: [] })
      if (loja.getState().painelAberto === PAINEL_DE_CONSTRUIR) loja.getState().abrirPainel(null)
    },
  }))
}

export function useConstrucao<T>(loja: LojaDaConstrucao, seletor: (s: EstadoDaConstrucao) => T): T {
  return useStore(loja, seletor)
}

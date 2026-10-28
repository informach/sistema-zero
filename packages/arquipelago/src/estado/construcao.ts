import {
  type ObjetoDaCasa,
  type Obra,
  ObraSchema,
  type PisoDaCasa,
  type PisoDoQuintal,
} from '@sistemazero/arquipelago-contracts'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import { falaDaRecusa } from '../sistemas/construcao/falas'
import type { Ferramenta, TipoDeJanela } from '../sistemas/construcao/ferramentas'
import { LOTE_DA_CASA, type Lote, OBRA_VAZIA } from '../sistemas/construcao/lote'
import type { Resultado } from '../sistemas/construcao/obra'
import { hortaComOQuintal } from '../sistemas/construcao/quintal'
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

/** Onde está a obra que o Construir mexe: a casa, ou a cabana de uma ilha. */
export type OndeSeConstroi = Lote['id']

/** A cabana da ilha ativa (registrada por ela) e se a pessoa está no lote ou perto dele. */
export interface CabanaAoAlcance {
  lote: Lote
  perto: boolean
}

/** A obra de cada lugar no salvamento (a casa, ou a cabana da ilha). */
export function obraDe(s: EstadoDoJogo, onde: OndeSeConstroi): Obra | null {
  return onde === 'casa'
    ? s.salvamento.construcao.casa
    : (s.salvamento.construcao.cabanas[onde] ?? null)
}

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
  /** A obra que o Construir aberto mexe (escolhida ao abrir: a cabana, se a pessoa está nela). */
  onde: OndeSeConstroi
  cabana: CabanaAoAlcance | null
  /** A ilha ativa registra a cabana dela (e solta, com `null`, ao sair). */
  registrarCabana(c: CabanaAoAlcance | null): void
  definirPertoDaCabana(perto: boolean): void
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

/**
 * Grava a obra de um lugar. Na casa, a horta segue os canteiros do quintal (`hortaComOQuintal`); a
 * cabana não tem canteiro.
 */
function mudarObra(loja: LojaDoJogo, obra: Obra, onde: OndeSeConstroi) {
  loja.getState().mudar((s) =>
    onde === 'casa'
      ? {
          ...s,
          construcao: { ...s.construcao, casa: obra },
          horta: hortaComOQuintal(s.horta, obra),
        }
      : {
          ...s,
          construcao: { ...s.construcao, cabanas: { ...s.construcao.cabanas, [onde]: obra } },
        },
  )
}

/** Para onde a câmera de obra olha ao abrir: o meio da casa, ou o meio do lote da cabana. */
function alvoAoAbrir(onde: OndeSeConstroi, cabana: CabanaAoAlcance | null) {
  if (onde === 'casa' || !cabana) return { ...CAMERA_DE_OBRA.alvo }
  const { x0, z0, x1, z1 } = cabana.lote.area
  return { x: (x0 + x1) / 2, z: (z0 + z1) / 2 }
}

export function criarLojaDaConstrucao(loja: LojaDoJogo): LojaDaConstrucao {
  let ultimaObra: Obra | null = null
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
    onde: 'casa',
    cabana: null,
    registrarCabana: (cabana) => set({ cabana }),
    definirPertoDaCabana: (perto) => {
      const c = get().cabana
      if (c && c.perto !== perto) set({ cabana: { ...c, perto } })
    },
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
      const jogo = loja.getState()
      if (!podeConstruir(jogo) || jogo.painelAberto !== PAINEL_DE_CONSTRUIR) return false
      if (!r.ok) {
        const fala = falaDaRecusa(r)
        if (fala) loja.getState().dizer(fala)
        return false
      }
      // Os limites de células/arestas do lote não são os limites de trechos serializados.
      // Validar na confirmação (não a cada movimento da prévia) evita gravar algo que o
      // serviço recusaria, inclusive quando novas ferramentas forem acrescentadas.
      if (!ObraSchema.safeParse(r.obra).success) {
        const fala = falaDaRecusa({ motivo: 'limite' })
        if (fala) jogo.dizer(fala)
        return false
      }
      const onde = get().onde
      const atual = obraDe(loja.getState(), onde)
      const historico = atual === ultimaObra ? get().antes : []
      if (atual) set({ antes: [...historico, atual].slice(-LEMBRA_PARA_TRAS) })
      mudarObra(loja, r.obra, onde)
      ultimaObra = r.obra
      return true
    },
    desfazer() {
      const jogo = loja.getState()
      if (!podeConstruir(jogo) || jogo.painelAberto !== PAINEL_DE_CONSTRUIR) return
      const onde = get().onde
      if (obraDe(jogo, onde) !== ultimaObra) {
        set({ antes: [] })
        ultimaObra = obraDe(jogo, onde)
        return
      }
      const antes = get().antes
      const anterior = antes.at(-1)
      if (!anterior) return
      set({ antes: antes.slice(0, -1) })
      mudarObra(loja, anterior, onde)
      ultimaObra = anterior
    },
    abrir() {
      const s = loja.getState()
      if (!podeConstruir(s)) return
      const cabana = get().cabana
      const onde: OndeSeConstroi = cabana?.perto ? cabana.lote.id : 'casa'
      if (!obraDe(s, onde)) {
        const inicial = onde === 'casa' ? LOTE_DA_CASA.obraInicial : OBRA_VAZIA
        mudarObra(loja, structuredClone(inicial), onde)
      }
      ultimaObra = obraDe(loja.getState(), onde)
      set({
        onde,
        antes: [],
        camera: { ...get().camera, alvo: alvoAoAbrir(onde, cabana), giro: 0 },
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

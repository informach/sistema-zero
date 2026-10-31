import {
  BIT_DO_COMODO,
  COMODOS_DA_IRIS,
  type ComodoDaIris,
  chavesUsadasNaObra,
  type Movel,
  type ObjetoDaCasa,
  type Obra,
  ObraDaCabanaSchema,
  ObraDaCasaSchema,
  type PisoDaCasa,
  type PisoDoQuintal,
  type Terreno,
} from '@sistemazero/arquipelago-contracts'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import {
  comodoDaFerramenta,
  comodoDaJanela,
  comodoDoPiso,
  liberado,
  recadoDaTranca,
} from '../sistemas/chaves-da-casa'
import { falaDaRecusa } from '../sistemas/construcao/falas'
import type { Ferramenta, TipoDeJanela } from '../sistemas/construcao/ferramentas'
import {
  type Celula,
  LOTE_DA_CASA,
  type Lote,
  loteDaCasa,
  OBRA_VAZIA,
} from '../sistemas/construcao/lote'
import type { Resultado } from '../sistemas/construcao/obra'
import { hortaComOQuintal } from '../sistemas/construcao/quintal'
import { FALA_DO_TERRENO, moldarCelulas, podeMoldarOTerreno } from '../sistemas/construcao/terreno'
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
    // Durante um percurso a barra Viver/Construir sairia em cima do cronômetro (os dois no topo).
    s.corrida === null &&
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

/**
 * Onde mora a obra de uma cabana que não está no salvamento (o iglu do Pico, no documento à parte
 * do serviço): ler e gravar passam por ela.
 */
export interface FonteDaObra {
  ler(): Obra | null
  gravar(obra: Obra): void
}

/** Onde mora o terreno moldado do lote da casa (o documento à parte do serviço). */
export interface FonteDoTerreno {
  ler(): Terreno | null
  gravar(terreno: Terreno | null): void
}

/** A cabana da ilha ativa (registrada por ela) e se a pessoa está no lote ou perto dele. */
export interface CabanaAoAlcance {
  lote: Lote
  perto: boolean
  /** A obra fora do salvamento (o iglu); sem ela, a cabana é a de `construcao.cabanas`. */
  fonte?: FonteDaObra
}

/**
 * A obra de cada lugar: a casa e as cabanas do salvamento, ou a da cabana registrada com fonte
 * própria (o iglu).
 */
export function obraDe(
  s: EstadoDoJogo,
  onde: OndeSeConstroi,
  cabana?: CabanaAoAlcance | null,
): Obra | null {
  if (onde === 'casa') return s.salvamento.construcao.casa
  if (cabana?.fonte && cabana.lote.id === onde) return cabana.fonte.ler()
  return onde === 'pico' ? null : (s.salvamento.construcao.cabanas[onde] ?? null)
}

export interface EstadoDaConstrucao {
  /** Inspeção local, sem entrar no salvamento ou no histórico da obra. */
  aconchegoAberto: boolean
  celulaObservada: Celula | null
  observarComodo(celula: Celula | null): void
  mostrarAconchego(aberto: boolean): void
  ferramenta: Ferramenta
  janela: TipoDeJanela
  piso: PisoDaCasa
  caminho: PisoDoQuintal
  /** O objeto escolhido na ferramenta Objeto e o giro dele (quartos de volta). */
  objeto: ObjetoDaCasa | null
  /** O móvel escolhido na ferramenta Móveis (o giro é o mesmo do objeto). */
  movel: Movel | null
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
  /** O Terreno sobe (`1`) ou desce (`-1`) o chão. */
  moldar: 1 | -1
  escolherMoldar(passo: 1 | -1): void
  /** A casa registra onde mora o terreno (e solta, com `null`). */
  fonteDoTerreno: FonteDoTerreno | null
  registrarTerreno(f: FonteDoTerreno | null): void
  /** Os terrenos de antes (o Desfazer do Terreno, à parte do da obra). */
  antesDoTerreno: (Terreno | null)[]
  /** Sobe ou desce as células no lote da casa (ou faz o Zappy explicar por que não dá). */
  moldarTerreno(celulas: readonly Celula[]): boolean
  definirPertoDaCabana(perto: boolean): void
  definirDentroDaObra(dentro: boolean): void
  escolher(f: Ferramenta): void
  escolherJanela(j: TipoDeJanela): void
  escolherPiso(p: PisoDaCasa): void
  escolherCaminho(c: PisoDoQuintal): void
  escolherObjeto(o: ObjetoDaCasa): void
  escolherMovel(m: Movel): void
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
function mudarObra(
  loja: LojaDoJogo,
  obra: Obra,
  onde: OndeSeConstroi,
  cabana?: CabanaAoAlcance | null,
) {
  if (onde !== 'casa' && cabana?.fonte && cabana.lote.id === onde) {
    cabana.fonte.gravar(obra)
    return
  }
  if (onde === 'pico') return
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

/** A escolha está destrancada? Se não, o Zappy diz qual chave falta (N11). */
function destrancado(loja: LojaDoJogo, comodo: ComodoDaIris | null): boolean {
  const jogo = loja.getState()
  if (liberado(jogo.salvamento.chaves, comodo)) return true
  if (comodo) jogo.dizer(recadoDaTranca(comodo))
  return false
}

export function criarLojaDaConstrucao(loja: LojaDoJogo): LojaDaConstrucao {
  let ultimaObra: Obra | null = null
  return createStore<EstadoDaConstrucao>((set, get) => ({
    aconchegoAberto: false,
    celulaObservada: null,
    observarComodo: (celulaObservada) => set({ celulaObservada, aconchegoAberto: true }),
    mostrarAconchego: (aconchegoAberto) => set({ aconchegoAberto }),
    ferramenta: 'parede',
    // A janela redonda é livre; a grande e a em arco esperam a chave da sala (N11).
    janela: 'janela-redonda',
    piso: 'tabua',
    caminho: 'pedra',
    objeto: null,
    movel: null,
    giro: 0,
    camera: { ...CAMERA_DE_OBRA, alvo: { ...CAMERA_DE_OBRA.alvo }, giro: 0 },
    antes: [],
    dentroDaObra: false,
    onde: 'casa',
    cabana: null,
    registrarCabana: (cabana) => set({ cabana }),
    moldar: 1,
    escolherMoldar: (moldar) => set({ moldar, ferramenta: 'terreno', aconchegoAberto: false }),
    fonteDoTerreno: null,
    registrarTerreno: (fonteDoTerreno) => set({ fonteDoTerreno }),
    antesDoTerreno: [],
    moldarTerreno(celulas) {
      const jogo = loja.getState()
      const fonte = get().fonteDoTerreno
      if (!podeConstruir(jogo) || jogo.painelAberto !== PAINEL_DE_CONSTRUIR) return false
      if (!fonte || get().onde !== 'casa' || !podeMoldarOTerreno(jogo.jornada)) return false
      const antes = fonte.ler()
      const obra = jogo.salvamento.construcao.casa
      const r = moldarCelulas(antes, obra, loteDaCasa(jogo.jornada), celulas, get().moldar)
      if (!r.ok) {
        jogo.dizer(FALA_DO_TERRENO[r.motivo])
        return false
      }
      set({ antesDoTerreno: [...get().antesDoTerreno, antes].slice(-LEMBRA_PARA_TRAS) })
      fonte.gravar(r.terreno)
      return true
    },
    definirPertoDaCabana: (perto) => {
      const c = get().cabana
      if (c && c.perto !== perto) set({ cabana: { ...c, perto } })
    },
    definirDentroDaObra: (dentro) => {
      if (get().dentroDaObra !== dentro) set({ dentroDaObra: dentro })
    },
    escolher: (ferramenta) => {
      if (!destrancado(loja, comodoDaFerramenta(ferramenta))) return
      set({ ferramenta, aconchegoAberto: false })
    },
    escolherJanela: (janela) => {
      if (!destrancado(loja, comodoDaJanela(janela))) return
      set({ janela, ferramenta: 'janela' })
    },
    escolherPiso: (piso) => {
      if (!destrancado(loja, comodoDoPiso(piso))) return
      set({ piso, ferramenta: 'piso' })
    },
    escolherCaminho: (caminho) => set({ caminho, ferramenta: 'caminho' }),
    escolherObjeto: (objeto) => set({ objeto, ferramenta: 'objeto' }),
    escolherMovel: (movel) => set({ movel, ferramenta: 'movel' }),
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
      const esquema = get().onde === 'casa' ? ObraDaCasaSchema : ObraDaCabanaSchema
      if (!esquema.safeParse(r.obra).success) {
        const fala = falaDaRecusa({ motivo: 'limite' })
        if (fala) jogo.dizer(fala)
        return false
      }
      const onde = get().onde
      const cabana = get().cabana
      const atual = obraDe(loja.getState(), onde, cabana)
      // Nada trancado entra na obra (N11): só o que a chave abriu ou o que a obra já usava.
      const novas =
        chavesUsadasNaObra(r.obra) & ~chavesUsadasNaObra(atual) & ~jogo.salvamento.chaves
      const trancado = COMODOS_DA_IRIS.find((c) => (novas & BIT_DO_COMODO[c]) !== 0)
      if (trancado) {
        jogo.dizer(recadoDaTranca(trancado))
        return false
      }
      const historico = atual === ultimaObra ? get().antes : []
      if (atual) set({ antes: [...historico, atual].slice(-LEMBRA_PARA_TRAS) })
      mudarObra(loja, r.obra, onde, cabana)
      ultimaObra = r.obra
      return true
    },
    desfazer() {
      const jogo = loja.getState()
      if (!podeConstruir(jogo) || jogo.painelAberto !== PAINEL_DE_CONSTRUIR) return
      // Com o Terreno na mão, o Desfazer volta o chão (a obra tem o histórico dela).
      if (get().ferramenta === 'terreno') {
        const lista = get().antesDoTerreno
        const fonte = get().fonteDoTerreno
        if (!fonte || lista.length === 0) return
        set({ antesDoTerreno: lista.slice(0, -1) })
        fonte.gravar(lista.at(-1) ?? null)
        return
      }
      const onde = get().onde
      const cabana = get().cabana
      if (obraDe(jogo, onde, cabana) !== ultimaObra) {
        set({ antes: [] })
        ultimaObra = obraDe(jogo, onde, cabana)
        return
      }
      const antes = get().antes
      const anterior = antes.at(-1)
      if (!anterior) return
      set({ antes: antes.slice(0, -1) })
      mudarObra(loja, anterior, onde, cabana)
      ultimaObra = anterior
    },
    abrir() {
      const s = loja.getState()
      if (!podeConstruir(s)) return
      const cabana = get().cabana
      const onde: OndeSeConstroi = cabana?.perto ? cabana.lote.id : 'casa'
      if (!obraDe(s, onde, cabana)) {
        const inicial = onde === 'casa' ? LOTE_DA_CASA.obraInicial : OBRA_VAZIA
        mudarObra(loja, structuredClone(inicial), onde, cabana)
      }
      ultimaObra = obraDe(loja.getState(), onde, cabana)
      set({
        onde,
        aconchegoAberto: false,
        celulaObservada: null,
        antes: [],
        antesDoTerreno: [],
        camera: { ...get().camera, alvo: alvoAoAbrir(onde, cabana), giro: 0 },
      })
      s.abrirMenu(false)
      s.abrirPainel(PAINEL_DE_CONSTRUIR)
    },
    fechar() {
      set({ antes: [], antesDoTerreno: [] })
      ultimaObra = null
      if (loja.getState().painelAberto === PAINEL_DE_CONSTRUIR) loja.getState().abrirPainel(null)
    },
  }))
}

export function useConstrucao<T>(loja: LojaDaConstrucao, seletor: (s: EstadoDaConstrucao) => T): T {
  return useStore(loja, seletor)
}

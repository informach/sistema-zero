import type { Plataforma } from '@sistemazero/arquipelago-contracts'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import {
  chaveDasDicas,
  type IdDaDica,
  lerMarcaDasDicas,
  type MarcaDasDicas,
  podeMostrar,
} from '../sistemas/dicas'
import {
  type Anel,
  chaveDosPassos,
  comoComeca,
  cumpriu,
  INICIO_DA_OBRA,
  ISSO_MS,
  indiceDoPasso,
  LEMBRETE_MS,
  type Leitura,
  lerMarca,
  type MarcaDosPassos,
  PASSO_DA_GELADEIRA,
  PASSO_FINAL,
  PASSOS,
  passoQueVale,
  voltarAoConstruir,
} from '../sistemas/primeiros-passos'
import type { LojaDoJogo } from './loja'

/** O valor de `painelAberto` do cartão do fim ("O que você já sabe"): o jogo para por baixo. */
export const PAINEL_DOS_PASSOS = 'primeiros-passos'

/** De onde o passo começou a contar (andar, olhar e pular contam a partir daqui). */
export interface Base {
  x: number
  z: number
  giro: number
  pulos: number
  /** O maior giro desde a base (ir e voltar não zera). */
  girou: number
}

export interface EstadoDosPassos {
  /** `parado`: ainda não começou (ou não guardou nada) nesta montagem. */
  situacao: 'parado' | 'andando' | 'pulado' | 'feito'
  indice: number
  /** A fala normal, o "Isso." depois da tarefa ou o lembrete do que o jogo já tem. */
  fase: 'fala' | 'isso' | 'lembrete'
  desde: number
  /** A fala aberta (o X a recolhe para o Agora, quando o passo tem tarefa). */
  aberta: boolean
  confirmandoPular: boolean
  obra: 'agora' | 'depois' | null
  obraPendente: boolean
  /** Retomando só a obra da geladeira (escolheu "Depois" e abriu o Construir). */
  soObra: boolean
  base: Base | null
  /** Falas do jogo seguradas enquanto o tutorial anda (a planta de interior). */
  adiadas: string[]
  /** Dicas de primeira vez. */
  dicas: MarcaDasDicas
  fila: { id: IdDaDica; rever: boolean }[]
  falaDaDica: number
  confirmandoDesligar: boolean
  /** O que a tela mostra agora: o anel da HUD (com a cor do tutorial ou da dica) e o cartão. */
  tela: { anel: Anel | null; dica: boolean; cartao: boolean }

  comecar(l: Leitura, de: 'sozinho' | 'continuar' | 'recomecar'): void
  relogio(l: Leitura, agora: number): void
  fechar(l: Leitura): void
  reabrir(): void
  perguntarPular(sim: boolean): void
  pular(): void
  escolherObra(obra: 'agora' | 'depois', l: Leitura): void
  retomarObra(l: Leitura): void
  definirBase(base: Base | null): void
  adiar(texto: string): void
  /** O tutorial está na tela (andando): falas soltas do jogo esperam ou entram nele. */
  andando(): boolean

  pedirDica(id: IdDaDica): boolean
  reverDica(id: IdDaDica): void
  proximaFalaDaDica(total: number): void
  perguntarDesligar(sim: boolean): void
  ligarDicas(ligadas: boolean): void
  definirTela(tela: EstadoDosPassos['tela']): void
}

export type LojaDosPassos = StoreApi<EstadoDosPassos>

const lojas = new WeakMap<LojaDoJogo, LojaDosPassos>()

function ler(chave: string): string | null | undefined {
  try {
    return localStorage.getItem(chave)
  } catch {
    return undefined
  }
}

function gravar(chave: string, valor: unknown): void {
  try {
    localStorage.setItem(chave, JSON.stringify(valor))
  } catch {
    // Sem armazenamento: vale só enquanto o jogo está aberto.
  }
}

/**
 * A marca dos primeiros passos no aparelho: `null` quando o aparelho não guarda nada (aba anônima,
 * bloqueado), `undefined` quando nunca começou.
 */
export function lerMarcaDosPassos(
  publico: string,
  perfil: string,
): MarcaDosPassos | null | undefined {
  const texto = ler(chaveDosPassos(publico, perfil))
  if (texto === undefined) return null
  return lerMarca(texto)
}

/**
 * Os primeiros passos e as dicas de UMA montagem (uma loja por montagem, como a da abertura). A
 * marca fica no aparelho, por público e perfil; o salvamento não muda.
 */
export function lojaDosPassos(loja: LojaDoJogo, plataforma: Plataforma): LojaDosPassos {
  let feita = lojas.get(loja)
  if (feita) return feita
  const chave = chaveDosPassos(plataforma.publico, plataforma.perfil.id)
  const chaveDicas = chaveDasDicas(plataforma.publico, plataforma.perfil.id)
  const marca = lerMarca(ler(chave) ?? null)
  feita = createStore<EstadoDosPassos>((set, get) => {
    const guardar = (
      situacao: MarcaDosPassos['situacao'],
      indice: number,
      extra?: { obraPendente?: boolean },
    ) => {
      const obraPendente = extra?.obraPendente ?? get().obraPendente
      gravar(chave, {
        situacao,
        passo: PASSOS[indice]?.id ?? 'oi',
        ...(obraPendente ? { obraPendente: true } : {}),
      } satisfies MarcaDosPassos)
    }
    const soltarAdiadas = () => {
      const { adiadas } = get()
      if (adiadas.length === 0) return
      set({ adiadas: [] })
      const ultima = adiadas.at(-1)
      if (ultima) loja.getState().dizer(ultima)
    }
    const terminar = () => {
      const { indice, soObra } = get()
      set({ situacao: 'feito', soObra: false, confirmandoPular: false, base: null })
      if (soObra) set({ obraPendente: false })
      guardar('feito', indice)
      if (loja.getState().painelAberto === PAINEL_DOS_PASSOS) loja.getState().abrirPainel(null)
      soltarAdiadas()
    }
    const ir = (indice: number, l: Leitura) => {
      const i = passoQueVale(indice, l)
      set({ indice: i, fase: comoComeca(i, l), desde: Date.now(), aberta: true, base: null })
      guardar('andando', i)
    }
    const avancar = (l: Leitura) => {
      const { indice, soObra } = get()
      if (indice >= PASSO_FINAL || (soObra && indice >= PASSO_DA_GELADEIRA)) return terminar()
      ir(indice + 1, l)
      // Saindo da obra retomada, depois da fala da geladeira não vem o fim de novo.
      if (soObra && get().indice > PASSO_DA_GELADEIRA) terminar()
    }
    return {
      // Pulado ou feito numa sessão de antes continua assim; parado no meio volta como parado e
      // o jogo continua sozinho (`deveComecarSozinho`).
      situacao: marca?.situacao === 'andando' ? 'parado' : (marca?.situacao ?? 'parado'),
      indice: marca ? Math.max(0, indiceDoPasso(marca.passo)) : 0,
      fase: 'fala',
      desde: 0,
      aberta: true,
      confirmandoPular: false,
      obra: null,
      obraPendente: marca?.obraPendente === true,
      soObra: false,
      base: null,
      adiadas: [],
      dicas: lerMarcaDasDicas(ler(chaveDicas) ?? null),
      fila: [],
      falaDaDica: 0,
      confirmandoDesligar: false,
      tela: { anel: null, dica: false, cartao: false },

      comecar(l, de) {
        set({ situacao: 'andando', confirmandoPular: false, soObra: false, obra: null })
        ir(de === 'recomecar' ? 0 : get().indice, l)
      },
      relogio(l, agora) {
        const s = get()
        if (s.situacao !== 'andando') return
        const voltar = voltarAoConstruir(s.indice, l)
        if (voltar !== s.indice) return ir(voltar, l)
        const passo = PASSOS[s.indice]
        if (!passo) return terminar()
        if (s.fase === 'isso') {
          if (agora - s.desde >= ISSO_MS) avancar(l)
          return
        }
        if (passo.pular?.(l)) return avancar(l)
        if (s.fase === 'lembrete') {
          if (agora - s.desde >= LEMBRETE_MS) avancar(l)
          return
        }
        if (!passo.escolha && cumpriu(s.indice, l))
          set({ fase: 'isso', desde: agora, aberta: true, confirmandoPular: false })
      },
      fechar(l) {
        const s = get()
        const passo = PASSOS[s.indice]
        if (!passo || s.situacao !== 'andando') return
        // Passo com tarefa: a fala recolhe e a tarefa fica no Agora até ser feita.
        if ((passo.feito || passo.escolha) && s.fase === 'fala') return set({ aberta: false })
        avancar(l)
      },
      reabrir() {
        set({ aberta: true })
      },
      perguntarPular(sim) {
        set({ confirmandoPular: sim })
      },
      pular() {
        const s = get()
        set({ situacao: 'pulado', confirmandoPular: false, base: null })
        guardar('pulado', s.indice)
        if (loja.getState().painelAberto === PAINEL_DOS_PASSOS) loja.getState().abrirPainel(null)
        soltarAdiadas()
      },
      escolherObra(obra, l) {
        set({ obra, ...(obra === 'depois' ? { obraPendente: true } : { obraPendente: false }) })
        avancar({ ...l, obra })
      },
      retomarObra(l) {
        set({
          situacao: 'andando',
          soObra: true,
          obra: 'agora',
          confirmandoPular: false,
        })
        ir(INICIO_DA_OBRA, { ...l, obra: 'agora' })
      },
      definirBase(base) {
        set({ base })
      },
      adiar(texto) {
        set({ adiadas: [...get().adiadas, texto] })
      },
      andando() {
        return get().situacao === 'andando'
      },

      pedirDica(id) {
        const s = get()
        if (
          !podeMostrar(
            id,
            s.dicas,
            s.fila.map((f) => f.id),
          )
        )
          return false
        set({ fila: [...s.fila, { id, rever: false }] })
        return true
      },
      reverDica(id) {
        const s = get()
        set({ fila: [{ id, rever: true }, ...s.fila.filter((f) => f.id !== id)], falaDaDica: 0 })
      },
      proximaFalaDaDica(total) {
        const s = get()
        const atual = s.fila[0]
        if (!atual) return
        if (s.falaDaDica + 1 < total) return set({ falaDaDica: s.falaDaDica + 1 })
        const vistas = s.dicas.vistas.includes(atual.id)
          ? s.dicas.vistas
          : [...s.dicas.vistas, atual.id]
        const dicas = { ...s.dicas, vistas }
        set({ fila: s.fila.slice(1), falaDaDica: 0, dicas, confirmandoDesligar: false })
        gravar(chaveDicas, dicas)
      },
      perguntarDesligar(sim) {
        set({ confirmandoDesligar: sim })
      },
      ligarDicas(ligadas) {
        const s = get()
        const dicas = { ...s.dicas, desligadas: !ligadas }
        set({
          dicas,
          confirmandoDesligar: false,
          ...(ligadas ? {} : { fila: s.fila.filter((f) => f.rever), falaDaDica: 0 }),
        })
        gravar(chaveDicas, dicas)
      },
      definirTela(tela) {
        const t = get().tela
        if (t.anel === tela.anel && t.dica === tela.dica && t.cartao === tela.cartao) return
        set({ tela })
      },
    }
  })
  lojas.set(loja, feita)
  return feita
}

export function usePassos<T>(loja: LojaDosPassos, ler: (s: EstadoDosPassos) => T): T {
  return useStore(loja, ler)
}

/**
 * Para onde o Zappy voa (e onde o facho acende) agora, escrito pela tela do tutorial e lido a cada
 * quadro pelo Zappy e pelo facho, fora do React. `circulo`: o anel de luz no chão do "andar".
 */
export interface GuiaDoZappy {
  alvo: { x: number; z: number } | null
  circulo: { x: number; z: number; raio: number } | null
}

const guias = new WeakMap<LojaDoJogo, GuiaDoZappy>()

export function guiaDoZappy(loja: LojaDoJogo): GuiaDoZappy {
  let g = guias.get(loja)
  if (!g) {
    g = { alvo: null, circulo: null }
    guias.set(loja, g)
  }
  return g
}

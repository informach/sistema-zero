import {
  GravarObraEstendidaSchema,
  type LeituraDaObraEstendida,
  LeituraDaObraEstendidaSchema,
  type ObraEstendida,
  ObraEstendidaSchema,
  obraEstendidaVazia,
  type Plataforma,
} from '@sistemazero/arquipelago-contracts'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import type { LojaDoJogo } from './loja'

/**
 * A obra estendida de UMA montagem (E04 e B14, 31/10/2026): o iglu, o andar de cima e o terreno
 * moldado, num documento do serviço à parte do salvamento (`GET` e `PUT /obra-estendida`, com
 * revisão própria). `mudar` vale na hora e grava depois de uma pausa; outro aparelho que gravou
 * antes ganha (a obra daqui é trocada pela de lá, com um recado). O que não chegou ao serviço fica
 * no aparelho, por público e perfil, e vai de novo no próximo `carregar` ou `mudar`. Suporte e
 * visita só leem.
 */
export interface EstadoDaObraEstendida {
  /** `null` antes da primeira gravação (e antes da leitura). */
  obra: ObraEstendida | null
  /** A revisão do serviço em que a obra daqui se baseia (0 = nunca gravada). */
  revisao: number
  /** `gravando`: há mudança daqui ainda não confirmada (esperando a pausa ou indo). */
  situacao: 'carregando' | 'pronta' | 'erro' | 'gravando'
  carregar(): Promise<void>
  /**
   * Muda a obra (a partir da vazia quando ainda não há). Não faz nada (devolve `false`) antes da
   * primeira leitura, no suporte, na visita, sem mudança ou com uma obra fora do contrato.
   */
  mudar(fn: (o: ObraEstendida) => ObraEstendida): boolean
  /** Grava já o que espera a pausa (ao sair da construção, por exemplo). */
  gravarAgora(): Promise<void>
}

export type LojaDaObraEstendida = StoreApi<EstadoDaObraEstendida>

/** A pausa entre a última mudança e a gravação. */
export const ESPERA_DA_OBRA_ESTENDIDA_MS = 800
const PRAZO_DA_GRAVACAO_MS = 20_000
export const AVISO_DA_OBRA_DE_OUTRO_APARELHO =
  'A obra mudou em outro aparelho. Ficou a versão mais nova.'

/** Onde fica a gravação que não chegou: `{revisaoBase, obra}`, por público e perfil. */
export const chaveDaObraEstendida = (publico: string, perfil: string) =>
  `arquipelago:obra-estendida:v1:${publico}:${perfil}`

export type GuardaDaObraEstendida = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const lojas = new WeakMap<LojaDoJogo, LojaDaObraEstendida>()

/** A loja da obra estendida desta montagem (uma por loja do jogo, criada na primeira vez). */
export function lojaDaObraEstendida(loja: LojaDoJogo, plataforma: Plataforma): LojaDaObraEstendida {
  const feita = lojas.get(loja)
  if (feita) return feita
  const nova = criarLojaDaObraEstendida(loja, plataforma)
  lojas.set(loja, nova)
  return nova
}

export function criarLojaDaObraEstendida(
  loja: LojaDoJogo,
  plataforma: Plataforma,
  opcoes: { guarda?: GuardaDaObraEstendida | null; esperaMs?: number } = {},
): LojaDaObraEstendida {
  const guarda =
    opcoes.guarda !== undefined
      ? opcoes.guarda
      : typeof localStorage !== 'undefined'
        ? localStorage
        : null
  const espera = opcoes.esperaMs ?? ESPERA_DA_OBRA_ESTENDIDA_MS
  const chave = chaveDaObraEstendida(plataforma.publico, plataforma.perfil.id)
  /** A revisão do serviço em que a obra daqui se baseia; `null` antes de saber. */
  let base: number | null = null
  /** A obra mudada aqui e ainda não confirmada. */
  let pendente: ObraEstendida | null = null
  let temporizador: ReturnType<typeof setTimeout> | null = null
  let envio: Promise<void> | null = null
  let leitura: Promise<void> | null = null
  const soLe = () =>
    loja.getState().acesso.somenteLeitura === true || loja.getState().visita !== null

  function lerPendente(): { revisaoBase: number; obra: ObraEstendida } | null {
    try {
      const bruto = guarda?.getItem(chave)
      const lido = bruto ? GravarObraEstendidaSchema.safeParse(JSON.parse(bruto)) : null
      return lido?.success ? lido.data : null
    } catch {
      return null
    }
  }
  function guardarPendente() {
    try {
      if (pendente && base !== null)
        guarda?.setItem(chave, JSON.stringify({ revisaoBase: base, obra: pendente }))
      else guarda?.removeItem(chave)
    } catch {
      // Sem armazenamento: o pendente vale só enquanto o jogo está aberto.
    }
  }
  function pararEspera() {
    if (temporizador) clearTimeout(temporizador)
    temporizador = null
  }

  return createStore<EstadoDaObraEstendida>((set, get) => {
    /** Fica a do serviço: a daqui (se havia) é descartada. */
    function adotar(l: LeituraDaObraEstendida) {
      pararEspera()
      base = l.revisao
      pendente = null
      guardarPendente()
      set({ obra: l.obra, revisao: l.revisao, situacao: 'pronta' })
    }

    function agendar() {
      pararEspera()
      temporizador = setTimeout(() => {
        temporizador = null
        // Com uma leitura no meio, ela manda o pendente no fim.
        if (!leitura) void enviar()
      }, espera)
    }

    function enviar(): Promise<void> {
      pararEspera()
      if (envio) return envio.then(() => (pendente ? enviar() : undefined))
      if (!pendente || base === null || soLe()) return Promise.resolve()
      const obra = pendente,
        revisaoBase = base
      set({ situacao: 'gravando' })
      const controle = new AbortController()
      const prazo = setTimeout(() => controle.abort(), PRAZO_DA_GRAVACAO_MS)
      envio = (async () => {
        try {
          const r = await plataforma.servico.buscar('/obra-estendida', {
            metodo: 'PUT',
            corpo: { revisaoBase, obra },
            sinal: controle.signal,
          })
          if (r.status === 200) {
            const l = LeituraDaObraEstendidaSchema.safeParse(r.corpo)
            if (!l.success) throw new Error('A obra estendida voltou fora do contrato.')
            base = l.data.revisao
            // Mudou de novo enquanto ia: o pendente segue, agora sobre a revisão nova.
            if (pendente === obra) pendente = null
            guardarPendente()
            set({ revisao: l.data.revisao, situacao: pendente ? 'gravando' : 'pronta' })
            return
          }
          if (r.status === 409) {
            const atual = LeituraDaObraEstendidaSchema.safeParse(
              (r.corpo as { atual?: unknown } | null)?.atual,
            )
            if (atual.success) {
              adotar(atual.data)
              loja.getState().dizer(AVISO_DA_OBRA_DE_OUTRO_APARELHO)
              return
            }
          }
          if (r.status === 400 || r.status === 413) {
            // O serviço nunca vai aceitar esta: desiste dela (a próxima leitura traz a guardada).
            if (pendente === obra) pendente = null
            guardarPendente()
          }
          throw new Error(`A obra estendida não foi gravada (${r.status}).`)
        } catch (erro) {
          set({ situacao: 'erro' })
          plataforma.relatarErro(erro, 'obra-estendida')
        } finally {
          clearTimeout(prazo)
          envio = null
        }
      })()
      return envio
    }

    async function ler() {
      pararEspera()
      if (envio) await envio
      set({ situacao: 'carregando' })
      const escreve = !soLe()
      // O que não chegou ao serviço, mesmo de uma abertura anterior.
      if (escreve && !pendente) {
        const guardado = lerPendente()
        if (guardado) {
          pendente = guardado.obra
          base = guardado.revisaoBase
        }
      }
      try {
        const r = await plataforma.servico.buscar('/obra-estendida')
        const l = r.status === 200 ? LeituraDaObraEstendidaSchema.safeParse(r.corpo) : null
        if (!l?.success) throw new Error(`A obra estendida não abriu (${r.status}).`)
        if (!escreve) {
          // Suporte e visita: só a leitura; um pendente daqui espera o fim da visita.
          if (pendente) set({ situacao: 'gravando' })
          else {
            base = l.data.revisao
            set({ obra: l.data.obra, revisao: l.data.revisao, situacao: 'pronta' })
          }
          return
        }
        if (!pendente) return adotar(l.data)
        if (l.data.revisao !== base) {
          // Outro aparelho gravou depois da base do pendente: fica a de lá.
          adotar(l.data)
          loja.getState().dizer(AVISO_DA_OBRA_DE_OUTRO_APARELHO)
          return
        }
        set({ obra: pendente, revisao: l.data.revisao, situacao: 'gravando' })
        await enviar()
      } catch (erro) {
        plataforma.relatarErro(erro, 'obra-estendida')
        // Sem o serviço, a obra pendente daqui continua valendo (dá para seguir construindo).
        set(
          escreve && pendente && base !== null
            ? { obra: pendente, revisao: base, situacao: 'erro' }
            : { situacao: 'erro' },
        )
      }
    }

    return {
      obra: null,
      revisao: 0,
      situacao: 'carregando',
      carregar() {
        if (!leitura) leitura = ler().finally(() => (leitura = null))
        return leitura
      },
      mudar(fn) {
        if (soLe() || base === null) return false
        const atual = get().obra ?? obraEstendidaVazia()
        const nova = fn(atual)
        if (nova === atual) return false
        if (!ObraEstendidaSchema.safeParse(nova).success) {
          plataforma.relatarErro(new Error('Obra estendida fora do contrato.'), 'obra-estendida')
          return false
        }
        pendente = nova
        guardarPendente()
        set({ obra: nova, situacao: 'gravando' })
        if (!leitura) agendar()
        return true
      },
      gravarAgora() {
        return leitura ?? enviar()
      },
    }
  })
}

export function useObraEstendida<T>(
  loja: LojaDaObraEstendida,
  seletor: (s: EstadoDaObraEstendida) => T,
): T {
  return useStore(loja, seletor)
}

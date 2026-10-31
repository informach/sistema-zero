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
import { mesmosDados } from '../sistemas/conciliar-salvamento'
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
  /**
   * A obra deste aparelho que perdeu para a de outro aparelho (conflito de verdade): fica guardada
   * para voltar a ela (`recuperar`), em vez de sumir.
   */
  recuperacao: ObraEstendida | null
  /** Volta à obra guardada deste aparelho (ela vira a mudança nova, gravada sobre a de lá). */
  recuperar(): boolean
  /** Esquece a obra guardada deste aparelho. */
  descartarRecuperacao(): void
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
  'A obra mudou em outro aparelho. Ficou a versão mais nova, e a deste aparelho ficou guardada no Construir.'

/**
 * Onde fica a gravação que não chegou: `{revisaoBase, obra, enviado?}`, por público e perfil. O
 * `enviado` é o que foi mandado ao serviço e ainda não teve resposta: se ela se perde depois de o
 * serviço gravar, a leitura seguinte reconhece a própria gravação e não a toma por outro aparelho.
 */
export const chaveDaObraEstendida = (publico: string, perfil: string) =>
  `arquipelago:obra-estendida:v1:${publico}:${perfil}`
/** A obra deste aparelho que perdeu um conflito de verdade (para voltar a ela). */
export const chaveDaRecuperacao = (publico: string, perfil: string) =>
  `${chaveDaObraEstendida(publico, perfil)}:recuperacao`

const GuardadoSchema = GravarObraEstendidaSchema.extend({
  enviado: GravarObraEstendidaSchema.optional(),
})

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
  /** O que foi mandado ao serviço e ainda não teve resposta (guardado antes do PUT). */
  let enviado: { revisaoBase: number; obra: ObraEstendida } | null = null
  const chaveDaCopia = chaveDaRecuperacao(plataforma.publico, plataforma.perfil.id)
  let temporizador: ReturnType<typeof setTimeout> | null = null
  let envio: Promise<void> | null = null
  let leitura: Promise<void> | null = null
  const soLe = () =>
    loja.getState().acesso.somenteLeitura === true || loja.getState().visita !== null

  function lerPendente(): {
    revisaoBase: number
    obra: ObraEstendida
    enviado?: { revisaoBase: number; obra: ObraEstendida }
  } | null {
    try {
      const bruto = guarda?.getItem(chave)
      const lido = bruto ? GuardadoSchema.safeParse(JSON.parse(bruto)) : null
      return lido?.success ? lido.data : null
    } catch {
      return null
    }
  }
  function guardarPendente() {
    try {
      if (pendente && base !== null)
        guarda?.setItem(
          chave,
          JSON.stringify({ revisaoBase: base, obra: pendente, ...(enviado ? { enviado } : {}) }),
        )
      else guarda?.removeItem(chave)
    } catch {
      // Sem armazenamento: o pendente vale só enquanto o jogo está aberto.
    }
  }
  function lerRecuperacao(): ObraEstendida | null {
    try {
      const bruto = guarda?.getItem(chaveDaCopia)
      const lido = bruto ? ObraEstendidaSchema.safeParse(JSON.parse(bruto)) : null
      return lido?.success ? lido.data : null
    } catch {
      return null
    }
  }
  function guardarRecuperacao(obra: ObraEstendida | null) {
    try {
      if (obra) guarda?.setItem(chaveDaCopia, JSON.stringify(obra))
      else guarda?.removeItem(chaveDaCopia)
    } catch {
      // Sem armazenamento: a cópia vale só enquanto o jogo está aberto.
    }
  }
  /** A leitura do serviço é a gravação que foi daqui (a resposta dela se perdeu)? */
  function eAMinha(l: LeituraDaObraEstendida): boolean {
    return (
      enviado !== null && l.revisao === enviado.revisaoBase + 1 && mesmosDados(l.obra, enviado.obra)
    )
  }
  function pararEspera() {
    if (temporizador) clearTimeout(temporizador)
    temporizador = null
  }

  return createStore<EstadoDaObraEstendida>((set, get) => {
    /** Fica a do serviço: a daqui (se havia) sai do caminho. */
    function adotar(l: LeituraDaObraEstendida) {
      pararEspera()
      base = l.revisao
      pendente = null
      enviado = null
      guardarPendente()
      set({ obra: l.obra, revisao: l.revisao, situacao: 'pronta' })
    }

    /**
     * Outro aparelho gravou depois da base daqui (conflito de verdade): fica a de lá, e a daqui
     * fica guardada para voltar a ela, sem sumir.
     */
    function perderParaOutroAparelho(l: LeituraDaObraEstendida) {
      if (pendente && !mesmosDados(pendente, l.obra)) {
        guardarRecuperacao(pendente)
        set({ recuperacao: pendente })
      }
      adotar(l)
      loja.getState().dizer(AVISO_DA_OBRA_DE_OUTRO_APARELHO)
    }

    /**
     * A gravação daqui chegou ao serviço, mas a resposta se perdeu: a base passa a ser ela, e o
     * que mudou depois continua pendente (vai de novo sobre a revisão nova).
     */
    function reconhecer(l: LeituraDaObraEstendida) {
      base = l.revisao
      enviado = null
      if (pendente && mesmosDados(pendente, l.obra)) pendente = null
      guardarPendente()
      set({
        obra: pendente ?? l.obra,
        revisao: l.revisao,
        situacao: pendente ? 'gravando' : 'pronta',
      })
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
      // Um envio anterior ficou sem resposta: primeiro a leitura reconhece se ele chegou (senão
      // este envio o trocaria e a gravação de lá viraria "outro aparelho").
      if (enviado && !leitura) return get().carregar()
      const obra = pendente,
        revisaoBase = base
      // Guardado antes do PUT: se a resposta se perder, a próxima leitura reconhece esta gravação.
      enviado = { revisaoBase, obra }
      guardarPendente()
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
            enviado = null
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
              if (eAMinha(atual.data)) {
                // Uma gravação daqui que chegou sem resposta: o que mudou depois vai de novo.
                reconhecer(atual.data)
                if (pendente) agendar()
                return
              }
              perderParaOutroAparelho(atual.data)
              return
            }
          }
          if (r.status === 400 || r.status === 413) {
            // O serviço nunca vai aceitar esta: desiste dela (a próxima leitura traz a guardada).
            enviado = null
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
          enviado = guardado.enviado ?? null
        }
      }
      if (escreve && !get().recuperacao) {
        const copia = lerRecuperacao()
        if (copia) set({ recuperacao: copia })
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
          if (eAMinha(l.data)) {
            // A gravação daqui chegou, só a resposta se perdeu: o resto vai sobre ela.
            reconhecer(l.data)
            if (pendente) await enviar()
            return
          }
          // Outro aparelho gravou depois da base do pendente: fica a de lá, a daqui guardada.
          perderParaOutroAparelho(l.data)
          return
        }
        // O serviço está na mesma base: o envio sem resposta não chegou a gravar.
        enviado = null
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
      recuperacao: null,
      recuperar() {
        const copia = get().recuperacao
        if (!copia || soLe() || base === null) return false
        pendente = copia
        guardarPendente()
        guardarRecuperacao(null)
        set({ obra: copia, recuperacao: null, situacao: 'gravando' })
        if (!leitura) agendar()
        return true
      },
      descartarRecuperacao() {
        guardarRecuperacao(null)
        set({ recuperacao: null })
      },
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

import {
  conferirPreparoDeExportacao,
  type PreparoDeExportacao,
} from '@sistemazero/molda-cenarios-core/compilar'
import type { ResultadoDaPublicacao } from '@sistemazero/molda-cenarios-core/publicacao'
import type { ProgressoDaCompilacao } from '@sistemazero/molda-cenarios-motor/compilar'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ArquivoDaExportacao, OpcoesDoArquivo } from '../exportar/preparar'
import type { ControladorDaOficina } from './controlador'
import { CenarioDesatualizado, type CenariosHost } from './portas'
import {
  type DestinoDaPublicacao,
  type ProgressoDaPublicacao,
  PublicacaoDesatualizada,
} from './publicacoes'

type Resultado = Omit<ArquivoDaExportacao, 'blob'> & { url: string; bytes: number }
export type EstadoDaExportacao =
  | { tipo: 'carregando' }
  | {
      tipo: 'erro'
      mensagem: string
      revisaoAtual?: number
      preparo?: PreparoDeExportacao
      destinoMudou?: boolean
    }
  | { tipo: 'pronto'; preparo: PreparoDeExportacao }
  | { tipo: 'gerando'; preparo: PreparoDeExportacao; progresso: ProgressoDaCompilacao }
  | { tipo: 'feito'; preparo: PreparoDeExportacao; arquivo: Resultado }
  | { tipo: 'publicando'; preparo: PreparoDeExportacao; progresso: ProgressoDaPublicacao }
  | { tipo: 'publicado'; preparo: PreparoDeExportacao; resultado: ResultadoDaPublicacao }

export function useExportacao(
  host: CenariosHost,
  id: string,
  revisao: number,
  controlador?: ControladorDaOficina,
) {
  const [estado, setEstado] = useState<EstadoDaExportacao>({ tipo: 'carregando' }),
    [pendente, setPendente] = useState(false),
    [volta, setVolta] = useState(0),
    executando = useRef(false),
    vivo = useRef(false),
    ativa = useRef<AbortController | null>(null),
    preparo = useRef<PreparoDeExportacao | null>(null),
    endereco = useRef<string | null>(null)
  const liberar = useCallback(() => {
    ativa.current?.abort()
    ativa.current = null
    if (endereco.current) URL.revokeObjectURL(endereco.current)
    endereco.current = null
  }, [])
  const conferirGuarda = useCallback(() => {
    const e = controlador?.getState()
    if (e && e.revisao !== revisao) throw new CenarioDesatualizado(e.revisao)
    if (e && (e.salvamento !== 'guardado' || e.ocupado || e.revisao !== revisao))
      throw Error('Guarde as mudanças e abra a exportação da revisão atual.')
  }, [controlador, revisao])
  const lerPreparo = useCallback(
    async (sinal: AbortSignal) => {
      conferirGuarda()
      const p = await conferirPreparoDeExportacao(
        await host.prepararExportacao(id, revisao, sinal),
        id,
        revisao,
      )
      sinal.throwIfAborted()
      conferirGuarda()
      return p
    },
    [host, id, revisao, conferirGuarda],
  )
  const falhar = useCallback((e: unknown) => {
    setEstado({
      tipo: 'erro',
      mensagem: e instanceof Error ? e.message : 'Não consegui preparar o arquivo. Tente de novo.',
      ...(preparo.current ? { preparo: preparo.current } : {}),
      ...(e instanceof CenarioDesatualizado ? { revisaoAtual: e.revisaoAtual } : {}),
      ...(e instanceof PublicacaoDesatualizada ? { destinoMudou: true } : {}),
    })
  }, [])
  // biome-ignore lint/correctness/useExhaustiveDependencies: volta repete uma leitura explicitamente solicitada
  useEffect(() => {
    vivo.current = true
    liberar()
    preparo.current = null
    setEstado({ tipo: 'carregando' })
    const c = new AbortController()
    ativa.current = c
    void lerPreparo(c.signal).then(
      (p) => {
        if (ativa.current !== c || c.signal.aborted) return
        preparo.current = p
        ativa.current = null
        setEstado({ tipo: 'pronto', preparo: p })
      },
      (e) => {
        if (ativa.current === c && !c.signal.aborted) {
          ativa.current = null
          falhar(e)
        }
      },
    )
    const unsubscribe = controlador?.subscribe(() => {
      try {
        conferirGuarda()
      } catch (e) {
        liberar()
        preparo.current = null
        falhar(e)
      }
    })
    return () => {
      vivo.current = false
      unsubscribe?.()
      liberar()
      preparo.current = null
    }
  }, [lerPreparo, liberar, falhar, conferirGuarda, controlador, volta])
  const cancelar = useCallback(() => {
    liberar()
    if (preparo.current) setEstado({ tipo: 'pronto', preparo: preparo.current })
  }, [liberar])
  const gerar = useCallback(
    async (opcoes: OpcoesDoArquivo) => {
      if (executando.current || ativa.current) return
      liberar()
      executando.current = true
      setPendente(true)
      const c = new AbortController()
      ativa.current = c
      try {
        conferirGuarda()
        if (!preparo.current) throw Error('Confira a revisão antes de gerar o arquivo.')
        setEstado({
          tipo: 'gerando',
          preparo: preparo.current,
          progresso: { etapa: 'modelos', feitos: 0, total: 1, nome: 'Conferindo a revisão' },
        })
        // Revalidar a autorização a cada execução, inclusive depois de esperar no diálogo.
        const p = await lerPreparo(c.signal)
        if (ativa.current !== c) return
        preparo.current = p
        const { prepararArquivoDaExportacao } = await import('../exportar/preparar'),
          arquivo = await prepararArquivoDaExportacao(host, p, opcoes, c.signal, (progresso) => {
            if (ativa.current === c && !c.signal.aborted)
              setEstado({ tipo: 'gerando', preparo: p, progresso })
          })
        c.signal.throwIfAborted()
        conferirGuarda()
        if (ativa.current !== c) return
        const url = URL.createObjectURL(arquivo.blob)
        endereco.current = url
        ativa.current = null
        setEstado({
          tipo: 'feito',
          preparo: p,
          arquivo: {
            url,
            bytes: arquivo.blob.size,
            nome: arquivo.nome,
            medidas: arquivo.medidas,
            avisos: arquivo.avisos,
          },
        })
      } catch (e) {
        if (ativa.current === c && !c.signal.aborted) {
          ativa.current = null
          falhar(e)
        }
      } finally {
        executando.current = false
        if (vivo.current) setPendente(false)
      }
    },
    [host, liberar, conferirGuarda, lerPreparo, falhar],
  )
  const publicar = useCallback(
    async (destino: DestinoDaPublicacao) => {
      if (executando.current || ativa.current) return
      const alvo = structuredClone(destino)
      liberar()
      executando.current = true
      setPendente(true)
      const c = new AbortController()
      ativa.current = c
      try {
        conferirGuarda()
        if (!preparo.current) throw Error('Confira a revisão antes de publicar.')
        setEstado({
          tipo: 'gerando',
          preparo: preparo.current,
          progresso: {
            etapa: 'modelos',
            feitos: 0,
            total: 1,
            nome: 'Conferindo a revisão',
          },
        })
        const p = await lerPreparo(c.signal)
        if (ativa.current !== c) return
        preparo.current = p
        const { publicarRevisaoDaOficina } = await import('../exportar/publicar')
        const resultado = await publicarRevisaoDaOficina(
          host,
          p,
          alvo,
          c.signal,
          (progresso) => {
            if (ativa.current === c && !c.signal.aborted)
              setEstado({ tipo: 'gerando', preparo: p, progresso })
          },
          (progresso) => {
            if (ativa.current === c && !c.signal.aborted)
              setEstado({ tipo: 'publicando', preparo: p, progresso })
          },
        )
        c.signal.throwIfAborted()
        conferirGuarda()
        if (ativa.current !== c) return
        ativa.current = null
        setEstado({ tipo: 'publicado', preparo: p, resultado })
      } catch (erro) {
        if (ativa.current === c && !c.signal.aborted) {
          ativa.current = null
          falhar(erro)
        }
      } finally {
        executando.current = false
        if (vivo.current) setPendente(false)
      }
    },
    [host, liberar, conferirGuarda, lerPreparo, falhar],
  )
  return { estado, pendente, gerar, publicar, cancelar, repetir: () => setVolta((n) => n + 1) }
}

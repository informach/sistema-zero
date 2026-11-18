import {
  type BaseDeTerreno,
  type CamadaDeSolo,
  type ComandoDeCenario,
  type DocumentoDeCenario,
  type ParametrosDeTerreno,
  ParametrosDeTerrenoSchema,
  type ReceitaDeTerreno,
  type RegraDeChao,
} from '@sistemazero/molda-cenarios-core/v2'
import type { EstadoDaEscultura, GestoDeTerreno, Palco } from '@sistemazero/molda-cenarios-motor'
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import type { ControladorDaOficina } from './controlador'
import { baseInicialDeTerreno, type EdicaoPreparada } from './operacoes-de-terreno'
import { processarTerrenoNoWorker } from './processar-terreno-no-worker'
import { gravarEstadoDoTerreno, guardarGestoDeTerreno } from './terreno-autoria'
import type { OperacaoDeTerreno } from './terreno-processamento'

export function useTerreno({
  controlador,
  palco,
}: {
  controlador: ControladorDaOficina
  palco: RefObject<Palco | null>
}) {
  const [parametros, setParametros] = useState<ParametrosDeTerreno>(() =>
      ParametrosDeTerrenoSchema.parse({ ferramenta: 'elevar' }),
    ),
    [previa, aoPrever] = useState<EstadoDaEscultura>({
      ativo: false,
      aguardando: false,
      erro: null,
    }),
    [preparando, setPreparando] = useState(false),
    [erro, setErro] = useState<string | null>(null),
    [mensagem, setMensagem] = useState<string | null>(null),
    abortador = useRef<AbortController | null>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: uma nova conexão invalida a preparação da cabeça anterior
  useEffect(() => {
    setPreparando(false)
    aoPrever({ ativo: false, aguardando: false, erro: null })
    setErro(null)
    setMensagem(null)
    return () => {
      abortador.current?.abort()
      abortador.current = null
    }
  }, [controlador])
  const rodar = useCallback(
    async (acao: (sinal: AbortSignal, doc: DocumentoDeCenario, p: Palco) => Promise<void>) => {
      if (abortador.current) return
      const p = palco.current
      if (!p) return
      const c = new AbortController()
      abortador.current = c
      setPreparando(true)
      setErro(null)
      setMensagem(null)
      try {
        const atual = controlador.getState()
        if (atual.ocupado || atual.salvamento !== 'guardado')
          throw Error('Guarde as mudanças antes de editar o terreno.')
        await acao(c.signal, atual.documento, p)
      } catch (e) {
        p.finalizarEscultura(true)
        if (!c.signal.aborted)
          setErro(e instanceof Error ? e.message : 'Não consegui preparar o terreno.')
      } finally {
        if (abortador.current === c) {
          abortador.current = null
          setPreparando(false)
        }
      }
    },
    [controlador, palco],
  )
  const salvar = useCallback(
    async (
      sinal: AbortSignal,
      doc: DocumentoDeCenario,
      p: Palco,
      edicao: EdicaoPreparada,
      antes: readonly ComandoDeCenario[] = [],
    ) => {
      const r = await gravarEstadoDoTerreno({
        controlador,
        palco: p,
        documentoDeOrigem: doc,
        ...edicao,
        antes,
        sinal,
      })
      sinal.throwIfAborted()
      setMensagem(
        r.guardado
          ? r.alterado
            ? 'Terreno guardado. Você pode desfazer esta mudança.'
            : 'O terreno já estava assim.'
          : 'Mudança mantida na oficina. Tente guardar novamente no topo.',
      )
    },
    [controlador],
  )
  const aoEsculpir = useCallback(
    (gesto: GestoDeTerreno) => {
      const p = palco.current
      if (!p) return
      if (abortador.current) {
        p.finalizarEscultura(true)
        return
      }
      void rodar(async (sinal) => {
        const r = await guardarGestoDeTerreno(controlador, p, gesto, sinal)
        if (!r.guardado)
          setErro('O terreno está na oficina, mas o envio falhou. Tente guardar novamente no topo.')
      })
    },
    [controlador, palco, rodar],
  )
  const mudar = <K extends keyof ParametrosDeTerreno>(campo: K, valor: ParametrosDeTerreno[K]) => {
    setParametros((p) => ParametrosDeTerrenoSchema.parse({ ...p, [campo]: valor }))
    setErro(null)
  }
  const lerEstado = (doc: DocumentoDeCenario, p: Palco) => {
    const estado = p.estadoDoTerreno()
    if (!estado && doc.base.tipo === 'terreno') throw Error('Aguarde o carregamento do relevo.')
    return estado
  }
  const processar = async (
    s: AbortSignal,
    d: DocumentoDeCenario,
    p: Palco,
    operacao: OperacaoDeTerreno,
  ) => {
    const r = await processarTerrenoNoWorker(
      { base: baseInicialDeTerreno(d.base), estado: lerEstado(d, p), operacao },
      s,
    )
    if (r.tipo !== 'edicao') throw Error('A operação não gerou terreno.')
    return r.edicao
  }
  const receita = (r: ReceitaDeTerreno) =>
    rodar(async (s, d, p) => {
      await salvar(s, d, p, await processar(s, d, p, { tipo: 'receita', receita: r }))
    })
  const dimensoes = (forma: BaseDeTerreno) =>
    rodar(async (s, d, p) => {
      if (d.base.tipo !== 'terreno') throw Error('Crie o terreno antes de mudar suas medidas.')
      await salvar(s, d, p, await processar(s, d, p, { tipo: 'dimensoes', forma }))
    })
  const camadas = (novas: CamadaDeSolo[], antes: readonly ComandoDeCenario[] = []) =>
    rodar(async (s, d, p) => {
      if (d.base.tipo !== 'terreno') throw Error('Crie o terreno antes de pintar o chão.')
      await salvar(s, d, p, await processar(s, d, p, { tipo: 'camadas', camadas: novas }), antes)
      setParametros((atual) => ({ ...atual, camada: Math.min(atual.camada, novas.length - 1) }))
    })
  const automatizar = (regras: readonly RegraDeChao[]) =>
    rodar(async (s, d, p) => {
      if (d.base.tipo !== 'terreno') throw Error('Crie o terreno antes de pintar o chão.')
      await salvar(s, d, p, await processar(s, d, p, { tipo: 'regras', regras }))
    })
  const importar = (file: File, preto: number, branco: number) =>
    rodar(async (s, d, p) => {
      if (!file.size || file.size > 48 * 1024 * 1024)
        throw Error('Escolha um PNG de alturas de até 48 MB.')
      const bytes = new Uint8Array(await file.arrayBuffer())
      s.throwIfAborted()
      await salvar(s, d, p, await processar(s, d, p, { tipo: 'importar', bytes, preto, branco }))
    })
  const exportar = () =>
    rodar(async (s, d, p) => {
      const estado = lerEstado(d, p)
      if (!estado) throw Error('Crie o terreno antes de exportar alturas.')
      const r = await processarTerrenoNoWorker(
        { base: baseInicialDeTerreno(d.base), estado, operacao: { tipo: 'exportar' } },
        s,
      )
      if (r.tipo !== 'png') throw Error('Não consegui exportar o PNG.')
      const bytes = r.bytes
      s.throwIfAborted()
      const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }))
      try {
        const a = document.createElement('a')
        a.href = url
        a.download = `${d.nome.replace(/[^\p{L}\p{N}-]/gu, '-')}-alturas-16bit.png`
        a.click()
        setMensagem('PNG de 16 bits exportado. O cenário permanece igual.')
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    })
  const retirarRecortes = () =>
    rodar(async (s, d, p) => {
      if (d.base.tipo !== 'terreno') return
      const { recortes: _, ...base } = d.base
      const estado = lerEstado(d, p)
      if (estado) await salvar(s, d, p, { base, estado, regioes: {} })
    })
  return {
    parametros,
    mudar,
    previa,
    aoPrever,
    aoEsculpir,
    preparando,
    ocupado: preparando || previa.ativo || previa.aguardando,
    erro: erro ?? previa.erro,
    mensagem,
    receita,
    dimensoes,
    camadas,
    automatizar,
    importar,
    exportar,
    retirarRecortes,
    cancelar: () => abortador.current?.abort(),
  }
}

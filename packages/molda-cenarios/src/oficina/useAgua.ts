import {
  type DocumentoDeCenario,
  type IntencaoDeAgua,
  indiceDaOrganizacao,
  type OperacaoDeAguaPreparada,
} from '@sistemazero/molda-cenarios-core/v2'
import type { Palco, Ponto3 } from '@sistemazero/molda-cenarios-motor'
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { novoIdAleatorio } from './acoes'
import { guardarAgua } from './agua-autoria'
import {
  editarAguaSemRecalcular,
  type FormularioDeAgua,
  formularioDaAguaExistente,
  formularioDeAgua,
  intencaoDoFormulario,
} from './agua-formulario'
import type { ControladorDaOficina } from './controlador'
import { processarAguaNoWorker } from './processar-agua-no-worker'

export function useAgua({
  controlador,
  palco,
  documento,
  ativo,
}: {
  controlador: ControladorDaOficina
  palco: RefObject<Palco | null>
  documento: DocumentoDeCenario
  ativo: boolean
}) {
  const [formulario, setFormulario] = useState(() => formularioDeAgua('mar')),
    [aberto, setAberto] = useState(false),
    [capturando, setCapturando] = useState(false),
    [id, setId] = useState<string | null>(null),
    [recalcular, setRecalcular] = useState(false),
    [preparando, setPreparando] = useState(false),
    [aplicando, setAplicando] = useState(false),
    [erro, setErro] = useState<string | null>(null),
    [mensagem, setMensagem] = useState<string | null>(null),
    [previa, setPrevia] = useState<{
      origem: DocumentoDeCenario
      operacao: OperacaoDeAguaPreparada
    } | null>(null),
    [confirmouVazamento, setConfirmouVazamento] = useState(false),
    abortador = useRef<AbortController | null>(null),
    idNovo = useRef(''),
    atual = useRef({ formulario, capturando, aberto, aplicando }),
    montado = useRef(true)
  atual.current = { formulario, capturando, aberto, aplicando }
  const invalidar = useCallback(() => {
    abortador.current?.abort()
    abortador.current = null
    palco.current?.finalizarPreviaDeAgua(true)
    setPrevia(null)
    setPreparando(false)
    setConfirmouVazamento(false)
    setErro(null)
    setMensagem(null)
  }, [palco])
  const cancelar = useCallback(() => {
    if (atual.current.aplicando) return
    invalidar()
    setAberto(false)
    setCapturando(false)
    palco.current?.definirCapturaDeAgua(null)
  }, [invalidar, palco])
  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
      abortador.current?.abort()
      abortador.current = null
      palco.current?.finalizarPreviaDeAgua(true)
      palco.current?.definirCapturaDeAgua(null)
    }
  }, [palco])
  // Uma cabeça nova invalida pontos e resultados, inclusive undo, reabertura e edição externa.
  // biome-ignore lint/correctness/useExhaustiveDependencies: identidade da cabeça é parte do contrato da prévia
  useEffect(() => {
    invalidar()
    setAberto(false)
    setCapturando(false)
    setId(null)
  }, [documento, controlador, invalidar])
  useEffect(() => {
    if (!ativo) cancelar()
  }, [ativo, cancelar])
  useEffect(() => {
    if (!ativo || !aberto || aplicando) {
      palco.current?.definirCapturaDeAgua(null)
      return
    }
    // Mesmo ao editar somente material, impede Testar/retratos e gestos concorrentes.
    palco.current?.definirCapturaDeAgua(formulario.pontos)
  }, [ativo, aberto, aplicando, formulario.pontos, palco])
  const editar = useCallback(
    (aguaId: string) => {
      if (atual.current.aplicando) return
      const agua = controlador.getState().documento.aguas.find((a) => a.id === aguaId)
      if (!agua) return
      if (indiceDaOrganizacao(controlador.getState().documento).flags.get(aguaId)?.bloqueado) {
        setErro('Destranque a água, sua pasta ou camada antes de editar.')
        return
      }
      invalidar()
      setId(agua.id)
      setFormulario(formularioDaAguaExistente(agua))
      setRecalcular(false)
      setAberto(true)
      setCapturando(false)
      controlador.selecionar([], agua.id)
    },
    [controlador, invalidar],
  )
  const iniciar = (tipo: IntencaoDeAgua['tipo']) => {
    if (aplicando) return
    const mar = tipo === 'mar' ? documento.aguas.find((a) => a.tipo === 'mar') : undefined
    if (mar) {
      editar(mar.id)
      return
    }
    invalidar()
    setId(null)
    idNovo.current = novoIdAleatorio()
    setFormulario(formularioDeAgua(tipo))
    setRecalcular(true)
    setAberto(true)
    setCapturando(tipo !== 'mar')
    controlador.selecionar([])
  }
  const mudar = <K extends keyof FormularioDeAgua>(campo: K, valor: FormularioDeAgua[K]) => {
    if (aplicando) return
    invalidar()
    setFormulario((f) => ({ ...f, [campo]: valor }))
  }
  const aoCapturarPonto = useCallback(
    (ponto: Ponto3) => {
      const s = atual.current
      if (!s.aberto || !s.capturando || s.aplicando) return
      const maximo =
        s.formulario.tipo === 'rio'
          ? 128
          : s.formulario.tipo === 'lago'
            ? 1
            : s.formulario.tipo === 'represa'
              ? 3
              : 2
      if (s.formulario.pontos.length >= maximo) return
      invalidar()
      const p = { x: ponto.x, y: ponto.y, z: ponto.z }
      setFormulario((f) => ({ ...f, pontos: [...f.pontos, p] }))
      if (s.formulario.pontos.length + 1 >= maximo) setCapturando(false)
    },
    [invalidar],
  )
  const preparar = async () => {
    if (aplicando) return
    const p = palco.current
    if (!p) return
    invalidar()
    const controle = new AbortController()
    abortador.current = controle
    setPreparando(true)
    setCapturando(false)
    try {
      const s = controlador.getState(),
        origem = s.documento
      if (s.ocupado || s.salvamento !== 'guardado')
        throw Error('Guarde as mudanças antes de preparar a água.')
      if (!formulario.nome.trim()) throw Error('Dê um nome a esta água.')
      const existente = origem.aguas.find((a) => a.id === id)
      let operacao: OperacaoDeAguaPreparada
      if (existente && !recalcular) operacao = editarAguaSemRecalcular(existente, formulario)
      else {
        const identidade = existente
          ? {
              id: existente.id,
              nome: formulario.nome.trim(),
              grupo: existente.grupo,
              ...(existente.camada !== undefined ? { camada: existente.camada } : {}),
              bloqueado: existente.bloqueado,
              oculto: existente.oculto,
              ...(existente.propriedades ? { propriedades: existente.propriedades } : {}),
            }
          : { id: idNovo.current, nome: formulario.nome.trim() }
        operacao = await processarAguaNoWorker(
          {
            identidade,
            intencao: intencaoDoFormulario(formulario),
            estado:
              formulario.tipo === 'mar' || formulario.tipo === 'cachoeira'
                ? null
                : p.estadoDoTerreno(),
          },
          controle.signal,
        )
      }
      controle.signal.throwIfAborted()
      if (controlador.getState().documento !== origem)
        throw new DOMException('O cenário mudou. Prepare a água novamente.', 'AbortError')
      p.preverAgua(origem, operacao)
      setCapturando(false)
      setPrevia({ origem, operacao })
    } catch (e) {
      if (!controle.signal.aborted && montado.current)
        setErro(e instanceof Error ? e.message : 'Não consegui preparar esta água.')
    } finally {
      if (abortador.current === controle) {
        abortador.current = null
        if (montado.current) setPreparando(false)
      }
    }
  }
  const aplicar = async () => {
    const p = palco.current
    if (!p || !previa || aplicando) return
    if (previa.operacao.resumo?.vaza && !confirmouVazamento) {
      setErro('Confira o aviso de água na borda antes de guardar.')
      return
    }
    const controle = new AbortController()
    abortador.current = controle
    setAplicando(true)
    setErro(null)
    try {
      const r = await guardarAgua({
        controlador,
        palco: p,
        documentoDeOrigem: previa.origem,
        operacao: previa.operacao,
        sinal: controle.signal,
      })
      if (montado.current) {
        setPrevia(null)
        setAberto(false)
        setCapturando(false)
        setMensagem(
          r.guardado
            ? r.alterado
              ? 'Água guardada. Você pode desfazer esta mudança.'
              : 'A água já estava assim.'
            : 'Mudança mantida na oficina. Tente guardar novamente no topo.',
        )
      }
    } catch (e) {
      if (montado.current && !controle.signal.aborted)
        setErro(e instanceof Error ? e.message : 'Não consegui guardar esta água.')
    } finally {
      if (abortador.current === controle) abortador.current = null
      if (montado.current) setAplicando(false)
    }
  }
  const agua = documento.aguas.find((a) => a.id === id) ?? null
  return {
    formulario,
    aberto,
    capturando,
    id,
    agua,
    recalcular,
    preparando,
    aplicando,
    previa,
    ocupado: aberto || preparando || aplicando,
    erro,
    mensagem,
    confirmouVazamento,
    setConfirmouVazamento,
    iniciar,
    editar,
    mudar,
    cancelar,
    preparar,
    aplicar,
    aoCapturarPonto,
    capturar: () => {
      invalidar()
      setCapturando(true)
    },
    pararCaptura: () => setCapturando(false),
    recalcularForma: () => {
      invalidar()
      setRecalcular(true)
      setCapturando(false)
    },
  }
}

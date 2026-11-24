import {
  type CaminhoDeCenario,
  type DocumentoDeCenario,
  igual,
  indiceDaOrganizacao,
  type ModeloDoCenario,
  type OperacaoDeCaminhoPreparada,
  referenciarModelo,
  referenciarTextura,
  type TexturaDoCenario,
} from '@sistemazero/molda-cenarios-core/v2'
import type {
  CapturaDeCaminho,
  GestoDePontosDeCaminho,
  Palco,
} from '@sistemazero/molda-cenarios-motor'
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { novoIdAleatorio, referenciaDeBiblioteca } from './acoes'
import { guardarCaminho } from './caminho-autoria'
import { caminhoComPeca, rascunhoDeCaminho } from './caminho-formulario'
import type { ControladorDaOficina } from './controlador'
import type { ModeloDeBiblioteca, TexturaDeBiblioteca } from './portas'
import { processarCaminhoNoWorker } from './processar-caminho-no-worker'

export function useCaminhos({
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
  const [rascunho, setRascunho] = useState<CaminhoDeCenario | null>(null),
    [modelos, setModelos] = useState<ModeloDoCenario[]>([]),
    [texturas, setTexturas] = useState<TexturaDoCenario[]>([]),
    [modo, setModo] = useState<CapturaDeCaminho['modo']>('adicionar'),
    [capturando, setCapturando] = useState(false),
    [selecionado, setSelecionado] = useState<number | null>(null),
    [recalcular, setRecalcular] = useState(false),
    [preparando, setPreparando] = useState(false),
    [aplicando, setAplicando] = useState(false),
    [erro, setErro] = useState<string | null>(null),
    [mensagem, setMensagem] = useState<string | null>(null),
    [previa, setPrevia] = useState<{
      origem: DocumentoDeCenario
      operacao: OperacaoDeCaminhoPreparada
    } | null>(null),
    abortador = useRef<AbortController | null>(null),
    montado = useRef(true),
    atual = useRef({ rascunho, aplicando, ativo })
  atual.current = { rascunho, aplicando, ativo }
  const invalidar = useCallback(() => {
    abortador.current?.abort()
    abortador.current = null
    palco.current?.finalizarPreviaDeCaminho(true)
    setPrevia(null)
    setPreparando(false)
    setErro(null)
    setMensagem(null)
  }, [palco])
  const cancelar = useCallback(() => {
    if (atual.current.aplicando) return
    invalidar()
    setRascunho(null)
    setCapturando(false)
    setModelos([])
    setTexturas([])
    setSelecionado(null)
    palco.current?.definirCapturaDeCaminho(null)
  }, [invalidar, palco])
  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
      abortador.current?.abort()
      abortador.current = null
      palco.current?.finalizarPreviaDeCaminho(true)
      palco.current?.definirCapturaDeCaminho(null)
    }
  }, [palco])
  // biome-ignore lint/correctness/useExhaustiveDependencies: identidade da cabeça invalida respostas e rascunhos locais
  useEffect(() => {
    invalidar()
    setRascunho(null)
    setCapturando(false)
    setModelos([])
    setTexturas([])
    setSelecionado(null)
  }, [documento, controlador, invalidar])
  useEffect(() => {
    if (!ativo) cancelar()
  }, [ativo, cancelar])
  useEffect(() => {
    const p = palco.current,
      fonte = p?.fonteDeAlturas()
    if (!p) return
    if (!ativo || !rascunho || !fonte) {
      p.definirCapturaDeCaminho(null)
      return
    }
    const c = rascunho,
      fechada = c.tipo === 'praca' || c.fechada === true
    p.definirCapturaDeCaminho({
      pontos: c.pontos.map((q, i) => ({
        ...q,
        y: c.tipo === 'ponte' && c.cotas ? (i === 0 ? c.cotas.de : c.cotas.ate) : fonte(q.x, q.z),
      })),
      modo,
      fechada,
      minimo: fechada ? 3 : 2,
      maximo: c.tipo === 'ponte' ? 2 : Math.max(128, c.pontos.length),
      selecionado,
      conservarAltura: c.tipo === 'ponte' && Boolean(c.cotas),
      interativa: capturando && !preparando && !aplicando,
    })
  }, [ativo, rascunho, palco, modo, selecionado, capturando, preparando, aplicando])
  const mudar = (c: CaminhoDeCenario) => {
    if (aplicando || igual(c, rascunho)) return
    invalidar()
    setRascunho(c)
    if (selecionado !== null && selecionado >= c.pontos.length) setSelecionado(null)
  }
  const editar = useCallback(
    (id: string) => {
      if (atual.current.aplicando) return
      const doc = controlador.getState().documento,
        c = doc.caminhos.find((c) => c.id === id)
      if (!c) return
      if (indiceDaOrganizacao(doc).flags.get(id)?.bloqueado) {
        setErro('Destranque o caminho, sua pasta ou camada antes de editar.')
        return
      }
      invalidar()
      setRascunho(structuredClone(c))
      setCapturando(false)
      setModo('mover')
      setSelecionado(null)
      setRecalcular(false)
      setModelos([])
      setTexturas([])
      controlador.selecionar([], id)
    },
    [controlador, invalidar],
  )
  const iniciar = (tipo: CaminhoDeCenario['tipo']) => {
    if (aplicando) return
    invalidar()
    setRascunho(rascunhoDeCaminho(tipo, novoIdAleatorio()))
    setModelos([])
    setTexturas([])
    setRecalcular(true)
    setCapturando(true)
    setSelecionado(null)
    setModo('adicionar')
    controlador.selecionar([])
  }
  const aoEditarPontos = useCallback(
    (g: GestoDePontosDeCaminho) => {
      const s = atual.current
      if (
        !s.ativo ||
        !s.rascunho ||
        s.aplicando ||
        g.documentoDeOrigem !== controlador.getState().documento
      )
        return
      setSelecionado(g.selecionado)
      const pontos = g.pontos.map(({ x, z }) => ({ x, z }))
      if (igual(pontos, s.rascunho.pontos)) return
      invalidar()
      setRascunho({ ...s.rascunho, pontos })
    },
    [controlador, invalidar],
  )
  const usarModelo = (modelo: ModeloDeBiblioteca) => {
    const s = atual.current,
      c = s.rascunho
    if (!s.ativo || !c || s.aplicando) {
      setErro('Escolha o tipo de caminho antes de escolher a peça.')
      return
    }
    const ref = referenciaDeBiblioteca(modelo),
      r = referenciarModelo(controlador.getState().documento, ref)
    invalidar()
    setModelos(r.comandos.flatMap((c) => (c.tipo === 'modelo.definir' ? [c.modelo] : [])))
    setRascunho(caminhoComPeca(c, { ...ref, id: r.id }))
  }
  const usarTextura = (t: TexturaDeBiblioteca) => {
    const s = atual.current,
      c = s.rascunho
    if (!s.ativo || !c || s.aplicando) return
    const r = referenciarTextura(controlador.getState().documento, {
      id: t.id,
      textura: t.id,
      biblioteca: t.bibliotecaId,
      digest: t.digest,
      nome: t.nome.slice(0, 120),
    })
    invalidar()
    setTexturas(r.comandos.flatMap((c) => (c.tipo === 'textura.definir' ? [c.textura] : [])))
    setRascunho({
      ...c,
      aparencia: {
        ...c.aparencia,
        textura: { id: r.id, repeticaoMetros: c.aparencia?.textura?.repeticaoMetros ?? 2 },
      },
    })
  }
  const preparar = async () => {
    const p = palco.current
    if (!p || !rascunho || aplicando) return
    invalidar()
    const controle = new AbortController()
    abortador.current = controle
    setPreparando(true)
    setCapturando(false)
    try {
      const s = controlador.getState(),
        origem = s.documento
      if (s.ocupado || s.salvamento !== 'guardado')
        throw Error('Guarde as mudanças antes de preparar o caminho.')
      if (!rascunho.nome.trim()) throw Error('Dê um nome ao caminho.')
      const op = await processarCaminhoNoWorker(
        {
          intencao: { ...rascunho, nome: rascunho.nome.trim() },
          estado:
            rascunho.tipo === 'estrada' || rascunho.tipo === 'ponte' ? p.estadoDoTerreno() : null,
          moldarTerreno: recalcular,
        },
        controle.signal,
      )
      controle.signal.throwIfAborted()
      if (controlador.getState().documento !== origem)
        throw new DOMException('O cenário mudou. Prepare novamente.', 'AbortError')
      op.modelos = modelos.filter((m) => m.id === op.caminho.acabamento)
      op.texturas = texturas.filter((t) => t.id === op.caminho.aparencia?.textura?.id)
      p.preverCaminho(origem, op)
      await p.aguardarRecursos(controle.signal)
      controle.signal.throwIfAborted()
      if (controlador.getState().documento !== origem)
        throw new DOMException('O cenário mudou. Prepare novamente.', 'AbortError')
      setPrevia({ origem, operacao: op })
    } catch (e) {
      if (abortador.current === controle) p.finalizarPreviaDeCaminho(true)
      if (!controle.signal.aborted && montado.current)
        setErro(e instanceof Error ? e.message : 'Não consegui preparar o caminho.')
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
    const controle = new AbortController()
    abortador.current = controle
    setAplicando(true)
    setErro(null)
    try {
      const r = await guardarCaminho({
        controlador,
        palco: p,
        documentoDeOrigem: previa.origem,
        operacao: previa.operacao,
        sinal: controle.signal,
      })
      if (montado.current) {
        setPrevia(null)
        setRascunho(null)
        setCapturando(false)
        setModelos([])
        setTexturas([])
        setMensagem(
          r.guardado
            ? r.alterado
              ? 'Caminho guardado. Você pode desfazer esta mudança.'
              : 'O caminho já estava assim.'
            : 'Mudança mantida na oficina. Tente guardar novamente no topo.',
        )
      }
    } catch (e) {
      if (montado.current && !controle.signal.aborted)
        setErro(e instanceof Error ? e.message : 'Não consegui guardar o caminho.')
    } finally {
      if (abortador.current === controle) abortador.current = null
      if (montado.current) setAplicando(false)
    }
  }
  return {
    definicoes: {
      // A confirmação pode chegar antes do efeito que limpa o rascunho. A tabela
      // publicada assume o mesmo ID sem duplicá-lo nem ser sobrescrita pela prévia.
      modelos: [
        ...documento.modelos,
        ...modelos.filter((m) => !documento.modelos.some((p) => p.id === m.id)),
      ],
      texturas: [
        ...(documento.texturas ?? []),
        ...texturas.filter((t) => !documento.texturas?.some((p) => p.id === t.id)),
      ],
    },
    rascunho,
    modelos,
    texturas,
    selecionado,
    setSelecionado,
    modo,
    setModo,
    capturando,
    setCapturando,
    recalcular,
    setRecalcular: (v: boolean) => {
      invalidar()
      setRecalcular(v)
    },
    preparando,
    aplicando,
    previa,
    erro,
    mensagem,
    informarErro: setErro,
    ocupado: Boolean(rascunho) || preparando || aplicando,
    iniciar,
    editar,
    mudar,
    cancelar,
    preparar,
    aplicar,
    aoEditarPontos,
    usarModelo,
    usarTextura,
    capturar: (modoNovo?: CapturaDeCaminho['modo']) => {
      if (aplicando) return
      invalidar()
      if (modoNovo) setModo(modoNovo)
      setCapturando(true)
    },
  }
}

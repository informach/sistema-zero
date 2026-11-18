import { type DocumentoDeCenario, igual } from '@sistemazero/molda-cenarios-core/v2'
import type {
  ComandoDePreviaDoAmbiente,
  DonoDaPreviaDoAmbiente,
  Palco,
} from '@sistemazero/molda-cenarios-motor'
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import type { ControladorDaOficina } from './controlador'
import { guardarOperacaoComTerreno } from './operacao-com-terreno-autoria'

interface Previa {
  origem: DocumentoDeCenario
  comandos: readonly ComandoDePreviaDoAmbiente[]
}

/** Rascunho dos painéis de metadados; a publicação continua na fila única da oficina. */
export function useRascunhoDeAmbiente<T extends object>({
  controlador,
  palco,
  documento,
  ativo,
  dono,
  comandos,
  continuo = false,
}: {
  controlador: ControladorDaOficina
  palco: RefObject<Palco | null>
  documento: DocumentoDeCenario
  ativo: boolean
  dono: DonoDaPreviaDoAmbiente
  comandos(doc: DocumentoDeCenario, rascunho: T): readonly ComandoDePreviaDoAmbiente[]
  continuo?: boolean
}) {
  const [rascunho, setRascunho] = useState<T | null>(null),
    [previa, setPrevia] = useState<Previa | null>(null),
    [preparando, setPreparando] = useState(false),
    [aplicando, setAplicando] = useState(false),
    [erro, setErro] = useState<string | null>(null),
    [mensagem, setMensagem] = useState<string | null>(null),
    origem = useRef<DocumentoDeCenario | null>(null),
    atual = useRef<T | null>(null),
    pronta = useRef<Previa | null>(null),
    abortador = useRef<AbortController | null>(null),
    montado = useRef(true),
    guardando = useRef(false)
  const invalidar = useCallback(
    (restaurar = true) => {
      abortador.current?.abort()
      abortador.current = null
      pronta.current = null
      setPrevia(null)
      setPreparando(false)
      if (restaurar) palco.current?.finalizarPreviaDeAmbiente(true, dono)
    },
    [palco, dono],
  )
  const cancelar = useCallback(() => {
    if (guardando.current) return
    invalidar()
    origem.current = null
    atual.current = null
    setRascunho(null)
    setErro(null)
  }, [invalidar])
  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
      abortador.current?.abort()
      abortador.current = null
      palco.current?.finalizarPreviaDeAmbiente(true, dono)
    }
  }, [palco, dono])
  useEffect(() => {
    if (!origem.current || origem.current === documento) return
    if (!guardando.current) {
      invalidar()
      setMensagem('O cenário foi atualizado. Reabra o elemento para continuar editando.')
    }
    origem.current = null
    atual.current = null
    pronta.current = null
    setRascunho(null)
    setPrevia(null)
  }, [documento, invalidar])
  useEffect(() => {
    if (!ativo) cancelar()
  }, [ativo, cancelar])
  const abrir = useCallback(
    (valor: T) => {
      if (guardando.current) return false
      invalidar()
      origem.current = controlador.getState().documento
      atual.current = structuredClone(valor)
      setRascunho(atual.current)
      setErro(null)
      setMensagem(null)
      return true
    },
    [controlador, invalidar],
  )
  const mudar = useCallback(
    (valor: T | ((anterior: T) => T)) => {
      if (!atual.current || guardando.current) return false
      if (origem.current !== controlador.getState().documento) {
        cancelar()
        setErro('O cenário mudou. Reabra o elemento antes de editar.')
        return false
      }
      const proximo = typeof valor === 'function' ? (valor as (r: T) => T)(atual.current) : valor
      if (igual(proximo, atual.current)) return true
      invalidar(!continuo)
      atual.current = structuredClone(proximo)
      setRascunho(atual.current)
      setErro(null)
      setMensagem(null)
      return true
    },
    [cancelar, continuo, controlador, invalidar],
  )
  const preparar = useCallback(async () => {
    const p = palco.current,
      r = atual.current,
      de = origem.current
    if (!p || !r || !de || guardando.current) return false
    abortador.current?.abort()
    const controle = new AbortController()
    abortador.current = controle
    pronta.current = null
    setPrevia(null)
    setPreparando(true)
    setErro(null)
    try {
      const estado = controlador.getState()
      if (estado.documento !== de)
        throw new DOMException('O cenário mudou. Reabra o elemento.', 'AbortError')
      if (estado.ocupado || estado.salvamento !== 'guardado')
        throw Error('Aguarde o salvamento antes de preparar a prévia.')
      const lote = comandos(de, r)
      if (lote.length) {
        p.preverAmbiente(de, lote, dono)
        await p.aguardarRecursos(controle.signal)
      } else p.finalizarPreviaDeAmbiente(true, dono)
      controle.signal.throwIfAborted()
      if (controlador.getState().documento !== de || atual.current !== r)
        throw new DOMException('O rascunho mudou.', 'AbortError')
      pronta.current = { origem: de, comandos: lote }
      if (montado.current) setPrevia(pronta.current)
      return true
    } catch (e) {
      if (abortador.current === controle && !continuo) p.finalizarPreviaDeAmbiente(true, dono)
      if (!controle.signal.aborted && montado.current)
        setErro(e instanceof Error ? e.message : 'Não consegui preparar a prévia.')
      return false
    } finally {
      if (abortador.current === controle) {
        abortador.current = null
        if (montado.current) setPreparando(false)
      }
    }
  }, [palco, controlador, comandos, dono, continuo])
  useEffect(() => {
    if (!continuo || !ativo || !rascunho || aplicando) return
    const espera = setTimeout(() => void preparar(), 150)
    return () => clearTimeout(espera)
  }, [continuo, ativo, rascunho, aplicando, preparar])
  const aplicar = useCallback(async () => {
    const p = palco.current,
      preparada = pronta.current
    if (!p || !preparada || guardando.current) return false
    const controle = new AbortController()
    abortador.current = controle
    guardando.current = true
    setAplicando(true)
    setErro(null)
    try {
      const resultado = await guardarOperacaoComTerreno({
        controlador,
        palco: p,
        documentoDeOrigem: preparada.origem,
        comandos: preparada.comandos,
        regioes: {},
        finalizar: (cancelar) => p.finalizarPreviaDeAmbiente(cancelar, dono),
        sinal: controle.signal,
      })
      if (montado.current) {
        origem.current = null
        atual.current = null
        pronta.current = null
        setRascunho(null)
        setPrevia(null)
        setMensagem(
          resultado.guardado
            ? resultado.alterado
              ? 'Mudança guardada. Você pode desfazer.'
              : 'O elemento já estava assim.'
            : 'Mudança mantida na oficina. Tente guardar novamente no topo.',
        )
      }
      return resultado.alterado
    } catch (e) {
      if (!controle.signal.aborted && montado.current)
        setErro(e instanceof Error ? e.message : 'Não consegui guardar esta mudança.')
      return false
    } finally {
      if (abortador.current === controle) abortador.current = null
      guardando.current = false
      if (montado.current) setAplicando(false)
    }
  }, [palco, controlador, dono])
  return {
    rascunho,
    previa,
    preparando,
    aplicando,
    erro,
    mensagem,
    abrir,
    mudar,
    cancelar,
    preparar,
    aplicar,
    informarErro: setErro,
    ocupado: Boolean(rascunho) || preparando || aplicando,
    lerRascunho: () => atual.current,
    origem: origem.current,
    invalidar,
  }
}

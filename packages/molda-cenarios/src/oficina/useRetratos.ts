import type { Palco } from '@sistemazero/molda-cenarios-motor'
import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ControladorDaOficina, EstadoDaOficina } from './controlador'
import type { CenariosHost } from './portas'

export interface FotoDaRevisao {
  revisao: number
  endereco: string
}
interface PedidoDeFoto {
  revisao: number
  controle: AbortController
  promessa: Promise<FotoDaRevisao | null>
}

/** Uma fotografia após estabilizar; a fila não guarda cópias JSON por gesto. */
export function useRetratos({
  host,
  controlador,
  estado,
  palco,
  pronto,
  emGesto,
}: {
  host: CenariosHost
  controlador: ControladorDaOficina
  estado: EstadoDaOficina
  palco: RefObject<Palco | null>
  pronto: boolean
  emGesto: boolean
}) {
  const [ultima, setUltima] = useState<FotoDaRevisao | null>(null),
    [erro, setErro] = useState<string | null>(null),
    [ocupado, setOcupado] = useState(false)
  // biome-ignore lint/correctness/useExhaustiveDependencies: a conexão e o controlador delimitam a vida do envio
  const vida = useMemo(
    () => ({
      ativa: true,
      pedido: null as PedidoDeFoto | null,
      feitas: new Map<number, FotoDaRevisao>(),
    }),
    [host, controlador],
  )
  const atual = useRef({ pronto, emGesto })
  atual.current = { pronto, emGesto }
  useEffect(() => {
    vida.ativa = true
    return () => {
      vida.ativa = false
      vida.pedido?.controle.abort()
    }
  }, [vida])
  const fotografar = useCallback((): Promise<FotoDaRevisao | null> => {
    const snapshot = controlador.getState()
    if (
      !vida.ativa ||
      !atual.current.pronto ||
      atual.current.emGesto ||
      snapshot.salvamento !== 'guardado' ||
      snapshot.ocupado ||
      !palco.current
    )
      return Promise.resolve(null)
    const pronta = vida.feitas.get(snapshot.revisao)
    if (pronta) return Promise.resolve(pronta)
    if (vida.pedido?.revisao === snapshot.revisao && !vida.pedido.controle.signal.aborted)
      return vida.pedido.promessa
    const anterior = vida.pedido?.promessa ?? Promise.resolve(null)
    vida.pedido?.controle.abort()
    const controle = new AbortController(),
      sinal = controle.signal
    setOcupado(true)
    setErro(null)
    const conferir = () => {
      sinal.throwIfAborted()
      const agora = controlador.getState()
      if (
        !vida.ativa ||
        atual.current.emGesto ||
        agora.documento !== snapshot.documento ||
        agora.revisao !== snapshot.revisao ||
        agora.salvamento !== 'guardado'
      )
        throw new DOMException('O cenário mudou antes da fotografia', 'AbortError')
    }
    const promessa: Promise<FotoDaRevisao | null> = anterior
      .catch(() => null)
      .then(async () => {
        conferir()
        const cena = palco.current
        if (!cena) return null
        await cena.aguardarRecursos(sinal)
        conferir()
        const imagem = await cena.capturar(640)
        conferir()
        if (!imagem) throw new Error('Não consegui fotografar esta versão')
        const endereco = await host.guardarCapa(
          snapshot.documento.id,
          snapshot.revisao,
          imagem,
          sinal,
        )
        sinal.throwIfAborted()
        const foto = { revisao: snapshot.revisao, endereco }
        vida.feitas.set(snapshot.revisao, foto)
        if (vida.feitas.size > 200) vida.feitas.delete(vida.feitas.keys().next().value!)
        if (vida.ativa) setUltima(foto)
        return foto
      })
      .catch((e) => {
        if (vida.ativa && !sinal.aborted && !(e instanceof DOMException && e.name === 'AbortError'))
          setErro(e instanceof Error ? e.message : 'Não consegui guardar o retrato')
        return null
      })
      .finally(() => {
        if (vida.pedido?.promessa === promessa) {
          vida.pedido = null
          if (vida.ativa) setOcupado(false)
        }
      })
    vida.pedido = { revisao: snapshot.revisao, controle, promessa }
    return promessa
  }, [host, controlador, palco, vida])
  // biome-ignore lint/correctness/useExhaustiveDependencies: mudar a identidade do documento cancela a captura pendente
  useEffect(() => {
    if (!pronto || emGesto || estado.salvamento !== 'guardado' || estado.ocupado) return
    const timer = setTimeout(() => void fotografar(), 1600)
    return () => {
      clearTimeout(timer)
      if (vida.pedido?.revisao === estado.revisao) vida.pedido.controle.abort()
    }
  }, [
    estado.documento,
    estado.revisao,
    estado.salvamento,
    estado.ocupado,
    pronto,
    emGesto,
    fotografar,
    vida,
  ])
  return { ultima, erro, ocupado, fotografar }
}

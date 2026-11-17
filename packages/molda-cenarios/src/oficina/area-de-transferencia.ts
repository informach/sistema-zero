import {
  capturarFragmento,
  type FragmentoDeCenario,
  idsDoFragmento,
  indiceDaOrganizacao,
  validarFragmento,
} from '@sistemazero/molda-cenarios-core/v2'
import type { Palco } from '@sistemazero/molda-cenarios-motor'
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { conferirMedidasDoDocumento, novoIdAleatorio } from './acoes'
import type { ControladorDaOficina } from './controlador'
import type { CenariosHost } from './portas'

export const MIME_FRAGMENTO = 'application/x-sz-cenario-fragmento'
// Buffer de sessão da ferramenta: atravessa cenários, mas não mantém hosts encerrados vivos.
const buffers = new WeakMap<CenariosHost, { texto: string; sistema: boolean }>()

export function alvosDaTransferencia(
  estado: Pick<
    ReturnType<ControladorDaOficina['getState']>,
    'documento' | 'selecao' | 'alvoDaArvore'
  >,
): readonly string[] {
  return estado.alvoDaArvore && estado.documento.grupos.some((g) => g.id === estado.alvoDaArvore)
    ? [estado.alvoDaArvore]
    : estado.selecao
}

function editando(alvo: EventTarget | null) {
  return Boolean(
    (alvo as HTMLElement | null)?.closest?.(
      'input, textarea, select, [contenteditable], dialog[open]',
    ),
  )
}

export function useAreaDeTransferencia({
  host,
  espaco,
  controlador,
  palco,
  centro,
}: {
  host: CenariosHost
  espaco: string
  controlador: ControladorDaOficina
  palco: RefObject<Palco | null>
  centro(): { x: number; z: number } | null
}) {
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erro, setErro] = useState(false)
  const ativa = useRef(true)
  useEffect(() => {
    ativa.current = true
    return () => {
      ativa.current = false
    }
  }, [])
  const informar = useCallback((texto: string, falhou = false) => {
    setMensagem(texto)
    setErro(falhou)
  }, [])
  const falhar = useCallback(
    (e: unknown) => {
      if (ativa.current)
        informar(e instanceof Error ? e.message : 'Não consegui transferir os objetos', true)
    },
    [informar],
  )
  const capturar = useCallback(() => {
    const estado = controlador.getState(),
      ids = alvosDaTransferencia(estado),
      indice = indiceDaOrganizacao(estado.documento)
    const objetos = [...new Set(ids.flatMap((id) => indice.descendentes(id)))]
    // A cópia usa as medidas verificadas em memória; não altera nem cria revisão na origem.
    const conferido = conferirMedidasDoDocumento(
      estado.documento,
      objetos,
      (id) => palco.current?.volumeDoModelo(id) ?? null,
    )
    return capturarFragmento(conferido.documento, ids, espaco, palco.current?.fonteDeAlturas?.())
  }, [controlador, palco, espaco])
  const copiar = useCallback(
    (recortar = false) => {
      const fragmento = capturar(),
        texto = JSON.stringify(fragmento)
      if (
        recortar &&
        !controlador.executar([
          { tipo: 'elementos.remover', ids: [...alvosDaTransferencia(controlador.getState())] },
        ])
      )
        throw new Error(controlador.getState().recusa ?? 'Não consegui recortar esta escolha')
      buffers.set(host, { texto, sistema: false })
      informar(
        recortar
          ? 'Escolha recortada. Você pode colar neste ou em outro cenário deste espaço.'
          : 'Escolha copiada. Você pode colar neste ou em outro cenário deste espaço.',
      )
      return texto
    },
    [capturar, controlador, host, informar],
  )
  const aplicar = useCallback(
    (fragmento: FragmentoDeCenario, ponto: { x: number; y: number; z: number }) => {
      if (fragmento.origem.espaco !== espaco)
        throw new Error('Não é possível colar objetos de outro espaço')
      const prefixo = novoIdAleatorio(),
        ids = idsDoFragmento(fragmento, prefixo)
      if (!controlador.executar([{ tipo: 'fragmento.colar', fragmento, prefixo, ponto }]))
        throw new Error(controlador.getState().recusa ?? 'Não consegui colar esta escolha')
      controlador.selecionar(
        [...ids.instancias.values()],
        ids.raizes.length === 1 && [...ids.grupos.values()].includes(ids.raizes[0]!)
          ? ids.raizes[0]!
          : undefined,
      )
    },
    [controlador, espaco],
  )
  const colar = useCallback(
    (texto: string) => {
      const fragmento = validarFragmento(texto),
        ponto = centro()
      if (!ponto) throw new Error('Aproxime a câmera do chão para escolher onde colar')
      const atual = controlador.getState(),
        fonte = palco.current?.fonteDeAlturas?.()
      if (atual.documento.base.tipo === 'terreno' && !fonte)
        throw new Error('Aguarde o carregamento do terreno')
      aplicar(fragmento, { ...ponto, y: fonte?.(ponto.x, ponto.z) ?? 0 })
      informar('Escolha colada. Desfazer remove toda a colagem em um passo.')
    },
    [centro, palco, controlador, aplicar, informar],
  )
  const duplicar = useCallback(() => {
    try {
      const fragmento = capturar()
      aplicar(fragmento, {
        x: fragmento.ancora.x + 1,
        y: fragmento.ancora.y,
        z: fragmento.ancora.z + 1,
      })
      informar('Escolha duplicada.')
    } catch (e) {
      falhar(e)
    }
  }, [capturar, aplicar, informar, falhar])
  const copiarPeloBotao = useCallback(
    async (recortar = false) => {
      try {
        const texto = copiar(recortar)
        try {
          if (!navigator.clipboard?.writeText) throw new Error('indisponível')
          await navigator.clipboard.writeText(texto)
          if (buffers.get(host)?.texto === texto) buffers.set(host, { texto, sistema: true })
        } catch {
          if (!ativa.current) return
          informar(
            'Escolha guardada na ferramenta. Use Colar para levá-la a outro cenário deste espaço.',
          )
        }
      } catch (e) {
        falhar(e)
      }
    },
    [copiar, informar, falhar, host],
  )
  const colarPeloBotao = useCallback(async () => {
    try {
      const buffer = buffers.get(host)
      let texto: string | undefined = buffer && !buffer.sistema ? buffer.texto : undefined
      if (texto === undefined) {
        try {
          texto = await navigator.clipboard?.readText()
        } catch {
          /* Buffer de sessão quando o sistema nega acesso. */
        }
        texto ??= buffer?.texto
      }
      if (!texto) throw new Error('Copie uma escolha antes de colar')
      if (!ativa.current) return
      colar(texto)
    } catch (e) {
      falhar(e)
    }
  }, [host, colar, falhar])
  useEffect(() => {
    const transferir = (evento: ClipboardEvent) => {
      if (evento.defaultPrevented || editando(evento.target) || !evento.clipboardData) return
      const ids = alvosDaTransferencia(controlador.getState())
      if (evento.type !== 'paste' && !ids.length) return
      const texto =
        evento.type === 'paste'
          ? evento.clipboardData.getData(MIME_FRAGMENTO) ||
            evento.clipboardData.getData('text/plain')
          : ''
      if (evento.type === 'paste' && !texto.includes('molda-cenario-fragmento')) return
      evento.preventDefault()
      try {
        if (evento.type === 'paste') colar(texto)
        else {
          const conteudo = copiar(evento.type === 'cut')
          evento.clipboardData.setData(MIME_FRAGMENTO, conteudo)
          evento.clipboardData.setData('text/plain', conteudo)
          buffers.set(host, { texto: conteudo, sistema: true })
        }
      } catch (e) {
        falhar(e)
      }
    }
    for (const tipo of ['copy', 'cut', 'paste'])
      globalThis.addEventListener(tipo, transferir as EventListener)
    return () => {
      for (const tipo of ['copy', 'cut', 'paste'])
        globalThis.removeEventListener(tipo, transferir as EventListener)
    }
  }, [controlador, copiar, colar, falhar, host])
  return {
    mensagem,
    erro,
    copiar: copiarPeloBotao,
    colar: colarPeloBotao,
    duplicar,
    limpar: () => setMensagem(null),
  }
}

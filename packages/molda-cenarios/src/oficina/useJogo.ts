import {
  alteracoesDaCamera,
  configuracaoDosControles,
  controlesDoMarcador,
  type DocumentoDeCenario,
  indiceDaOrganizacao,
  type MarcadorDeCenario,
  transformacaoDoMarcador,
} from '@sistemazero/molda-cenarios-core/v2'
import type {
  CapturaDeCaminho,
  GestoDePontosDeCaminho,
  Palco,
  Ponto3,
} from '@sistemazero/molda-cenarios-motor'
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { novoIdAleatorio } from './acoes'
import type { ControladorDaOficina } from './controlador'
import {
  comandosParaGuardarMarcador,
  type FerramentaDoJogo,
  mudarApoioDoMarcador,
  mudarLugarDoMarcador,
  novoMarcador,
} from './jogo-formulario'
import { useRascunhoDeAmbiente } from './useRascunhoDeAmbiente'

export function useJogo({
  controlador,
  palco,
  documento,
  ativo,
  centro,
  alturaDoAvatar,
}: {
  controlador: ControladorDaOficina
  palco: RefObject<Palco | null>
  documento: DocumentoDeCenario
  ativo: boolean
  centro(): Ponto3 | null
  alturaDoAvatar(): number
}) {
  const e = useRascunhoDeAmbiente<MarcadorDeCenario>({
      controlador,
      palco,
      documento,
      ativo,
      dono: 'jogo',
      comandos: comandosParaGuardarMarcador,
    }),
    [capturando, setCapturando] = useState(false),
    [colocando, setColocando] = useState(false),
    [modo, setModo] = useState<CapturaDeCaminho['modo']>('mover'),
    [selecionado, setSelecionado] = useState<number | null>(null),
    captura = useRef<CapturaDeCaminho | null>(null),
    atual = useRef({
      ativo,
      colocando,
      aplicando: e.aplicando,
      erro: e.informarErro,
      mudar: e.mudar,
      ler: e.lerRascunho,
    })
  atual.current = {
    ativo,
    colocando,
    aplicando: e.aplicando,
    erro: e.informarErro,
    mudar: e.mudar,
    ler: e.lerRascunho,
  }
  useEffect(() => () => palco.current?.definirCapturaDeCaminho(null, 'jogo'), [palco])
  useEffect(() => {
    const p = palco.current,
      m = e.rascunho,
      c = m?.configuracao
    if (!p) return
    if (!ativo || !m || (!capturando && !colocando) || e.preparando || e.aplicando || e.previa) {
      captura.current = null
      p.definirCapturaDeCaminho(null, 'jogo')
      return
    }
    if (colocando) {
      const config: CapturaDeCaminho = {
        pontos: [],
        modo: 'adicionar',
        minimo: 1,
        maximo: 1,
        fechada: false,
      }
      p.definirCapturaDeCaminho(config, 'jogo')
      captura.current = config
      return
    }
    if (!(c?.tipo === 'rota' || (c?.tipo === 'zona' && c.forma.tipo === 'poligono'))) {
      captura.current = null
      p.definirCapturaDeCaminho(null, 'jogo')
      return
    }
    try {
      const fonte = p.fonteDeAlturas(),
        poligono = c.tipo === 'zona',
        config: CapturaDeCaminho = {
          pontos: controlesDoMarcador(documento, m, fonte),
          modo,
          fechada: poligono || (c.tipo === 'rota' && c.fechada),
          minimo: poligono || (c.tipo === 'rota' && c.fechada) ? 3 : 2,
          maximo: poligono ? 128 : 512,
          selecionado,
          ...(poligono
            ? { alturaFixa: transformacaoDoMarcador(documento, m, fonte).posicao.y }
            : c.tipo === 'rota' && c.seguirTerreno
              ? { conservarDistanciaDoChao: true }
              : { conservarAltura: true }),
        }
      p.definirCapturaDeCaminho(config, 'jogo')
      captura.current = config
    } catch (erro) {
      e.informarErro(erro instanceof Error ? erro.message : 'Não consegui abrir os pontos.')
    }
  }, [
    ativo,
    e.rascunho,
    capturando,
    colocando,
    modo,
    selecionado,
    e.preparando,
    e.aplicando,
    e.previa,
    documento,
    palco,
    e.informarErro,
  ])
  const iniciar = (tipo: FerramentaDoJogo) => {
    const p = palco.current,
      ponto = centro(),
      doc = controlador.getState().documento
    if (!p || !ponto || e.aplicando) return
    try {
      const local = { ...ponto, y: ponto.y + (tipo === 'pontual' || tipo === 'foco' ? 3 : 0) }
      let m = novoMarcador(doc, tipo, novoIdAleatorio(), local, alturaDoAvatar())
      if (tipo === 'camera')
        m = { ...m, ...alteracoesDaCamera(doc, m, p.capturarCamera(), p.fonteDeAlturas()) }
      else m = mudarApoioDoMarcador(doc, m, true, p.fonteDeAlturas())
      if (e.abrir(m)) {
        setCapturando(false)
        setColocando(false)
        setSelecionado(null)
        setModo('mover')
        controlador.selecionar([])
      }
    } catch (erro) {
      e.informarErro(erro instanceof Error ? erro.message : 'Não consegui criar este elemento.')
    }
  }
  const editar = useCallback(
    (id: string) => {
      const doc = controlador.getState().documento,
        m = doc.marcadores.find((m) => m.id === id)
      if (!m) return
      if (indiceDaOrganizacao(doc).flags.get(id)?.bloqueado) {
        e.informarErro('Destranque o marcador, sua pasta ou camada antes de editar.')
        return
      }
      if (e.abrir(m)) {
        setCapturando(false)
        setColocando(false)
        setSelecionado(null)
        setModo('mover')
        controlador.selecionar([id])
      }
    },
    [controlador, e.abrir, e.informarErro],
  )
  const aoEditarPontos = useCallback(
    (g: GestoDePontosDeCaminho) => {
      const s = atual.current,
        m = s.ler(),
        doc = controlador.getState().documento
      if (!s.ativo || !m || g.documentoDeOrigem !== doc) return
      try {
        if (s.colocando) {
          const ponto = g.pontos[0]
          if (!ponto) return
          s.mudar(mudarLugarDoMarcador(doc, m, ponto, palco.current?.fonteDeAlturas()))
          setColocando(false)
          palco.current?.definirCapturaDeCaminho(null, 'jogo')
          return
        }
        const configuracao = configuracaoDosControles(
          doc,
          m,
          g.pontos,
          palco.current?.fonteDeAlturas(),
        )
        setSelecionado(g.selecionado)
        s.mudar({ ...m, configuracao })
      } catch (erro) {
        s.erro(erro instanceof Error ? erro.message : 'Confira os pontos do marcador.')
        // Rejeitar um polígono inválido devolve as alças ao último rascunho válido.
        const config = captura.current
        if (config) {
          palco.current?.definirCapturaDeCaminho(null, 'jogo')
          palco.current?.definirCapturaDeCaminho(config, 'jogo')
        }
      }
    },
    [controlador, palco],
  )
  const cancelar = useCallback(() => {
    if (atual.current.aplicando) return
    setCapturando(false)
    setColocando(false)
    palco.current?.definirCapturaDeCaminho(null, 'jogo')
    e.cancelar()
  }, [e.cancelar, palco])
  return {
    ...e,
    capturando,
    colocando,
    setCapturando,
    modo,
    setModo,
    selecionado,
    setSelecionado,
    iniciar,
    editar,
    aoEditarPontos,
    capturar: (novoModo: CapturaDeCaminho['modo'] = 'mover') => {
      if (e.aplicando) return
      e.invalidar()
      setColocando(false)
      setModo(novoModo)
      setCapturando(true)
    },
    preparar: () => {
      setCapturando(false)
      setColocando(false)
      palco.current?.definirCapturaDeCaminho(null, 'jogo')
      return e.preparar()
    },
    colocar: () => {
      if (e.aplicando) return
      e.invalidar()
      setCapturando(false)
      setColocando(true)
    },
    cancelar,
    aplicar: async () => {
      const id = e.lerRascunho()?.id,
        alterou = await e.aplicar()
      if (id && controlador.getState().documento.marcadores.some((m) => m.id === id))
        controlador.selecionar([id])
      return alterou
    },
  }
}

import {
  alturaDoChao,
  type DocumentoDeCenario,
  type RegiaoDeCenario,
} from '@sistemazero/molda-cenarios-core/v2'
import type {
  CapturaDeCaminho,
  GestoDePontosDeCaminho,
  Palco,
} from '@sistemazero/molda-cenarios-motor'
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { novoIdAleatorio } from './acoes'
import type { ControladorDaOficina } from './controlador'
import {
  caixaPelosCantos,
  cantosDaRegiao,
  comandosParaGuardarRegiao,
  novaRegiao,
} from './regioes-formulario'
import { useRascunhoDeAmbiente } from './useRascunhoDeAmbiente'

/**
 * A ferramenta Regiões da aba Jogo (lote 7 da conclusão, 22/11/2026), no padrão das zonas:
 * rascunho, prévia e guardar. Dois cliques no chão criam a região; "Mover os cantos" arrasta os
 * quatro cantos. O lote mantém as vizinhas em par; apagar é um passo de desfazer, como os outros.
 */
export function useRegioes({
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
  const e = useRascunhoDeAmbiente<RegiaoDeCenario>({
      controlador,
      palco,
      documento,
      ativo,
      dono: 'regioes',
      comandos: comandosParaGuardarRegiao,
    }),
    [criando, setCriando] = useState(false),
    [movendoCantos, setMovendoCantos] = useState(false),
    [selecionado, setSelecionado] = useState<number | null>(null),
    captura = useRef<CapturaDeCaminho | null>(null),
    atual = useRef({ criando, ativo, ler: e.lerRascunho, mudar: e.mudar, abrir: e.abrir })
  atual.current = { criando, ativo, ler: e.lerRascunho, mudar: e.mudar, abrir: e.abrir }

  useEffect(() => () => palco.current?.definirCapturaDeCaminho(null, 'regioes'), [palco])
  useEffect(() => {
    const p = palco.current
    if (!p) return
    const r = e.rascunho
    if (!ativo || e.preparando || e.aplicando || e.previa || (!criando && !(movendoCantos && r))) {
      captura.current = null
      p.definirCapturaDeCaminho(null, 'regioes')
      return
    }
    try {
      const fonte = p.fonteDeAlturas()
      const config: CapturaDeCaminho = criando
        ? { pontos: [], modo: 'adicionar', minimo: 2, maximo: 2, fechada: false }
        : {
            pontos: cantosDaRegiao(r!.caixa).map((c) => ({
              ...c,
              y: alturaDoChao(documento.base, c.x, c.z, fonte),
            })),
            modo: 'mover',
            minimo: 3,
            maximo: 4,
            fechada: true,
            selecionado,
            conservarDistanciaDoChao: true,
          }
      p.definirCapturaDeCaminho(config, 'regioes')
      captura.current = config
    } catch (erro) {
      e.informarErro(erro instanceof Error ? erro.message : 'Não consegui abrir os cantos.')
    }
  }, [
    ativo,
    criando,
    movendoCantos,
    selecionado,
    e.rascunho,
    e.preparando,
    e.aplicando,
    e.previa,
    documento,
    palco,
    e.informarErro,
  ])

  const aoEditarPontos = useCallback(
    (g: GestoDePontosDeCaminho) => {
      const s = atual.current,
        doc = controlador.getState().documento
      if (!s.ativo || g.documentoDeOrigem !== doc) return
      if (s.criando) {
        const [a, b] = g.pontos
        if (!a || !b) return
        setCriando(false)
        palco.current?.definirCapturaDeCaminho(null, 'regioes')
        s.abrir(novaRegiao(doc, novoIdAleatorio(), a, b))
        return
      }
      const r = s.ler()
      if (!r) return
      setSelecionado(g.selecionado)
      s.mudar({ ...r, caixa: caixaPelosCantos(doc, r.caixa, g.pontos, g.selecionado) })
    },
    [controlador, palco],
  )

  const cancelar = useCallback(() => {
    setCriando(false)
    setMovendoCantos(false)
    palco.current?.definirCapturaDeCaminho(null, 'regioes')
    e.cancelar()
  }, [e.cancelar, palco])

  return {
    ...e,
    criando,
    movendoCantos,
    aoEditarPontos,
    cancelar,
    /** "Nova região": os próximos dois cliques no chão marcam dois cantos opostos. */
    iniciarCriacao: () => {
      if (e.aplicando) return
      e.cancelar()
      setMovendoCantos(false)
      setSelecionado(null)
      setCriando(true)
      controlador.selecionar([])
    },
    editar: (id: string) => {
      const r = controlador.getState().documento.regioes?.find((q) => q.id === id)
      if (!r || !e.abrir(r)) return
      setCriando(false)
      setMovendoCantos(false)
      setSelecionado(null)
    },
    moverCantos: (ligar: boolean) => {
      if (e.aplicando) return
      e.invalidar()
      setSelecionado(null)
      setMovendoCantos(ligar)
    },
    preparar: () => {
      setMovendoCantos(false)
      palco.current?.definirCapturaDeCaminho(null, 'regioes')
      return e.preparar()
    },
    /** Apaga a região na hora (um passo de desfazer); quem a citava como vizinha deixa de citar. */
    apagar: (id: string) => {
      if (e.aplicando || e.preparando) return false
      cancelar()
      return controlador.executar([{ tipo: 'regiao.remover', id }])
    },
  }
}

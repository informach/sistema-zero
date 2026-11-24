import {
  type DocumentoDeCenario,
  indiceDaOrganizacao,
  type OpcoesDeEspalhamento,
  OpcoesDeEspalhamentoSchema,
} from '@sistemazero/molda-cenarios-core/v2'
import type {
  ConfiguracaoDoEspalhamento,
  EstadoDoEspalhamento,
  GestoDeEspalhamento,
  Palco,
} from '@sistemazero/molda-cenarios-motor'
import { type RefObject, useCallback, useMemo, useReducer, useState } from 'react'
import type { ControladorDaOficina } from './controlador'
import {
  comandosParaEspalhar,
  type EscolhaDoPincel,
  escolhaDaBiblioteca,
  escolhasDaSelecao,
  prepararPaleta,
} from './pincel-de-objetos'
import type { ModeloDeBiblioteca } from './portas'

export type ParametrosDoPincel = Omit<OpcoesDeEspalhamento, 'prototipos'>
const INICIAL: ParametrosDoPincel = {
  raio: 4,
  densidade: 20,
  afastamento: 1.5,
  giro: Math.PI,
  tamanhoMin: 0.85,
  tamanhoMax: 1.15,
  semente: 77,
  limite: 500,
  evitarObjetos: true,
  grupo: null,
  camada: null,
}
const PREVIA_VAZIA: EstadoDoEspalhamento = {
  quantidade: 0,
  ativa: false,
  pronta: false,
  saturou: false,
  faltouEspaco: false,
  limiteDoTraco: false,
  erro: null,
}

type AcaoDaPaleta =
  | { tipo: 'adicionar'; escolha: EscolhaDoPincel }
  | { tipo: 'substituir'; escolhas: EscolhaDoPincel[] }
  | { tipo: 'retirar'; chave: string }
  | { tipo: 'limpar' }
  | { tipo: 'erro'; erro: string | null }
function mudarPaleta(
  estado: { escolhas: EscolhaDoPincel[]; erro: string | null },
  acao: AcaoDaPaleta,
) {
  switch (acao.tipo) {
    case 'adicionar':
      if (estado.escolhas.some((e) => e.chave === acao.escolha.chave))
        return { ...estado, erro: null }
      return estado.escolhas.length >= 8
        ? {
            ...estado,
            erro: 'O pincel já tem oito modelos ou variações. Retire um antes de escolher outro.',
          }
        : { escolhas: [...estado.escolhas, acao.escolha], erro: null }
    case 'substituir':
      return { escolhas: acao.escolhas, erro: null }
    case 'retirar':
      return { escolhas: estado.escolhas.filter((e) => e.chave !== acao.chave), erro: null }
    case 'limpar':
      return { escolhas: [], erro: null }
    case 'erro':
      return { ...estado, erro: acao.erro }
  }
}

export function usePincelDeObjetos({
  controlador,
  documento,
  palco,
  ativo,
}: {
  controlador: ControladorDaOficina
  documento: DocumentoDeCenario
  palco: RefObject<Palco | null>
  ativo: boolean
}) {
  const [{ escolhas, erro: erroLocal }, despachar] = useReducer(mudarPaleta, {
    escolhas: [],
    erro: null,
  })
  const [parametros, setParametros] = useState<ParametrosDoPincel>(INICIAL)
  const [previa, aoPrever] = useState<EstadoDoEspalhamento>(PREVIA_VAZIA)
  const setErro = useCallback((erro: string | null) => despachar({ tipo: 'erro', erro }), [])
  const preparado = useMemo((): {
    configuracao: ConfiguracaoDoEspalhamento | null
    erro: string | null
  } => {
    if (!ativo || !escolhas.length) return { configuracao: null, erro: null }
    try {
      const paleta = prepararPaleta(documento, escolhas),
        receita = { ...parametros, prototipos: paleta.prototipos }
      const indice = indiceDaOrganizacao(documento)
      let erro: string | null = null
      if (!OpcoesDeEspalhamentoSchema.safeParse(receita).success)
        erro =
          'Confira a faixa de tamanho e os valores do pincel. A escala final deve ser de até 100 vezes.'
      else if (parametros.grupo && !indice.grupos.has(parametros.grupo))
        erro = 'Escolha uma pasta de destino disponível.'
      else if (parametros.grupo && indice.flags.get(parametros.grupo)?.bloqueado)
        erro =
          'A pasta de destino está trancada. Escolha outra pasta ou destranque antes de pintar.'
      else if (parametros.camada && !indice.camadas.has(parametros.camada))
        erro = 'Escolha uma camada de destino disponível.'
      else if (parametros.camada && indice.camadas.get(parametros.camada)?.bloqueado)
        erro =
          'A camada de destino está trancada. Escolha outra camada ou destranque antes de pintar.'
      else if (
        (parametros.grupo && indice.flags.get(parametros.grupo)?.oculto) ||
        (parametros.camada && indice.camadas.get(parametros.camada)?.oculto)
      )
        erro = 'Mostre a pasta e a camada de destino para pintar nelas.'
      return {
        configuracao: {
          modelos: paleta.modelos,
          formas: paleta.formas,
          texturas: paleta.texturas,
          receita,
          ...(erro ? { pausa: erro } : {}),
        },
        erro,
      }
    } catch (e) {
      return {
        configuracao: null,
        erro:
          e instanceof Error && e.name !== 'ZodError'
            ? e.message
            : 'Não consegui usar este modelo. Confira suas medidas.',
      }
    }
  }, [ativo, documento, escolhas, parametros])
  const usarSelecao = useCallback(() => {
    try {
      const atual = controlador.getState()
      despachar({
        tipo: 'substituir',
        escolhas: escolhasDaSelecao(
          atual.documento,
          atual.selecao,
          (id) => palco.current?.volumeDoModelo(id) ?? null,
        ),
      })
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui usar a seleção')
    }
  }, [controlador, palco, setErro])
  const adicionar = useCallback((modelo: ModeloDeBiblioteca) => {
    const escolha = escolhaDaBiblioteca(modelo)
    despachar({ tipo: 'adicionar', escolha })
  }, [])
  const abrir = useCallback(() => {
    controlador.definirFerramenta('espalhar')
    setErro(null)
    aoPrever(PREVIA_VAZIA)
    if (!escolhas.length && controlador.getState().selecao.length) usarSelecao()
  }, [controlador, escolhas.length, usarSelecao, setErro])
  const fechar = useCallback(() => {
    if (controlador.getState().ferramenta === 'espalhar')
      controlador.definirFerramenta('selecionar')
    setErro(null)
    aoPrever(PREVIA_VAZIA)
  }, [controlador, setErro])
  const aoAplicar = useCallback(
    (gesto: GestoDeEspalhamento) => {
      if (controlador.getState().ferramenta !== 'espalhar')
        throw new Error('O pincel foi encerrado. Comece um novo traço para pintar.')
      const atual = controlador.getState(),
        resultado = comandosParaEspalhar(atual.documento, gesto)
      if (!controlador.executar(resultado.comandos)) return
      controlador.selecionar(resultado.ids)
      setParametros((p) => ({ ...p, semente: (gesto.receita.semente + 1) >>> 0 }))
      setErro(null)
    },
    [controlador, setErro],
  )
  const mudar = useCallback(
    <K extends keyof ParametrosDoPincel>(chave: K, valor: ParametrosDoPincel[K]) => {
      setParametros((p) => ({ ...p, [chave]: valor }))
      setErro(null)
    },
    [setErro],
  )
  const retirar = useCallback((chave: string) => despachar({ tipo: 'retirar', chave }), [])
  const limpar = useCallback(() => despachar({ tipo: 'limpar' }), [])
  return {
    ativo,
    abrir,
    fechar,
    escolhas,
    adicionar,
    retirar,
    limpar,
    usarSelecao,
    parametros,
    mudar,
    previa,
    aoPrever,
    aoAplicar,
    configuracao: preparado.configuracao,
    erro: erroLocal ?? preparado.erro ?? previa.erro,
  }
}

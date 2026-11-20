import {
  type ArquivoDeTerreno,
  abrirEdicaoDeTerreno,
  type BaseDeTerreno,
  baseComPecasEditadas,
  type ComandoDeCenario,
  criarFonteDeAlturas,
  type DocumentoDeCenario,
  digestDosBytes,
  dominioDoChao,
  type EstadoDoTerreno,
  type FonteDeAlturas,
  igual,
  lerRecursoDeTerreno,
  type PecaDeAlturas,
  pontoNoBuraco,
  prepararPecasEditadas,
  type RecursoDeTerreno,
  type RegioesDeTerreno,
  referenciasDoTerreno,
} from '@sistemazero/molda-cenarios-core/v2'
import type { CenarioAberto, CenariosHost } from './portas'

/**
 * A autoria SEM palco: a parte da edição que não depende da tela, dividida entre a oficina (que a
 * usa por trás da fila otimista e do palco) e o agente (que grava direto, sem aba aberta). O
 * caminho é o da mão: as mesmas peças por hash, a mesma reserva/envio/conferência no app e o
 * mesmo lote com a revisão esperada, que vira UM passo de desfazer.
 */

export {
  comandosParaPor,
  comandosParaPorConjunto,
  type LocalDeColocacao,
  novoIdAleatorio,
  referenciaDeBiblioteca,
} from './acoes'
export {
  baseInicialDeTerreno,
  type EdicaoPreparada,
  prepararCamadas,
  prepararDimensoes,
  prepararPinturaAutomatica,
  prepararReceita,
  regiaoInteira,
} from './operacoes-de-terreno'
export {
  comandosParaEspalhar,
  type EscolhaDoPincel,
  escolhaDaBiblioteca,
  prepararPaleta,
} from './pincel-de-objetos'
export type {
  Biblioteca,
  CenarioAberto,
  CenariosHost,
  ConjuntoDeBiblioteca,
  Espaco,
  FiltroDeModelos,
  ModeloDeBiblioteca,
  Mundo,
  PaginaDeModelos,
  ResumoDeCenario,
  VersaoDeConjunto,
} from './portas'
export { CenarioDesatualizado } from './portas'

/** Uma edição do relevo pronta para gravar: a base, o estado já mexido e onde ele mudou. */
export interface EdicaoDoTerreno {
  base: BaseDeTerreno
  estado: EstadoDoTerreno
  regioes: RegioesDeTerreno
}

/**
 * As peças editadas e os comandos de uma edição do relevo. Só as peças NOVAS (que o documento
 * ainda não cita) voltam em `arquivos`; `comandos` traz os de `antes` e, se a base mudou, o
 * `base.definir`. Sem mudança nenhuma, os dois voltam vazios.
 */
export async function prepararGravacaoDoTerreno({
  documentoDeOrigem,
  edicao,
  antes = [],
  conferir,
}: {
  documentoDeOrigem: DocumentoDeCenario
  edicao: EdicaoDoTerreno
  antes?: readonly ComandoDeCenario[]
  /** Chamado entre os passos assíncronos: a oficina recusa se o cenário mudou no meio. */
  conferir?(): void
}): Promise<{ comandos: ComandoDeCenario[]; arquivos: ArquivoDeTerreno[] }> {
  conferir?.()
  const pecas = prepararPecasEditadas(edicao.base, edicao.estado, edicao.regioes),
    arquivos = new Map<string, ArquivoDeTerreno>()
  const conhecidas = new Set(
    documentoDeOrigem.base.tipo === 'terreno'
      ? referenciasDoTerreno(documentoDeOrigem.base).map((p) => p.digest)
      : [],
  )
  const referencias = []
  for (const peca of pecas) {
    conferir?.()
    const digest = peca.conteudo ? await digestDosBytes(peca.conteudo) : null
    if (digest && peca.conteudo && !conhecidas.has(digest))
      arquivos.set(digest, { digest, conteudo: peca.conteudo })
    referencias.push({ papel: peca.papel, coluna: peca.coluna, linha: peca.linha, digest })
  }
  const nova = baseComPecasEditadas(edicao.base, referencias)
  const comandos: ComandoDeCenario[] = [...antes]
  if (!igual(nova, documentoDeOrigem.base)) comandos.push({ tipo: 'base.definir', base: nova })
  return { comandos, arquivos: [...arquivos.values()] }
}

/** O relevo aberto: o estado editável e a fonte de alturas (a mesma régua do palco). */
export interface TerrenoAberto {
  estado: EstadoDoTerreno
  /** Altura em (x, z) e, em `temChao`, se ali há chão (fora dos buracos e da área do relevo). */
  fonte: FonteDeAlturas
}

/** O relevo guardado de um cenário, lido peça por peça pelo app (o mesmo que o palco carrega). */
export async function abrirTerrenoDoCenario(
  host: Pick<CenariosHost, 'conteudoDoTerreno'>,
  cenarioId: string,
  base: BaseDeTerreno,
  sinal?: AbortSignal,
): Promise<TerrenoAberto> {
  const recursos = new Map<string, RecursoDeTerreno>()
  for (const ref of referenciasDoTerreno(base)) {
    if (recursos.has(ref.digest)) continue
    sinal?.throwIfAborted()
    const bytes = new Uint8Array(await host.conteudoDoTerreno(cenarioId, ref.digest, sinal))
    if ((await digestDosBytes(bytes)) !== ref.digest)
      throw Error('Uma peça do relevo chegou diferente do que o cenário guarda.')
    recursos.set(ref.digest, lerRecursoDeTerreno(bytes))
  }
  const estado = abrirEdicaoDeTerreno(base, recursos),
    alturas = new Map<string, PecaDeAlturas>()
  for (const [digest, r] of recursos) if (r.tipo === 'alturas') alturas.set(digest, r.alturas)
  const fonte = criarFonteDeAlturas(base, alturas),
    dominio = dominioDoChao(base)
  // Igual ao `Terreno` do motor: há chão dentro do relevo e fora dos buracos.
  fonte.temChao = (p) => dominio(p) && !pontoNoBuraco(base, estado.buracos, p.x, p.z)
  return { estado, fonte }
}

/**
 * Grava um lote sem palco: envia as peças novas do relevo (reserva, envio direto e conferência no
 * app) e aplica os comandos na revisão esperada. Um lote só, um passo de desfazer. Repetir o
 * MESMO `operacaoId` depois de uma resposta perdida não aplica duas vezes.
 */
export async function gravarSemPalco(
  host: Pick<CenariosHost, 'guardarRecursos' | 'editarCenario'>,
  {
    cenarioId,
    revisaoEsperada,
    comandos,
    arquivos = [],
    operacaoId = crypto.randomUUID(),
    sinal,
  }: {
    cenarioId: string
    revisaoEsperada: number
    comandos: readonly ComandoDeCenario[]
    arquivos?: readonly ArquivoDeTerreno[]
    operacaoId?: string
    sinal?: AbortSignal
  },
): Promise<{ revisao: number; alterado: boolean }> {
  if (!comandos.length) return { revisao: revisaoEsperada, alterado: false }
  const recursos = arquivos.length
    ? await host.guardarRecursos(cenarioId, arquivos, sinal)
    : undefined
  sinal?.throwIfAborted()
  const r = await host.editarCenario(
    cenarioId,
    revisaoEsperada,
    [...comandos],
    operacaoId,
    ...(recursos ? [recursos] : []),
  )
  return { revisao: r.revisao, alterado: true }
}

/** O cenário aberto e, se a base for um relevo, o estado dele (para as ferramentas e consultas). */
export async function abrirParaEditar(
  host: Pick<CenariosHost, 'abrirCenario' | 'conteudoDoTerreno'>,
  cenarioId: string,
  sinal?: AbortSignal,
): Promise<CenarioAberto & { terreno: TerrenoAberto | null }> {
  const aberto = await host.abrirCenario(cenarioId)
  const base = aberto.documento.base
  const terreno =
    base.tipo === 'terreno' ? await abrirTerrenoDoCenario(host, cenarioId, base, sinal) : null
  return { ...aberto, terreno }
}

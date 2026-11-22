import { randomUUID } from 'node:crypto'
import {
  arquivosDosComandos,
  CenarioInvalido,
  type ComandoDeCenario,
  ConflitoDeCenario,
  camposDoArquipelagoMudados,
  criarDocumentoVazio,
  espacosDosComandos,
  executarLote,
  FAIXAS_DA_OFICINA,
  type FamiliaDaOficinaId,
  familiaDaOficina,
  familiasTrancadas,
  igual,
  inverterLote,
  LIMITES_CENARIO_V2,
  LoteDeCenarioSchema,
  TAMANHOS_RECURSO_TERRENO,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  type AberturaDosCenarios,
  type Ator,
  type Biblioteca,
  type Cenario,
  type ConferenciaDeBlob,
  type ConferenciaDeTextura,
  chaveDoBlob,
  type Espaco,
  ehImagemDeCenario,
  equipeNaPropriaConta,
  LIMITES_DOS_CENARIOS,
  type Licenca,
  type Modelo,
  type Mundo,
  normalizarBusca,
  podeNoEspaco,
  podeNoMundo,
  podeUsarCenarios,
  type ResumoDeCenario,
  TETO_DO_BLOB,
  type Textura,
  TIPO_DO_CONTEUDO,
  type TipoDeBlob,
  type TipoDeConteudo,
  tiposDeBlobCompativeis,
} from '../../domain/cenarios/cenarios'
import {
  CenarioArquivoAusenteError,
  CenarioDesatualizadoError,
  CenarioFerramentaTrancadaError,
  CenarioInvalidoError,
  CenarioNaoEncontradoError,
  CenarioRegioesDesligadasError,
  CenariosFechadosError,
  CenariosSemEspacoError,
} from '../../domain/cenarios/cenarios.errors'
import type { MovimentoDoHistorico, ResumoDoHistorico } from '../../domain/cenarios/historico'
import type { BlobReservado, CenariosRepository } from '../../domain/ports/cenarios-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import { ConjuntosService } from './conjuntos.service'
import { ExportacaoDeCenariosService } from './exportacao.service'

export interface EspacoView {
  id: string
  tipo: Espaco['tipo']
  usadoBytes: number
  limiteBytes: number
}
export interface BibliotecaView extends Omit<Biblioteca, 'atualizadaEm'> {
  atualizadaEm: string
}
export interface MundoView extends Omit<Mundo, 'atualizadoEm' | 'criadoPor'> {
  atualizadoEm: string
}
export interface ResumoDeCenarioView extends Omit<ResumoDeCenario, 'atualizadoEm'> {
  atualizadoEm: string
}
export interface CenarioView extends ResumoDeCenarioView {
  espacoId: string
  documento: Cenario['documento']
  historico: ResumoDoHistorico
}

/** Um arquivo a enviar: onde pôr no bucket e com que tipo e tamanho exatos. */
export interface ArquivoAEnviar {
  digest: string
  tipo: TipoDeBlob
  bytes: number
  chave: string
  tipoDoConteudo: string
}

export interface ModeloParaReservar {
  digest: string
  bytes: number
  miniatura?: { digest: string; bytes: number; tipoDoConteudo?: 'image/png' | 'image/webp' } | null
}

export interface ModeloParaRegistrar {
  nome: string
  pasta: string
  etiquetas: string[]
  digest: string
  triangulos: number
  min: [number, number, number]
  max: [number, number, number]
  miniatura?: string | null
}

export interface TexturaParaReservar {
  digest: string
  bytes: number
  tipoDoConteudo: 'image/png' | 'image/webp'
}
export type TexturaParaRegistrar = Omit<Textura, 'id' | 'bibliotecaId' | 'bytes'>

const texto = (valor: string, oque: string, max = 120): string => {
  const limpo = valor.trim()
  if (!limpo || limpo.length > max)
    throw new ValidationError(`${oque} precisa ter de 1 a ${max} letras`)
  return limpo
}
const espacoView = (e: Espaco): EspacoView => ({
  id: e.id,
  tipo: e.tipo,
  usadoBytes: e.usadoBytes,
  limiteBytes: e.limiteBytes,
})
const bibliotecaView = (b: Biblioteca): BibliotecaView => ({
  ...b,
  atualizadaEm: b.atualizadaEm.toISOString(),
})
const mundoView = ({ criadoPor: _criadoPor, ...m }: Mundo): MundoView => ({
  ...m,
  atualizadoEm: m.atualizadoEm.toISOString(),
})
const resumoView = (c: ResumoDeCenario): ResumoDeCenarioView => ({
  id: c.id,
  mundoId: c.mundoId,
  nome: c.nome,
  revisao: c.revisao,
  capa: c.capa,
  atualizadoEm: c.atualizadoEm.toISOString(),
})

/**
 * Molda Cenários. Toda operação confere duas coisas: se a ferramenta está aberta para quem pede
 * e se o que ele pede é do espaço dele. O que é de outro espaço responde "não existe".
 */
/** `restrita` é o acervo licenciado da equipe: numa conta, a própria pessoa ficaria sem poder
 * exportar os modelos dela. Para "só eu uso" existe `propria`. */
function exigirLicencaDoEspaco(espaco: Espaco, licenca: Licenca) {
  if (licenca === 'restrita' && espaco.tipo !== 'equipe')
    throw new ValidationError('A licença restrita é só do acervo da equipe. Use "uso próprio".')
}

export class CenariosService {
  readonly conjuntos: ConjuntosService
  readonly exportacao: ExportacaoDeCenariosService
  constructor(
    private readonly repo: CenariosRepository,
    private readonly clock: () => Date,
    private readonly abertura: AberturaDosCenarios,
    private readonly novoId: () => string = randomUUID,
  ) {
    this.exportacao = new ExportacaoDeCenariosService(repo, (ator, id) => this.cenarioDe(ator, id))
    this.conjuntos = new ConjuntosService(repo, {
      exigirAberto: (ator) => this.exigirAberto(ator),
      exigirFamilia: (ator, familia) => this.exigirFamilia(ator, familia),
      bibliotecaDe: (ator, id) => this.bibliotecaDe(ator, id),
      abrirCenario: (ator, id) => this.abrirCenario(ator, id),
      abrirMundo: async (ator, id) => mundoView((await this.mundoDe(ator, id)).mundo),
      reservar: (espacoId, blobs) => this.reservar(espacoId, blobs),
      agora: clock,
      novoId,
    })
  }

  /** Só o modo, sem o produto: serve para quem já exige a equipe na própria conta. */
  modoAdmite(ator: Ator): boolean {
    return podeUsarCenarios(this.abertura, ator)
  }

  /** A ferramenta está aberta para esta pessoa: o modo e, fora da equipe, o produto Molda. */
  async aberto(ator: Ator): Promise<boolean> {
    if (!podeUsarCenarios(this.abertura, ator)) return false
    if (ator.equipe && !ator.suporte) return true
    return (await this.abertura.produto?.(ator)) === true
  }

  /** A resposta de `/acesso`: a oficina aberta e se a ferramenta Regiões vale neste ambiente. */
  async acesso(ator: Ator): Promise<{ aberto: boolean; regioes: boolean }> {
    const aberto = await this.aberto(ator)
    return { aberto, regioes: aberto && this.abertura.regioes === true }
  }

  private async exigirAberto(ator: Ator): Promise<void> {
    if (!(await this.aberto(ator))) throw new CenariosFechadosError()
  }

  private async espacoDe(ator: Ator, espacoId: string, oque = 'O espaço'): Promise<Espaco> {
    await this.exigirAberto(ator)
    const espaco = await this.repo.espaco(espacoId)
    if (!espaco || !podeNoEspaco(espaco, ator)) throw new CenarioNaoEncontradoError(oque)
    return this.comACotaDeAgora(espaco)
  }

  private get cotaDaConta(): number {
    return this.abertura.cotaDaContaBytes ?? LIMITES_DOS_CENARIOS.bytesDaConta
  }

  /** A cota configurada vale também para o espaço que já existia com outra. */
  private async comACotaDeAgora(espaco: Espaco): Promise<Espaco> {
    if (espaco.tipo !== 'conta' || espaco.limiteBytes === this.cotaDaConta) return espaco
    await this.repo.definirLimiteDaConta(espaco.id, this.cotaDaConta)
    return { ...espaco, limiteBytes: this.cotaDaConta }
  }
  private async bibliotecaDe(ator: Ator, id: string) {
    await this.exigirAberto(ator)
    const biblioteca = await this.repo.biblioteca(id)
    if (!biblioteca) throw new CenarioNaoEncontradoError('A biblioteca')
    const espaco = await this.espacoDe(ator, biblioteca.espacoId, 'A biblioteca')
    return { biblioteca, espaco }
  }
  private async mundoDe(ator: Ator, id: string) {
    await this.exigirAberto(ator)
    const mundo = await this.repo.mundo(id)
    if (!mundo) throw new CenarioNaoEncontradoError('O mundo')
    const espaco = await this.espacoDe(ator, mundo.espacoId, 'O mundo')
    // O mundo de um irmão responde "não existe", como o de outra conta.
    if (!podeNoMundo(mundo, espaco, ator)) throw new CenarioNaoEncontradoError('O mundo')
    return { mundo, espaco }
  }
  private async cenarioDe(ator: Ator, id: string) {
    await this.exigirAberto(ator)
    const cenario = await this.repo.cenario(id)
    if (!cenario) throw new CenarioNaoEncontradoError('O cenário')
    const { mundo, espaco } = await this.mundoDe(ator, cenario.mundoId)
    return { cenario, mundo, espaco }
  }

  // ---- espaços ------------------------------------------------------------

  /** Os espaços de quem pede: o da conta e, para a equipe, o da equipe. Cria na primeira vez. */
  async espacos(ator: Ator): Promise<EspacoView[]> {
    await this.exigirAberto(ator)
    const agora = this.clock()
    const lista = [
      await this.comACotaDeAgora(
        await this.repo.espacoDaConta(ator.contaId, this.cotaDaConta, agora),
      ),
    ]
    if (equipeNaPropriaConta(ator))
      lista.push(await this.repo.espacoDaEquipe(LIMITES_DOS_CENARIOS.bytesDaEquipe, agora))
    return lista.map(espacoView)
  }

  // ---- bibliotecas e modelos ---------------------------------------------

  async bibliotecas(ator: Ator, espacoId: string): Promise<BibliotecaView[]> {
    await this.espacoDe(ator, espacoId)
    return (await this.repo.bibliotecas(espacoId)).map(bibliotecaView)
  }

  /** Um arquivo exportado do Molda usa o armazenamento da mesma conta. O nome não identifica a fonte. */
  async bibliotecaDoMolda(ator: Ator, espacoId: string): Promise<BibliotecaView> {
    const espaco = await this.espacoDe(ator, espacoId)
    if (espaco.tipo !== 'conta') throw new ValidationError('Os moldes pertencem ao espaço da conta')
    const criada = await this.repo.criarBiblioteca(
      {
        id: this.novoId(),
        espacoId,
        nome: 'Cópias do Molda',
        licenca: 'propria',
        criadoPor: ator.usuarioId,
        fonte: `molda:${ator.usuarioId}`,
      },
      LIMITES_DOS_CENARIOS.bibliotecasPorEspaco,
      this.clock(),
    )
    if (!criada) throw new CenariosSemEspacoError('Este espaço já tem o máximo de bibliotecas')
    return bibliotecaView(criada)
  }

  async criarBiblioteca(
    ator: Ator,
    espacoId: string,
    dados: { nome: string; licenca: Licenca; descricao?: string },
  ): Promise<BibliotecaView> {
    const espaco = await this.espacoDe(ator, espacoId)
    exigirLicencaDoEspaco(espaco, dados.licenca)
    const criada = await this.repo.criarBiblioteca(
      {
        id: this.novoId(),
        espacoId,
        nome: texto(dados.nome, 'O nome'),
        descricao: (dados.descricao ?? '').trim().slice(0, 1000),
        licenca: dados.licenca,
        criadoPor: ator.usuarioId,
      },
      LIMITES_DOS_CENARIOS.bibliotecasPorEspaco,
      this.clock(),
    )
    if (!criada) throw new CenariosSemEspacoError('Este espaço já tem o máximo de bibliotecas')
    return bibliotecaView(criada)
  }

  async editarBiblioteca(
    ator: Ator,
    id: string,
    dados: { nome?: string; licenca?: Licenca; descricao?: string; capaModelo?: string | null },
  ): Promise<BibliotecaView> {
    const { espaco } = await this.bibliotecaDe(ator, id)
    if (dados.licenca !== undefined) exigirLicencaDoEspaco(espaco, dados.licenca)
    if (dados.capaModelo) {
      const modelo = await this.repo.modelo(dados.capaModelo)
      const origem = modelo ? await this.repo.biblioteca(modelo.bibliotecaId) : null
      if (!modelo?.miniatura || origem?.espacoId !== espaco.id)
        throw new CenarioNaoEncontradoError('O retrato do modelo')
    }
    const editada = await this.repo.editarBiblioteca(
      id,
      {
        ...(dados.nome !== undefined ? { nome: texto(dados.nome, 'O nome') } : {}),
        ...(dados.licenca !== undefined ? { licenca: dados.licenca } : {}),
        ...(dados.descricao !== undefined
          ? { descricao: dados.descricao.trim().slice(0, 1000) }
          : {}),
        ...(dados.capaModelo !== undefined ? { capaModelo: dados.capaModelo } : {}),
      },
      this.clock(),
    )
    if (!editada) throw new CenarioNaoEncontradoError('A biblioteca')
    return bibliotecaView(editada)
  }

  /** Apaga a biblioteca; devolve as chaves dos arquivos que ficaram sem dono, para o BFF apagar. */
  async apagarBiblioteca(ator: Ator, id: string): Promise<{ apagar: string[] }> {
    const { espaco } = await this.bibliotecaDe(ator, id)
    const orfaos = await this.repo.apagarBiblioteca(id, this.clock())
    return { apagar: orfaos.map((digest) => chaveDoBlob(espaco.id, digest)) }
  }

  async organizacao(
    ator: Ator,
    bibliotecaId: string,
  ): Promise<{ pastas: string[]; etiquetas: string[] }> {
    await this.bibliotecaDe(ator, bibliotecaId)
    return this.repo.organizacao(bibliotecaId)
  }

  async modelos(
    ator: Ator,
    bibliotecaId: string,
    filtro: { busca?: string; pasta?: string; digest?: string; cursor?: string; limite?: number },
  ): Promise<{ itens: Modelo[]; total: number; proximo: string | null }> {
    await this.bibliotecaDe(ator, bibliotecaId)
    const inicio = Math.max(0, Number(filtro.cursor ?? 0) || 0)
    const limite = Math.min(LIMITES_DOS_CENARIOS.paginaDeModelos, Math.max(1, filtro.limite ?? 60))
    const termos = normalizarBusca(filtro.busca ?? '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 8)
    const pagina = await this.repo.modelos(bibliotecaId, {
      termos,
      ...(filtro.pasta !== undefined ? { pasta: filtro.pasta } : {}),
      ...(filtro.digest !== undefined ? { digest: filtro.digest } : {}),
      inicio,
      limite,
    })
    return {
      ...pagina,
      proximo: inicio + pagina.itens.length < pagina.total ? String(inicio + limite) : null,
    }
  }

  /**
   * A busca dos agentes: modelos de TODAS as bibliotecas do espaço, por nome, pasta, etiqueta e
   * tamanho (pela caixa guardada de cada modelo), ou só os ids pedidos (o orçamento de um cenário).
   */
  async modelosNoEspaco(
    ator: Ator,
    espacoId: string,
    filtro: {
      busca?: string
      pasta?: string
      etiqueta?: string
      ids?: string
      alturaMin?: number
      alturaMax?: number
      ladoMin?: number
      ladoMax?: number
      cursor?: string
      limite?: number
    },
  ): Promise<{ itens: Modelo[]; total: number; proximo: string | null }> {
    await this.espacoDe(ator, espacoId)
    const inicio = Math.max(0, Number(filtro.cursor ?? 0) || 0)
    const limite = Math.min(LIMITES_DOS_CENARIOS.paginaDeModelos, Math.max(1, filtro.limite ?? 60))
    const termos = normalizarBusca(filtro.busca ?? '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 8)
    const faixa = (min?: number, max?: number) =>
      min !== undefined || max !== undefined
        ? { ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) }
        : undefined
    const altura = faixa(filtro.alturaMin, filtro.alturaMax),
      lado = faixa(filtro.ladoMin, filtro.ladoMax)
    const pagina = await this.repo.modelosNoEspaco(espacoId, {
      termos,
      ...(filtro.pasta !== undefined ? { pasta: filtro.pasta } : {}),
      ...(filtro.etiqueta !== undefined ? { etiqueta: filtro.etiqueta } : {}),
      ...(filtro.ids !== undefined ? { ids: filtro.ids.split(',') } : {}),
      ...(altura ? { altura } : {}),
      ...(lado ? { lado } : {}),
      inicio,
      limite,
    })
    return {
      ...pagina,
      proximo: inicio + pagina.itens.length < pagina.total ? String(inicio + limite) : null,
    }
  }

  /**
   * Primeiro passo de trazer modelos: reserva os arquivos no espaço e diz quais precisam subir.
   * O que já está guardado (o mesmo conteúdo, trazido antes) não sobe de novo.
   */
  async reservarModelos(
    ator: Ator,
    bibliotecaId: string,
    modelos: readonly ModeloParaReservar[],
  ): Promise<{ espacoId: string; enviar: ArquivoAEnviar[] }> {
    const { espaco } = await this.bibliotecaDe(ator, bibliotecaId)
    if (!modelos.length || modelos.length > LIMITES_DOS_CENARIOS.reservaPorChamada)
      throw new ValidationError(
        `Traga de 1 a ${LIMITES_DOS_CENARIOS.reservaPorChamada} modelos por vez`,
      )
    const blobs = new Map<string, BlobReservado>()
    const por = (
      digest: string,
      bytes: number,
      tipo: TipoDeBlob,
      tipoDoConteudo: TipoDeConteudo = TIPO_DO_CONTEUDO[tipo],
    ) => {
      const existente = blobs.get(digest)
      if (
        existente &&
        (existente.bytes !== bytes ||
          !tiposDeBlobCompativeis(existente.tipo, tipo) ||
          existente.tipoDoConteudo !== tipoDoConteudo)
      )
        throw new ValidationError('O mesmo arquivo não pode ter tamanhos ou tipos diferentes')
      if (bytes < 1 || bytes > TETO_DO_BLOB[tipo])
        throw new ValidationError(
          tipo === 'modelo' ? 'O modelo passa de 64 MB' : 'O retrato do modelo é grande demais',
        )
      blobs.set(digest, { digest, bytes, tipo, tipoDoConteudo })
    }
    for (const m of modelos) {
      por(m.digest, m.bytes, 'modelo')
      if (m.miniatura)
        por(m.miniatura.digest, m.miniatura.bytes, 'miniatura', m.miniatura.tipoDoConteudo)
    }
    return this.reservar(espaco.id, [...blobs.values()])
  }

  /** Chamada interna do BFF depois de apagar do armazenamento os objetos sem dono que o próprio
   * members devolveu: a reserva desses hashes volta a valer. */
  async arquivosSairam(ator: Ator, espacoId: string, digests: readonly string[]) {
    const espaco = await this.espacoDe(ator, espacoId)
    const unicos = [...new Set(digests)]
    if (!unicos.length || unicos.length > 2000)
      throw new ValidationError('Informe de 1 a 2000 arquivos apagados')
    await this.repo.arquivosSairam(espaco.id, unicos)
    return { ok: true as const }
  }

  private async reservar(espacoId: string, blobs: BlobReservado[]) {
    const agora = this.clock()
    const reserva = await this.repo.reservarBlobs(
      espacoId,
      blobs,
      agora,
      new Date(agora.getTime() + LIMITES_DOS_CENARIOS.reservaVenceMs),
    )
    if (!reserva) throw new CenariosSemEspacoError()
    return {
      espacoId,
      enviar: reserva.faltam.map((b) => ({
        ...b,
        chave: chaveDoBlob(espacoId, b.digest),
        tipoDoConteudo: b.tipoDoConteudo ?? TIPO_DO_CONTEUDO[b.tipo],
      })),
    }
  }

  /**
   * Segundo passo, chamado só pelo BFF: `conferidos` são os arquivos que ele achou no bucket,
   * e `espacoConferido` é o espaço em que ele procurou. Conferência feita em OUTRO espaço não
   * vale nada. Modelo sem o arquivo confirmado não entra, e a resposta diz quais faltaram.
   */
  async registrarModelos(
    ator: Ator,
    bibliotecaId: string,
    modelos: readonly ModeloParaRegistrar[],
    conferidos: readonly ConferenciaDeBlob[],
    espacoConferido?: string,
  ): Promise<Modelo[]> {
    const { espaco } = await this.bibliotecaDe(ator, bibliotecaId)
    if (espacoConferido !== undefined && espacoConferido !== espaco.id) conferidos = []
    if (!modelos.length || modelos.length > LIMITES_DOS_CENARIOS.reservaPorChamada)
      throw new ValidationError(
        `Traga de 1 a ${LIMITES_DOS_CENARIOS.reservaPorChamada} modelos por vez`,
      )
    const agora = this.clock()
    if (conferidos.length) await this.repo.confirmarBlobs(espaco.id, conferidos, agora)
    const digests = modelos.flatMap((m) => (m.miniatura ? [m.digest, m.miniatura] : [m.digest]))
    const confirmados = await this.repo.blobsConfirmados(espaco.id, digests)
    const ausentes = modelos
      .filter((m) => confirmados.get(m.digest)?.tipo !== 'modelo')
      .map((m) => m.digest)
    if (ausentes.length) throw new CenarioArquivoAusenteError(ausentes)
    const criados = await this.repo.criarModelos(
      bibliotecaId,
      modelos.map((m) => ({
        id: this.novoId(),
        nome: texto(m.nome, 'O nome do modelo'),
        pasta: m.pasta.trim().slice(0, 240),
        etiquetas: [...new Set(m.etiquetas.map((e) => e.trim()).filter(Boolean))].slice(0, 16),
        digest: m.digest,
        bytes: confirmados.get(m.digest)!.bytes,
        triangulos: m.triangulos,
        min: m.min,
        max: m.max,
        // Retrato que não chegou não derruba o modelo: ele entra sem retrato.
        miniatura:
          m.miniatura &&
          confirmados.get(m.miniatura) &&
          ehImagemDeCenario(confirmados.get(m.miniatura)!.tipo)
            ? m.miniatura
            : null,
      })),
      LIMITES_DOS_CENARIOS.modelosPorBiblioteca,
      ator.usuarioId,
      agora,
    )
    if (!criados) throw new CenariosSemEspacoError('Esta biblioteca já tem o máximo de modelos')
    return criados
  }

  async editarModelo(
    ator: Ator,
    id: string,
    dados: { nome?: string; pasta?: string; etiquetas?: string[] },
  ): Promise<Modelo> {
    await this.exigirAberto(ator)
    const modelo = await this.repo.modelo(id)
    if (!modelo) throw new CenarioNaoEncontradoError('O modelo')
    await this.bibliotecaDe(ator, modelo.bibliotecaId)
    const editado = await this.repo.editarModelo(
      id,
      {
        ...(dados.nome !== undefined ? { nome: texto(dados.nome, 'O nome do modelo') } : {}),
        ...(dados.pasta !== undefined ? { pasta: dados.pasta.trim().slice(0, 240) } : {}),
        ...(dados.etiquetas !== undefined
          ? {
              etiquetas: [...new Set(dados.etiquetas.map((e) => e.trim()).filter(Boolean))].slice(
                0,
                16,
              ),
            }
          : {}),
      },
      this.clock(),
    )
    if (!editado) throw new CenarioNaoEncontradoError('O modelo')
    return editado
  }

  async apagarModelos(
    ator: Ator,
    bibliotecaId: string,
    ids: readonly string[],
  ): Promise<{ apagar: string[] }> {
    const { espaco } = await this.bibliotecaDe(ator, bibliotecaId)
    if (!ids.length || ids.length > 200) throw new ValidationError('Escolha de 1 a 200 modelos')
    const orfaos = await this.repo.apagarModelos(bibliotecaId, ids, this.clock())
    return { apagar: orfaos.map((digest) => chaveDoBlob(espaco.id, digest)) }
  }

  async texturas(
    ator: Ator,
    bibliotecaId: string,
    filtro: { busca?: string; pasta?: string; digest?: string; cursor?: string; limite?: number },
  ) {
    await this.bibliotecaDe(ator, bibliotecaId)
    const inicio = Math.max(0, Number(filtro.cursor ?? 0) || 0)
    const limite = Math.min(LIMITES_DOS_CENARIOS.paginaDeModelos, Math.max(1, filtro.limite ?? 60))
    const pagina = await this.repo.texturas(bibliotecaId, {
      termos: normalizarBusca(filtro.busca ?? '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 8),
      ...(filtro.pasta !== undefined ? { pasta: filtro.pasta } : {}),
      ...(filtro.digest !== undefined ? { digest: filtro.digest } : {}),
      inicio,
      limite,
    })
    return {
      ...pagina,
      proximo: inicio + pagina.itens.length < pagina.total ? String(inicio + limite) : null,
    }
  }

  async reservarTexturas(
    ator: Ator,
    bibliotecaId: string,
    texturas: readonly TexturaParaReservar[],
  ) {
    const { espaco } = await this.bibliotecaDe(ator, bibliotecaId)
    if (!texturas.length || texturas.length > LIMITES_DOS_CENARIOS.reservaPorChamada)
      throw new ValidationError('Traga de 1 a 50 imagens por vez')
    const blobs = new Map<string, BlobReservado>()
    for (const t of texturas) {
      if (
        !Number.isSafeInteger(t.bytes) ||
        t.bytes < 1 ||
        t.bytes > LIMITES_DOS_CENARIOS.texturaBytes ||
        !['image/png', 'image/webp'].includes(t.tipoDoConteudo)
      )
        throw new ValidationError('Use uma imagem PNG ou WebP de até 4 MB')
      const anterior = blobs.get(t.digest)
      if (anterior && (anterior.bytes !== t.bytes || anterior.tipoDoConteudo !== t.tipoDoConteudo))
        throw new ValidationError('O mesmo arquivo não pode ter tamanhos ou tipos diferentes')
      blobs.set(t.digest, { ...t, tipo: 'textura' })
    }
    return this.reservar(espaco.id, [...blobs.values()])
  }

  async registrarTexturas(
    ator: Ator,
    bibliotecaId: string,
    texturas: readonly TexturaParaRegistrar[],
    conferidos: readonly ConferenciaDeTextura[],
    espacoConferido: string,
  ): Promise<Textura[]> {
    const { espaco } = await this.bibliotecaDe(ator, bibliotecaId)
    if (!texturas.length || texturas.length > LIMITES_DOS_CENARIOS.reservaPorChamada)
      throw new ValidationError('Traga de 1 a 50 imagens por vez')
    const provas = new Map(
      (espacoConferido === espaco.id ? conferidos : []).map((c) => [c.digest, c]),
    )
    const agora = this.clock()
    const preparadas = texturas.map((t) => {
      const prova = provas.get(t.digest)
      if (
        !prova ||
        prova.largura !== t.largura ||
        prova.altura !== t.altura ||
        !['image/png', 'image/webp'].includes(prova.tipoDoConteudo)
      )
        throw new CenarioArquivoAusenteError([t.digest])
      if (
        !Number.isInteger(t.largura) ||
        !Number.isInteger(t.altura) ||
        t.largura < 1 ||
        t.altura < 1 ||
        t.largura > 4096 ||
        t.altura > 4096 ||
        t.largura * t.altura > 8388608 ||
        prova.bytes > LIMITES_DOS_CENARIOS.texturaBytes
      )
        throw new ValidationError('A imagem passa do limite de tamanho ou dimensões')
      this.conferirRepeticao(t.repeticaoMetros)
      return {
        ...t,
        id: this.novoId(),
        bytes: prova.bytes,
        nome: texto(t.nome, 'O nome do chão'),
        pasta: t.pasta.trim().slice(0, 240),
        etiquetas: [...new Set(t.etiquetas.map((e) => e.trim()).filter(Boolean))].slice(0, 16),
      }
    })
    const criadas = await this.repo.criarTexturas(
      bibliotecaId,
      preparadas,
      LIMITES_DOS_CENARIOS.texturasPorBiblioteca,
      ator.usuarioId,
      agora,
      [...provas.values()],
    )
    if (!criadas) throw new CenariosSemEspacoError('Esta biblioteca já tem o máximo de chãos')
    return criadas
  }

  private conferirRepeticao(valor: number) {
    if (!Number.isFinite(valor) || valor < 0.05 || valor > 1000)
      throw new ValidationError('A repetição do chão precisa ter de 0,05 a 1000 metros')
  }

  async editarTextura(
    ator: Ator,
    id: string,
    dados: { nome?: string; pasta?: string; etiquetas?: string[]; repeticaoMetros?: number },
  ): Promise<Textura> {
    await this.exigirAberto(ator)
    const atual = await this.repo.textura(id)
    if (!atual) throw new CenarioNaoEncontradoError('O chão')
    await this.bibliotecaDe(ator, atual.bibliotecaId)
    if (dados.repeticaoMetros !== undefined) this.conferirRepeticao(dados.repeticaoMetros)
    const editada = await this.repo.editarTextura(
      id,
      {
        ...(dados.nome !== undefined ? { nome: texto(dados.nome, 'O nome do chão') } : {}),
        ...(dados.pasta !== undefined ? { pasta: dados.pasta.trim().slice(0, 240) } : {}),
        ...(dados.etiquetas !== undefined
          ? {
              etiquetas: [...new Set(dados.etiquetas.map((e) => e.trim()).filter(Boolean))].slice(
                0,
                16,
              ),
            }
          : {}),
        ...(dados.repeticaoMetros !== undefined ? { repeticaoMetros: dados.repeticaoMetros } : {}),
      },
      this.clock(),
    )
    if (!editada) throw new CenarioNaoEncontradoError('O chão')
    return editada
  }

  async apagarTexturas(ator: Ator, bibliotecaId: string, ids: readonly string[]) {
    const { espaco } = await this.bibliotecaDe(ator, bibliotecaId)
    if (!ids.length || ids.length > 200) throw new ValidationError('Escolha de 1 a 200 chãos')
    const orfas = await this.repo.apagarTexturas(bibliotecaId, ids, this.clock())
    return { apagar: orfas.map((digest) => chaveDoBlob(espaco.id, digest)) }
  }

  /** Onde está um arquivo do espaço, para o BFF assinar a leitura. */
  async arquivo(
    ator: Ator,
    espacoId: string,
    digest: string,
  ): Promise<{ chave: string; tipoDoConteudo: string; bytes: number }> {
    await this.espacoDe(ator, espacoId, 'O arquivo')
    const blob = (await this.repo.blobsConfirmados(espacoId, [digest])).get(digest)
    if (!blob) throw new CenarioNaoEncontradoError('O arquivo')
    return {
      chave: chaveDoBlob(espacoId, digest),
      tipoDoConteudo: blob.tipoDoConteudo,
      bytes: blob.bytes,
    }
  }

  // ---- mundos -------------------------------------------------------------

  async mundos(ator: Ator, espacoId: string): Promise<MundoView[]> {
    const espaco = await this.espacoDe(ator, espacoId)
    return (await this.repo.mundos(espacoId))
      .filter((mundo) => podeNoMundo(mundo, espaco, ator))
      .map(mundoView)
  }

  async criarMundo(ator: Ator, espacoId: string, nome: string): Promise<MundoView> {
    await this.espacoDe(ator, espacoId)
    const criado = await this.repo.criarMundo(
      { id: this.novoId(), espacoId, nome: texto(nome, 'O nome'), criadoPor: ator.usuarioId },
      LIMITES_DOS_CENARIOS.mundosPorEspaco,
      this.clock(),
    )
    if (!criado) throw new CenariosSemEspacoError('Este espaço já tem o máximo de mundos')
    return mundoView(criado)
  }

  async abrirMundo(ator: Ator, id: string): Promise<MundoView> {
    return mundoView((await this.mundoDe(ator, id)).mundo)
  }

  async editarMundo(
    ator: Ator,
    id: string,
    dados: { nome?: string; bibliotecas?: string[] },
  ): Promise<MundoView> {
    const { espaco } = await this.mundoDe(ator, id)
    let bibliotecas: string[] | undefined
    if (dados.bibliotecas !== undefined) {
      // Um mundo só usa bibliotecas do próprio espaço.
      const doEspaco = new Set((await this.repo.bibliotecas(espaco.id)).map((b) => b.id))
      bibliotecas = [...new Set(dados.bibliotecas)].filter((b) => doEspaco.has(b))
    }
    const editado = await this.repo.editarMundo(
      id,
      {
        ...(dados.nome !== undefined ? { nome: texto(dados.nome, 'O nome') } : {}),
        ...(bibliotecas !== undefined ? { bibliotecas } : {}),
      },
      this.clock(),
    )
    if (!editado) throw new CenarioNaoEncontradoError('O mundo')
    return mundoView(editado)
  }

  async apagarMundo(ator: Ator, id: string): Promise<{ apagar: string[] }> {
    const { espaco, mundo } = await this.mundoDe(ator, id)
    if (mundo.bibliotecaConjuntosId)
      throw new CenarioInvalidoError(['Gerencie estes rascunhos pela biblioteca de conjuntos'])
    const digests = await this.repo.apagarMundo(id)
    return { apagar: digests.map((d) => chaveDoBlob(espaco.id, d)) }
  }

  // ---- cenários -----------------------------------------------------------

  async cenarios(ator: Ator, mundoId: string): Promise<ResumoDeCenarioView[]> {
    await this.mundoDe(ator, mundoId)
    return (await this.repo.cenarios(mundoId)).map(resumoView)
  }

  async criarCenario(ator: Ator, mundoId: string, nome: string): Promise<ResumoDeCenarioView> {
    const { mundo } = await this.mundoDe(ator, mundoId)
    if (mundo.bibliotecaConjuntosId)
      throw new CenarioInvalidoError(['Crie o conjunto pela biblioteca'])
    const id = this.novoId()
    const limpo = texto(nome, 'O nome')
    const criado = await this.repo.criarCenario(
      {
        id,
        mundoId,
        nome: limpo,
        documento: criarDocumentoVazio(id, limpo),
        criadoPor: ator.usuarioId,
      },
      LIMITES_DOS_CENARIOS.cenariosPorMundo,
      this.clock(),
    )
    if (!criado) throw new CenariosSemEspacoError('Este mundo já tem o máximo de cenários')
    return resumoView(criado)
  }

  async abrirCenario(ator: Ator, id: string): Promise<CenarioView> {
    const { cenario, espaco } = await this.cenarioDe(ator, id)
    return {
      ...resumoView(cenario),
      espacoId: espaco.id,
      documento: cenario.documento,
      historico: await this.historico(ator, id),
    }
  }

  /** Sem o documento: a oficina pergunta isto a cada 4 s (edição ao vivo). As mesmas conferências
   * do `cenarioDe` (aberto, espaço, mundo do perfil), lendo só a revisão e as pilhas. */
  async historico(ator: Ator, id: string): Promise<ResumoDoHistorico> {
    await this.exigirAberto(ator)
    const resumo = await this.repo.resumoDoHistorico(id)
    if (!resumo) throw new CenarioNaoEncontradoError('O cenário')
    await this.mundoDe(ator, resumo.mundoId)
    return {
      revisao: resumo.revisao,
      desfazer: resumo.pilhas.passado.length,
      refazer: resumo.pilhas.futuro.length,
    }
  }

  async revisoes(ator: Ator, id: string, antes?: number) {
    const { cenario } = await this.cenarioDe(ator, id)
    const itens = await this.repo.revisoes(id, antes, 50)
    const inicio = (await this.repo.inicioDoHistorico(id)) ?? cenario.revisao
    const retratos = await this.repo.retratos(id, [...itens.map((r) => r.revisao), inicio])
    return {
      inicio,
      retratoInicial: retratos.get(inicio) ?? null,
      itens: itens.map((r) => ({
        revisao: r.revisao,
        criadoEm: r.criadoEm.toISOString(),
        miniatura: retratos.get(r.revisao) ?? null,
      })),
      proximo: itens.length === 50 ? itens.at(-1)!.revisao : null,
    }
  }

  async moverHistorico(
    ator: Ator,
    id: string,
    pedido: { acao: 'desfazer' | 'refazer'; revisaoEsperada: number; operacaoId: string },
  ): Promise<CenarioView> {
    const { cenario } = await this.cenarioDe(ator, id)
    if ((await this.repo.operacaoAplicada(id, pedido.operacaoId)) !== null)
      return this.abrirCenario(ator, id)
    if (cenario.revisao !== pedido.revisaoEsperada)
      throw new CenarioDesatualizadoError(cenario.revisao)
    const pilhas = await this.repo.pilhasDoHistorico(id)
    const alvo = (pedido.acao === 'desfazer' ? pilhas.passado : pilhas.futuro).at(-1)
    const passo = alvo === undefined ? null : await this.repo.passoDoHistorico(id, alvo)
    if (!passo?.inversos?.length || alvo === undefined)
      throw new CenarioInvalidoError(['Não há outro passo para esta ação'])
    await this.aplicarMudanca(
      ator,
      id,
      { ...pedido, comandos: pedido.acao === 'desfazer' ? passo.inversos : passo.comandos },
      { acao: pedido.acao, alvo },
    )
    return this.abrirCenario(ator, id)
  }

  async documentoNaRevisao(ator: Ator, id: string, revisao: number) {
    const { cenario } = await this.cenarioDe(ator, id)
    if (!Number.isInteger(revisao) || revisao < 0 || revisao > cenario.revisao)
      throw new CenarioInvalidoError(['Revisão fora do histórico deste cenário'])
    if (revisao === cenario.revisao) return cenario.documento
    const foto = await this.repo.fotografia(id, revisao)
    if (!foto) throw new CenarioInvalidoError(['Esta revisão é anterior ao histórico disponível'])
    let estado = foto
    for (const lote of await this.repo.lotesEntre(id, foto.revisao, revisao)) {
      if (lote.revisao !== estado.revisao + 1)
        throw new CenarioInvalidoError(['O histórico está incompleto'])
      estado = executarLote(estado, { revisaoEsperada: estado.revisao, comandos: lote.comandos })
    }
    if (estado.revisao !== revisao) throw new CenarioInvalidoError(['O histórico está incompleto'])
    return estado.documento
  }

  async restaurarRevisao(
    ator: Ator,
    id: string,
    pedido: { revisao: number; revisaoEsperada: number; operacaoId: string },
  ): Promise<CenarioView> {
    const { cenario } = await this.cenarioDe(ator, id)
    if ((await this.repo.operacaoAplicada(id, pedido.operacaoId)) !== null)
      return this.abrirCenario(ator, id)
    if (cenario.revisao !== pedido.revisaoEsperada)
      throw new CenarioDesatualizadoError(cenario.revisao)
    const documento = await this.documentoNaRevisao(ator, id, pedido.revisao)
    const comandos = inverterLote(documento, cenario.documento)
    // Voltar a uma versão do próprio histórico não é autoria: não passa pelas faixas.
    await this.aplicarMudanca(
      ator,
      id,
      {
        ...pedido,
        comandos: comandos.length ? comandos : [{ tipo: 'cenario.restaurar', documento }],
      },
      undefined,
      undefined,
      false,
    )
    return this.abrirCenario(ator, id)
  }

  /**
   * Aplica um lote de comandos. É a mesma porta para a edição pela mão e para os agentes:
   * tudo ou nada, só sobre a revisão que quem editava conhecia, e sem repetir a mesma operação.
   */
  async editarCenario(
    ator: Ator,
    id: string,
    lote: { revisaoEsperada: number; comandos: ComandoDeCenario[]; operacaoId: string },
    recursos?: { espacoId: string; conferidos: readonly ConferenciaDeBlob[] },
  ): Promise<{ revisao: number }> {
    return this.aplicarMudanca(ator, id, lote, undefined, recursos)
  }

  private async exigirFamilia(ator: Ator, id: FamiliaDaOficinaId): Promise<void> {
    const familia = familiaDaOficina(id)!
    if (!(await this.faixasDe(ator)).includes(familia.faixa))
      throw new CenarioFerramentaTrancadaError([familia])
  }

  /** As faixas de ferramentas de quem pede: todas para a equipe, só o básico sem a conferência. */
  async faixasDe(ator: Ator): Promise<readonly string[]> {
    if (ator.equipe && !ator.suporte) return FAIXAS_DA_OFICINA
    return (await this.abertura.faixas?.(ator)) ?? ['basic']
  }

  private async aplicarMudanca(
    ator: Ator,
    id: string,
    lote: { revisaoEsperada: number; comandos: ComandoDeCenario[]; operacaoId: string },
    movimento?: MovimentoDoHistorico,
    recursos?: { espacoId: string; conferidos: readonly ConferenciaDeBlob[] },
    /** Desfazer, refazer e voltar a uma versão repõem o que já foi aceito: não são autoria. */
    autoria = movimento === undefined,
  ): Promise<{ revisao: number }> {
    const { cenario, espaco } = await this.cenarioDe(ator, id)
    if (recursos && recursos.espacoId !== espaco.id) throw new CenarioNaoEncontradoError('O espaço')
    const feita = await this.repo.operacaoAplicada(id, lote.operacaoId)
    if (feita !== null) return { revisao: feita }
    if (lote.revisaoEsperada !== cenario.revisao)
      throw new CenarioDesatualizadoError(cenario.revisao)
    if (!lote.comandos.length || lote.comandos.length > LIMITES_CENARIO_V2.comandos)
      throw new CenarioInvalidoError([
        `O lote aceita de 1 a ${LIMITES_CENARIO_V2.comandos} comandos`,
      ])

    const formato = LoteDeCenarioSchema.safeParse({
      revisaoEsperada: lote.revisaoEsperada,
      comandos: lote.comandos,
    })
    if (!formato.success) throw new CenarioInvalidoError(['O lote tem um comando fora do formato'])
    const comandos = formato.data.comandos
    if (espacosDosComandos(comandos).some((origem) => origem !== espaco.id))
      throw new CenarioInvalidoError(['Não é possível colar objetos de outro espaço'])

    // Referências de acervo só podem usar arquivos confirmados com o papel correto NESTE espaço.
    // O relevo mantém sua prova específica de conteúdo, confirmada na transação pelo BFF.
    const referencias = arquivosDosComandos(comandos).filter((r) => r.tipo !== 'terreno')
    const papeis = new Set(referencias.map((r) => `${r.tipo}:${r.digest}`))
    const novos = new Set(referencias.map((r) => r.digest))
    const guardados = novos.size
      ? await this.repo.blobsConfirmados(espaco.id, [...novos])
      : new Map<string, { tipo: TipoDeBlob }>()

    let depois: ReturnType<typeof executarLote>
    try {
      depois = executarLote(
        { documento: cenario.documento, revisao: cenario.revisao },
        { revisaoEsperada: lote.revisaoEsperada, comandos },
        {
          modeloExiste: (m) =>
            !papeis.has(`modelo:${m.digest}`) || guardados.get(m.digest)?.tipo === 'modelo',
          texturaExiste: (t) =>
            !papeis.has(`textura:${t.digest}`) || guardados.get(t.digest)?.tipo === 'textura',
        },
      )
    } catch (erro) {
      if (erro instanceof ConflitoDeCenario) throw new CenarioDesatualizadoError(erro.revisaoAtual)
      if (erro instanceof CenarioInvalido) throw new CenarioInvalidoError(erro.problemas)
      if (erro instanceof Error && erro.name === 'ZodError')
        throw new CenarioInvalidoError(['O lote tem um comando fora do formato'])
      throw erro
    }
    // O interruptor das regiões: desligado, nenhum lote mexe no campo (nem o desfazer). Os leitores
    // (o Estúdio, o motor dos cenários e a imagem do studio-runtime) chegam antes do escritor.
    // ⚠️ Comparação estrutural: o jsonb volta do banco com as chaves em outra ordem que o lote
    // validado, e comparar texto acusava mudança em todo lote de um cenário com regiões.
    if (
      this.abertura.regioes !== true &&
      !igual(cenario.documento.regioes ?? null, depois.documento.regioes ?? null)
    )
      throw new CenarioRegioesDesligadasError()
    // A faixa do posto: o lote não cria nem muda uma ferramenta trancada (o agente também não).
    if (autoria && !(ator.equipe && !ator.suporte)) {
      const trancadas = familiasTrancadas(
        cenario.documento,
        depois.documento,
        await this.faixasDe(ator),
      )
      if (trancadas.length) throw new CenarioFerramentaTrancadaError(trancadas)
    }
    // O Arquipélago é da equipe: fora do espaço dela, nenhum lote cria ou muda um campo dele
    // (tirar um campo que já estava lá continua valendo).
    if (
      autoria &&
      espaco.tipo !== 'equipe' &&
      camposDoArquipelagoMudados(cenario.documento, depois.documento).length
    )
      throw new CenarioInvalidoError(['Os campos que começam com "arquipelago." são só da equipe'])
    const gravado = await this.repo.gravarLote(
      {
        cenarioId: id,
        revisaoEsperada: lote.revisaoEsperada,
        documento: depois.documento,
        comandos,
        operacaoId: lote.operacaoId,
        autorId: ator.usuarioId,
        movimento,
        recursosConferidos: recursos?.conferidos,
      },
      this.clock(),
    )
    if (!gravado) {
      const atual = await this.repo.cenario(id)
      throw new CenarioDesatualizadoError(atual?.revisao ?? cenario.revisao + 1)
    }
    return { revisao: gravado.revisao }
  }

  async duplicarCenario(ator: Ator, id: string): Promise<ResumoDeCenarioView> {
    const { cenario } = await this.cenarioDe(ator, id)
    if (await this.repo.conjuntoDoCenario(id))
      throw new CenarioInvalidoError(['Salve outra seleção como conjunto pela biblioteca'])
    const novo = this.novoId()
    const nome = `${cenario.nome} (cópia)`.slice(0, 120)
    const criado = await this.repo.criarCenario(
      {
        id: novo,
        mundoId: cenario.mundoId,
        nome,
        documento: { ...cenario.documento, id: novo, nome },
        criadoPor: ator.usuarioId,
      },
      LIMITES_DOS_CENARIOS.cenariosPorMundo,
      this.clock(),
    )
    if (!criado) throw new CenariosSemEspacoError('Este mundo já tem o máximo de cenários')
    return resumoView(criado)
  }

  async reservarRecursos(
    ator: Ator,
    id: string,
    recursos: readonly { digest: string; bytes: number }[],
  ) {
    const { espaco } = await this.cenarioDe(ator, id)
    if (
      !recursos.length ||
      recursos.length > LIMITES_DOS_CENARIOS.reservaPorChamada ||
      recursos.some(
        (r) => !/^[a-f0-9]{64}$/.test(r.digest) || !TAMANHOS_RECURSO_TERRENO.includes(r.bytes),
      )
    )
      throw new ValidationError('Envie de 1 a 50 peças de terreno válidas por reserva')
    return this.reservar(espaco.id, [
      ...new Map(
        recursos.map((r) => [
          r.digest,
          { ...r, tipo: 'terreno' as const, tipoDoConteudo: 'application/octet-stream' as const },
        ]),
      ).values(),
    ])
  }

  async apagarCenario(ator: Ator, id: string): Promise<{ apagar: string[] }> {
    const { espaco } = await this.cenarioDe(ator, id)
    if (await this.repo.conjuntoDoCenario(id))
      throw new CenarioInvalidoError([
        'Apague o conjunto pela biblioteca para remover seu rascunho',
      ])
    const digests = await this.repo.apagarCenario(id)
    return { apagar: digests.map((d) => chaveDoBlob(espaco.id, d)) }
  }

  /** Reserva o retrato do cenário (a capa do cartão). */
  async reservarCapa(
    ator: Ator,
    cenarioId: string,
    capa: {
      revisao: number
      digest: string
      bytes: number
      tipoDoConteudo?: 'image/png' | 'image/webp'
    },
  ): Promise<{ espacoId: string; enviar: ArquivoAEnviar[]; retrato: string | null }> {
    const { espaco, cenario } = await this.cenarioDe(ator, cenarioId)
    const inicio = await this.repo.inicioDoHistorico(cenarioId)
    if (
      !Number.isInteger(capa.revisao) ||
      capa.revisao < 0 ||
      capa.revisao > cenario.revisao ||
      capa.revisao < (inicio ?? cenario.revisao)
    )
      throw new CenarioInvalidoError(['Revisão fora do histórico deste cenário'])
    if (capa.bytes < 1 || capa.bytes > TETO_DO_BLOB.capa)
      throw new ValidationError('O retrato do cenário é grande demais')
    const existente = (await this.repo.retratos(cenarioId, [capa.revisao])).get(capa.revisao)
    if (existente) return { espacoId: espaco.id, enviar: [], retrato: existente }
    return {
      ...(await this.reservar(espaco.id, [
        {
          digest: capa.digest,
          bytes: capa.bytes,
          tipoDoConteudo: capa.tipoDoConteudo,
          tipo: 'capa',
        },
      ])),
      retrato: null,
    }
  }

  /** Chamado só pelo BFF, depois de conferir o arquivo no bucket. */
  async definirCapa(
    ator: Ator,
    cenarioId: string,
    revisao: number,
    digest: string,
    conferido: ConferenciaDeBlob | null,
    espacoConferido?: string,
  ) {
    const { espaco } = await this.cenarioDe(ator, cenarioId)
    const agora = this.clock()
    if (espacoConferido !== undefined && espacoConferido !== espaco.id)
      throw new CenarioArquivoAusenteError([digest])
    const guardado = await this.repo.definirCapa(
      {
        cenarioId,
        revisao,
        digest,
        autorId: ator.usuarioId,
        ...(conferido ? { recurso: { espacoId: espaco.id, conferido } } : {}),
      },
      agora,
    )
    if (!guardado) throw new CenarioNaoEncontradoError()
    return { ...guardado, apagar: guardado.apagar.map((d) => chaveDoBlob(espaco.id, d)) }
  }
}

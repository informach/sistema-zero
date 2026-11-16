import { randomUUID } from 'node:crypto'
import {
  CenarioInvalido,
  type ComandoDeCenario,
  ConflitoDeCenario,
  criarDocumentoVazio,
  executarLote,
  LIMITES_CENARIO_V2,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  type AberturaDosCenarios,
  type Ator,
  type Biblioteca,
  type Cenario,
  chaveDoBlob,
  type Espaco,
  LIMITES_DOS_CENARIOS,
  type Licenca,
  type Modelo,
  type Mundo,
  normalizarBusca,
  podeNoEspaco,
  podeUsarCenarios,
  type ResumoDeCenario,
  TETO_DO_BLOB,
  TIPO_DO_CONTEUDO,
  type TipoDeBlob,
} from '../../domain/cenarios/cenarios'
import {
  CenarioArquivoAusenteError,
  CenarioDesatualizadoError,
  CenarioInvalidoError,
  CenarioNaoEncontradoError,
  CenariosFechadosError,
  CenariosSemEspacoError,
} from '../../domain/cenarios/cenarios.errors'
import type { BlobReservado, CenariosRepository } from '../../domain/ports/cenarios-repository.port'
import { ValidationError } from '../../domain/shared/errors'

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
  miniatura?: { digest: string; bytes: number } | null
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
export class CenariosService {
  constructor(
    private readonly repo: CenariosRepository,
    private readonly clock: () => Date,
    private readonly abertura: AberturaDosCenarios,
    private readonly novoId: () => string = randomUUID,
  ) {}

  aberto(ator: Ator): boolean {
    return podeUsarCenarios(this.abertura, ator)
  }

  private exigirAberto(ator: Ator): void {
    if (!this.aberto(ator)) throw new CenariosFechadosError()
  }

  private async espacoDe(ator: Ator, espacoId: string, oque = 'O espaço'): Promise<Espaco> {
    this.exigirAberto(ator)
    const espaco = await this.repo.espaco(espacoId)
    if (!espaco || !podeNoEspaco(espaco, ator)) throw new CenarioNaoEncontradoError(oque)
    return espaco
  }
  private async bibliotecaDe(ator: Ator, id: string) {
    this.exigirAberto(ator)
    const biblioteca = await this.repo.biblioteca(id)
    if (!biblioteca) throw new CenarioNaoEncontradoError('A biblioteca')
    const espaco = await this.espacoDe(ator, biblioteca.espacoId, 'A biblioteca')
    return { biblioteca, espaco }
  }
  private async mundoDe(ator: Ator, id: string) {
    this.exigirAberto(ator)
    const mundo = await this.repo.mundo(id)
    if (!mundo) throw new CenarioNaoEncontradoError('O mundo')
    const espaco = await this.espacoDe(ator, mundo.espacoId, 'O mundo')
    return { mundo, espaco }
  }
  private async cenarioDe(ator: Ator, id: string) {
    this.exigirAberto(ator)
    const cenario = await this.repo.cenario(id)
    if (!cenario) throw new CenarioNaoEncontradoError('O cenário')
    const { mundo, espaco } = await this.mundoDe(ator, cenario.mundoId)
    return { cenario, mundo, espaco }
  }

  // ---- espaços ------------------------------------------------------------

  /** Os espaços de quem pede: o da conta e, para a equipe, o da equipe. Cria na primeira vez. */
  async espacos(ator: Ator): Promise<EspacoView[]> {
    this.exigirAberto(ator)
    const agora = this.clock()
    const lista = [
      await this.repo.espacoDaConta(ator.contaId, LIMITES_DOS_CENARIOS.bytesDaConta, agora),
    ]
    if (ator.equipe && !ator.suporte)
      lista.push(await this.repo.espacoDaEquipe(LIMITES_DOS_CENARIOS.bytesDaEquipe, agora))
    return lista.map(espacoView)
  }

  // ---- bibliotecas e modelos ---------------------------------------------

  async bibliotecas(ator: Ator, espacoId: string): Promise<BibliotecaView[]> {
    await this.espacoDe(ator, espacoId)
    return (await this.repo.bibliotecas(espacoId)).map(bibliotecaView)
  }

  async criarBiblioteca(
    ator: Ator,
    espacoId: string,
    dados: { nome: string; licenca: Licenca },
  ): Promise<BibliotecaView> {
    await this.espacoDe(ator, espacoId)
    const criada = await this.repo.criarBiblioteca(
      {
        id: this.novoId(),
        espacoId,
        nome: texto(dados.nome, 'O nome'),
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
    dados: { nome?: string; licenca?: Licenca },
  ): Promise<BibliotecaView> {
    await this.bibliotecaDe(ator, id)
    const editada = await this.repo.editarBiblioteca(
      id,
      {
        ...(dados.nome !== undefined ? { nome: texto(dados.nome, 'O nome') } : {}),
        ...(dados.licenca !== undefined ? { licenca: dados.licenca } : {}),
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

  async modelos(
    ator: Ator,
    bibliotecaId: string,
    filtro: { busca?: string; pasta?: string; cursor?: string; limite?: number },
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
    const por = (digest: string, bytes: number, tipo: TipoDeBlob) => {
      if (bytes < 1 || bytes > TETO_DO_BLOB[tipo])
        throw new ValidationError(
          tipo === 'modelo' ? 'O modelo passa de 64 MB' : 'O retrato do modelo é grande demais',
        )
      blobs.set(digest, { digest, bytes, tipo })
    }
    for (const m of modelos) {
      por(m.digest, m.bytes, 'modelo')
      if (m.miniatura) por(m.miniatura.digest, m.miniatura.bytes, 'miniatura')
    }
    return this.reservar(espaco.id, [...blobs.values()])
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
        tipoDoConteudo: TIPO_DO_CONTEUDO[b.tipo],
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
    conferidos: readonly string[],
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
          m.miniatura && confirmados.get(m.miniatura)?.tipo === 'miniatura' ? m.miniatura : null,
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
    this.exigirAberto(ator)
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
      tipoDoConteudo: TIPO_DO_CONTEUDO[blob.tipo],
      bytes: blob.bytes,
    }
  }

  // ---- mundos -------------------------------------------------------------

  async mundos(ator: Ator, espacoId: string): Promise<MundoView[]> {
    await this.espacoDe(ator, espacoId)
    return (await this.repo.mundos(espacoId)).map(mundoView)
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

  async apagarMundo(ator: Ator, id: string): Promise<void> {
    await this.mundoDe(ator, id)
    await this.repo.apagarMundo(id)
  }

  // ---- cenários -----------------------------------------------------------

  async cenarios(ator: Ator, mundoId: string): Promise<ResumoDeCenarioView[]> {
    await this.mundoDe(ator, mundoId)
    return (await this.repo.cenarios(mundoId)).map(resumoView)
  }

  async criarCenario(ator: Ator, mundoId: string, nome: string): Promise<ResumoDeCenarioView> {
    await this.mundoDe(ator, mundoId)
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
    return { ...resumoView(cenario), espacoId: espaco.id, documento: cenario.documento }
  }

  /**
   * Aplica um lote de comandos. É a mesma porta para a edição pela mão e para os agentes:
   * tudo ou nada, só sobre a revisão que quem editava conhecia, e sem repetir a mesma operação.
   */
  async editarCenario(
    ator: Ator,
    id: string,
    lote: { revisaoEsperada: number; comandos: ComandoDeCenario[]; operacaoId: string },
  ): Promise<{ revisao: number }> {
    const { cenario, espaco } = await this.cenarioDe(ator, id)
    const feita = await this.repo.operacaoAplicada(id, lote.operacaoId)
    if (feita !== null) return { revisao: feita }
    if (lote.revisaoEsperada !== cenario.revisao)
      throw new CenarioDesatualizadoError(cenario.revisao)
    if (!lote.comandos.length || lote.comandos.length > LIMITES_CENARIO_V2.comandos)
      throw new CenarioInvalidoError([
        `O lote aceita de 1 a ${LIMITES_CENARIO_V2.comandos} comandos`,
      ])

    // Modelo novo na tabela do cenário precisa ser um arquivo guardado NESTE espaço.
    const novos = new Set<string>()
    for (const c of lote.comandos) if (c.tipo === 'modelo.definir') novos.add(c.modelo.digest)
    const guardados = novos.size
      ? await this.repo.blobsConfirmados(espaco.id, [...novos])
      : new Map<string, { tipo: TipoDeBlob }>()

    let depois: ReturnType<typeof executarLote>
    try {
      depois = executarLote(
        { documento: cenario.documento, revisao: cenario.revisao },
        { revisaoEsperada: lote.revisaoEsperada, comandos: lote.comandos },
        { modeloExiste: (m) => !novos.has(m.digest) || guardados.get(m.digest)?.tipo === 'modelo' },
      )
    } catch (erro) {
      if (erro instanceof ConflitoDeCenario) throw new CenarioDesatualizadoError(erro.revisaoAtual)
      if (erro instanceof CenarioInvalido) throw new CenarioInvalidoError(erro.problemas)
      if (erro instanceof Error && erro.name === 'ZodError')
        throw new CenarioInvalidoError(['O lote tem um comando fora do formato'])
      throw erro
    }
    const gravado = await this.repo.gravarLote(
      {
        cenarioId: id,
        revisaoEsperada: lote.revisaoEsperada,
        documento: depois.documento,
        comandos: lote.comandos,
        operacaoId: lote.operacaoId,
        autorId: ator.usuarioId,
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

  async apagarCenario(ator: Ator, id: string): Promise<void> {
    await this.cenarioDe(ator, id)
    await this.repo.apagarCenario(id)
  }

  /** Reserva o retrato do cenário (a capa do cartão). */
  async reservarCapa(
    ator: Ator,
    cenarioId: string,
    capa: { digest: string; bytes: number },
  ): Promise<{ espacoId: string; enviar: ArquivoAEnviar[] }> {
    const { espaco } = await this.cenarioDe(ator, cenarioId)
    if (capa.bytes < 1 || capa.bytes > TETO_DO_BLOB.capa)
      throw new ValidationError('O retrato do cenário é grande demais')
    return this.reservar(espaco.id, [{ ...capa, tipo: 'capa' }])
  }

  /** Chamado só pelo BFF, depois de conferir o arquivo no bucket. */
  async definirCapa(
    ator: Ator,
    cenarioId: string,
    digest: string,
    conferido: boolean,
    espacoConferido?: string,
  ) {
    const { espaco } = await this.cenarioDe(ator, cenarioId)
    const agora = this.clock()
    if (espacoConferido !== undefined && espacoConferido !== espaco.id) conferido = false
    if (conferido) await this.repo.confirmarBlobs(espaco.id, [digest], agora)
    const guardado = (await this.repo.blobsConfirmados(espaco.id, [digest])).get(digest)
    if (guardado?.tipo !== 'capa') throw new CenarioArquivoAusenteError([digest])
    await this.repo.definirCapa(cenarioId, digest, agora)
  }
}
